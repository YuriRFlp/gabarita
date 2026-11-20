-- exam_weights and settings.target_notice_published (SPEC-005, CA-11 to CA-13 and CA-15; ADR-011).
begin;

create extension if not exists pgtap with schema extensions;

select plan(50);

-- CA-11: structure
select has_table('public', 'exam_weights', 'exam_weights exists');
select col_type_is('public', 'exam_weights', 'user_id', 'uuid', 'exam_weights.user_id is uuid');
select col_not_null('public', 'exam_weights', 'user_id', 'exam_weights.user_id is not null');
select col_default_is('public', 'exam_weights', 'user_id', 'auth.uid()',
                      'exam_weights.user_id defaults to auth.uid()');
select col_type_is('public', 'exam_weights', 'exam_id', 'text', 'exam_weights.exam_id is text');
select col_not_null('public', 'exam_weights', 'exam_id', 'exam_weights.exam_id is not null');
select fk_ok('public', 'exam_weights', 'exam_id', 'public', 'exams', 'id',
             'exam_weights.exam_id references exams(id)');
select is((select confdeltype from pg_constraint
           where conrelid = 'public.exam_weights'::regclass and contype = 'f'),
          'c'::"char", 'the foreign key to exams is on delete cascade');
select col_type_is('public', 'exam_weights', 'weight', 'numeric(4,3)', 'exam_weights.weight is numeric(4,3)');
select col_not_null('public', 'exam_weights', 'weight', 'exam_weights.weight is not null');
select col_type_is('public', 'exam_weights', 'updated_at', 'timestamp with time zone',
                   'exam_weights.updated_at is timestamptz');
select col_not_null('public', 'exam_weights', 'updated_at', 'exam_weights.updated_at is not null');
select col_is_pk('public', 'exam_weights', array['user_id', 'exam_id'],
                 'the primary key is (user_id, exam_id)');
select has_trigger('public', 'exam_weights', 'trg_exam_weights_updated',
                   'exam_weights has the updated_at trigger');
select ok((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'exam_weights'),
          'RLS enabled on exam_weights');
select policies_are('public', 'exam_weights', array['owner_exam_weights'],
                    'exam_weights has only the owner_exam_weights policy');
select policy_roles_are('public', 'exam_weights', 'owner_exam_weights', array['authenticated'],
                        'owner_exam_weights applies to authenticated only');
select isnt(obj_description('public.exam_weights'::regclass, 'pg_class'), null,
            'exam_weights has a table comment');

-- Range and trigger, as the table owner. A = ...0a, B = ...0b.
select throws_ok($$ insert into exam_weights (user_id, exam_id, weight)
                    values ('00000000-0000-0000-0000-00000000000b', 'trt2', 1.001) $$,
                 '23514', null, 'a weight above 1 fails the check');
select throws_ok($$ insert into exam_weights (user_id, exam_id, weight)
                    values ('00000000-0000-0000-0000-00000000000b', 'trt2', -0.001) $$,
                 '23514', null, 'a negative weight fails the check');

insert into exam_weights (user_id, exam_id, weight, updated_at) values
  ('00000000-0000-0000-0000-00000000000b', 'trt2', 1, '2000-01-01'),
  ('00000000-0000-0000-0000-00000000000b', 'trt3', 0, '2000-01-01');

update exam_weights set weight = 0.6
where user_id = '00000000-0000-0000-0000-00000000000b' and exam_id = 'trt2';
select is((select updated_at from exam_weights
           where user_id = '00000000-0000-0000-0000-00000000000b' and exam_id = 'trt2'),
          now(), 'updating a weight refreshes updated_at');

insert into exams (id, court, year, exam_board_id, position, duration_min, objective)
values ('exam_cascade', 'TRT-CASCADE', 2026, 'fcc', 'Analista', 240, '{}');
insert into exam_weights (user_id, exam_id, weight)
values ('00000000-0000-0000-0000-00000000000b', 'exam_cascade', 0.1);
delete from exams where id = 'exam_cascade';
select is_empty($$ select 1 from exam_weights where exam_id = 'exam_cascade' $$,
                'deleting an exam deletes its weights');

-- CA-13 baseline, before any settings row is written by this test.
select is((select count(*) from settings where target_notice_published), 0::bigint,
          'existing settings rows have target_notice_published = false');

-- CA-12: RLS. B already has 2 rows; A writes the S1 set of SPEC-005 through RLS.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok($$ insert into exam_weights (exam_id, weight) values
                     ('trt2', 0.400), ('trt3', 0.177), ('trf6', 0.114), ('tjmg', 0.088),
                     ('trf2', 0.032), ('trt1', 0.032), ('trt15', 0.032),
                     ('trf4', 0.025), ('trt4', 0.025), ('trt12', 0.025),
                     ('tjrj', 0.016), ('tjsp', 0.016), ('tjrs', 0.009), ('tjsc', 0.009) $$,
                'A inserts the S1 set in one statement without providing user_id');
select is((select count(*) from exam_weights), 14::bigint, 'A sees exactly its 14 rows');
select is((select count(*) from exam_weights where user_id = '00000000-0000-0000-0000-00000000000a'),
          14::bigint, 'the rows A inserted belong to A');
select is((select sum(weight) from exam_weights), 1.000::numeric, 'the S1 set of A sums to 1');
select is_empty($$ select 1 from exam_weights where user_id <> '00000000-0000-0000-0000-00000000000a' $$,
                'A cannot read B rows');
select throws_ok($$ insert into exam_weights (user_id, exam_id, weight)
                    values ('00000000-0000-0000-0000-00000000000b', 'trf6', 0.5) $$,
                 '42501', null, 'A cannot insert a row with B user_id');
select isnt_empty($$ update exam_weights set weight = weight where exam_id = 'trt2' returning 1 $$,
                  'A updates own row');
select is_empty($$ update exam_weights set weight = 0
                   where user_id = '00000000-0000-0000-0000-00000000000b' returning 1 $$,
                'A cannot update B rows');
select is_empty($$ delete from exam_weights
                   where user_id = '00000000-0000-0000-0000-00000000000b' returning 1 $$,
                'A cannot delete B rows');
select throws_ok($$ update exam_weights set user_id = '00000000-0000-0000-0000-00000000000b'
                    where exam_id = 'tjsc' $$,
                 '42501', null, 'A cannot transfer own rows to B');

-- CA-15: the view keeps the seed defaults even with A's custom weights.
select is((select priority from v_topic_priority where topic_id = 'pdpj_stack'), 1.000::numeric,
          'v_topic_priority for A keeps pdpj_stack at 1.000 (seed defaults)');
select is((select priority from v_topic_priority where topic_id = 'legislacao_mg'), 0.140::numeric,
          'v_topic_priority for A keeps legislacao_mg at 0.140 (seed defaults)');

-- anon reads and writes nothing
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is_empty($$ select 1 from exam_weights $$, 'anon cannot read exam_weights');
select throws_ok($$ insert into exam_weights (user_id, exam_id, weight)
                    values ('00000000-0000-0000-0000-00000000000a', 'trt2', 0.5) $$,
                 '42501', null, 'anon cannot insert into exam_weights');

reset role;

select is((select count(*) from exam_weights where user_id = '00000000-0000-0000-0000-00000000000b'),
          2::bigint, 'B rows are intact after A and anon');

-- CA-15: re-running the seed upsert of exams rewrites target_weight but not the user's weights.
create temp table weights_before as
  select user_id, exam_id, weight, updated_at from exam_weights;

insert into exams (id, court, year, exam_board_id, position, duration_min, objective, essay, rubric_id,
                   target_weight)
select id, court, year, exam_board_id, position, duration_min, objective, essay, rubric_id, 0
from exams
on conflict (id) do update set target_weight = excluded.target_weight;

select is((select sum(target_weight) from exams), 0::numeric,
          'the seed upsert rewrote exams.target_weight');
select set_eq($$ select user_id, exam_id, weight, updated_at from exam_weights $$,
              $$ select user_id, exam_id, weight, updated_at from weights_before $$,
              'the seed upsert leaves exam_weights unchanged');

-- CA-13: settings.target_notice_published
select col_type_is('public', 'settings', 'target_notice_published', 'boolean',
                   'settings.target_notice_published is boolean');
select col_not_null('public', 'settings', 'target_notice_published',
                    'settings.target_notice_published is not null');
select col_default_is('public', 'settings', 'target_notice_published', 'false',
                      'settings.target_notice_published defaults to false');
select isnt(col_description('public.settings'::regclass,
                            (select attnum from pg_attribute
                             where attrelid = 'public.settings'::regclass
                               and attname = 'target_notice_published')),
            null, 'settings.target_notice_published has a column comment');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

insert into settings default values;
select is((select target_notice_published from settings), false,
          'a new settings row gets target_notice_published = false');
select throws_ok($$ update settings set target_notice_published = true $$, '23514', null,
                 'marking the notice as published without a target exam fails');
select lives_ok($$ update settings set target_exam_id = 'trt2', target_notice_published = true $$,
                'marking the notice as published with target exam trt2 passes');
select throws_ok($$ update settings set target_exam_id = null $$, '23514', null,
                 'clearing the target exam while the notice is marked as published fails');

-- ADR-011: restoring defaults deletes only A rows.
select isnt_empty($$ delete from exam_weights returning 1 $$, 'A deletes own rows (restore defaults)');

reset role;

select is((select count(*) from exam_weights where user_id = '00000000-0000-0000-0000-00000000000b'),
          2::bigint, 'restoring defaults for A keeps B rows');

select * from finish();
rollback;
