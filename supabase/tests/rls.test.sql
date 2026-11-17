-- RLS on the 21 tables and security_invoker on the views (SPEC-001, CA-6; ADR-005).
begin;

create extension if not exists pgtap with schema extensions;

select plan(238);

-- Reference lists. A new table in public that is not listed here makes
-- the first test fail, forcing RLS coverage for it.
create temp table personal_tables (name text primary key);
insert into personal_tables values
  ('materials'), ('settings'), ('study_sessions'), ('schedule_items'), ('mock_exams'),
  ('answers'), ('cards'), ('essays'), ('ai_requests');

create temp table child_tables (name text primary key);
insert into child_tables values ('review_logs'), ('mock_exam_questions');

create temp table reference_tables (name text primary key);
insert into reference_tables values
  ('exam_boards'), ('rubrics'), ('exams'), ('topics'), ('subtopics'), ('incidences'),
  ('papers'), ('questions'), ('question_topics'), ('essay_prompts');

create temp view all_tables as
  select name from personal_tables
  union all select name from child_tables
  union all select name from reference_tables;

grant select on personal_tables, child_tables, reference_tables, all_tables
  to anon, authenticated;

-- Structure: RLS enabled and policies
select set_eq(
  $$ select tablename::text from pg_tables where schemaname = 'public' $$,
  $$ select name from all_tables $$,
  'the 21 tables in public are exactly the ones covered by this test'
);

select is(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = t.name),
  true,
  format('RLS enabled on %s', t.name)
)
from all_tables t order by t.name;

select set_eq(
  $$ select tablename::text || '.' || policyname::text from pg_policies where schemaname = 'public' $$,
  $$ select name || '.owner_' || name from personal_tables
     union all select name || '.owner_' || name from child_tables
     union all select name || '.authenticated_' || name from reference_tables $$,
  'each table has exactly the expected owner_* or authenticated_* policy'
);

select is_empty(
  $$ select policyname from pg_policies
     where schemaname = 'public' and roles <> array['authenticated']::name[] $$,
  'no policy applies to anon, public or any role other than authenticated'
);

-- Controlled data (as table owner, bypassing RLS)
--   A = ...0a, B = ...0b
insert into subtopics (id, topic_id, name)
values ('00000000-0000-0000-0001-000000000001', 'pdpj_stack', 'Subtópico de teste RLS');

insert into papers (id, exam_board_id, agency, year, position)
values ('00000000-0000-0000-0002-000000000001', 'cebraspe', 'TRT-RLS', 2026, 'Analista');

insert into questions (id, paper_id, exam_board_id, format, statement, answer_key, source) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001',
   'cebraspe', 'true_false', 'Questão 1 de teste', 'C', 'user'),
  ('00000000-0000-0000-0003-000000000002', null,
   'cebraspe', 'true_false', 'Questão 2 de teste', 'E', 'user');

insert into question_topics (question_id, topic_id)
values ('00000000-0000-0000-0003-000000000001', 'pdpj_stack');

insert into essay_prompts (id, type, title, statement, source)
values ('00000000-0000-0000-0004-000000000001', 'technical_question', 'Tema teste', 'Enunciado', 'user');

-- Valid personal-row inserts, parameterized by user_id.
create temp table inserts (table_name text primary key, command text not null);
insert into inserts values
  ('materials', $$insert into materials (user_id, subtopic_id, type, title, content_md, source)
     values (%L, '00000000-0000-0000-0001-000000000001', 'note', 'Nota', '# nota', 'user')$$),
  ('settings', $$insert into settings (user_id) values (%L)
     on conflict (user_id) do update set ai_mode = excluded.ai_mode$$),
  ('study_sessions', $$insert into study_sessions (user_id, type) values (%L, 'cycle')$$),
  ('schedule_items', $$insert into schedule_items (user_id, date, type, minutes)
     values (%L, current_date, 'cycle', 50)$$),
  ('mock_exams', $$insert into mock_exams (user_id, exam_id, time_limit_min) values (%L, 'trt3', 240)$$),
  ('answers', $$insert into answers (user_id, question_id, answer, correct, confidence)
     values (%L, '00000000-0000-0000-0003-000000000001', 'C', true, 'certain')$$),
  ('cards', $$insert into cards (user_id, type, front, back, source)
     values (%L, 'concept', 'frente', 'verso', 'user')$$),
  ('essays', $$insert into essays (user_id, prompt_id, rubric_id, text, lines)
     values (%L, '00000000-0000-0000-0004-000000000001', 'fumarc_redacao', 'texto', 10)$$),
  ('ai_requests', $$insert into ai_requests (user_id, type, mode, prompt)
     values (%L, 'summary', 'manual', 'prompt')$$);
grant select on inserts to anon, authenticated;

do $$
declare r record;
begin
  for r in select * from inserts loop
    execute format(r.command, '00000000-0000-0000-0000-00000000000a');
    execute format(r.command, '00000000-0000-0000-0000-00000000000b');
  end loop;
end $$;

-- Parents with fixed ids for the child tables.
insert into mock_exams (id, user_id, exam_id, time_limit_min) values
  ('00000000-0000-0000-0005-00000000000a', '00000000-0000-0000-0000-00000000000a', 'trt3', 240),
  ('00000000-0000-0000-0005-00000000000b', '00000000-0000-0000-0000-00000000000b', 'trt3', 240);

insert into cards (id, user_id, type, front, back, source) values
  ('00000000-0000-0000-0006-00000000000a', '00000000-0000-0000-0000-00000000000a',
   'concept', 'f', 'v', 'user'),
  ('00000000-0000-0000-0006-00000000000b', '00000000-0000-0000-0000-00000000000b',
   'concept', 'f', 'v', 'user');

insert into mock_exam_questions (mock_exam_id, question_id, sort_order, subject) values
  ('00000000-0000-0000-0005-00000000000a', '00000000-0000-0000-0003-000000000001', 1, 'specific'),
  ('00000000-0000-0000-0005-00000000000b', '00000000-0000-0000-0003-000000000001', 1, 'specific');

insert into review_logs (card_id, rating, state, due, stability, difficulty,
                         elapsed_days, last_elapsed_days, scheduled_days) values
  ('00000000-0000-0000-0006-00000000000a', 3, 2, now() + interval '1 day', 1, 5, 0, 0, 1),
  ('00000000-0000-0000-0006-00000000000b', 3, 2, now() + interval '1 day', 1, 5, 0, 0, 1);

-- Without rows, "anon sees 0 rows" would prove nothing.
select isnt_empty(format('select 1 from %I', t.name), format('%s has data for the test', t.name))
from all_tables t order by t.name;

-- anon: reads and writes nothing
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is_empty(format('select 1 from %I', t.name), format('anon cannot read %s', t.name))
from all_tables t order by t.name;

select throws_ok(format('insert into %I default values', t.name), '42501', null,
                 format('anon cannot insert into %s', t.name))
from all_tables t order by t.name;

select is_empty(format('update %I set %I = %I returning 1', t.name, c.column_name, c.column_name),
                format('anon cannot update %s', t.name))
from all_tables t
cross join lateral (
  select a.attname::text as column_name from pg_attribute a
  where a.attrelid = format('public.%I', t.name)::regclass and a.attnum = 1
) c
order by t.name;

select is_empty(format('delete from %I returning 1', t.name), format('anon cannot delete from %s', t.name))
from all_tables t order by t.name;

reset role;

-- User A on personal tables
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select isnt_empty(
  format('select 1 from %I where user_id = %L', t.name, '00000000-0000-0000-0000-00000000000a'),
  format('A reads own rows in %s', t.name))
from personal_tables t order by t.name;

select is_empty(
  format('select 1 from %I where user_id <> %L', t.name, '00000000-0000-0000-0000-00000000000a'),
  format('A cannot read B rows in %s', t.name))
from personal_tables t order by t.name;

select is_empty(
  format('update %I set user_id = user_id where user_id = %L returning 1',
         t.name, '00000000-0000-0000-0000-00000000000b'),
  format('A cannot update B rows in %s', t.name))
from personal_tables t order by t.name;

select is_empty(
  format('delete from %I where user_id = %L returning 1',
         t.name, '00000000-0000-0000-0000-00000000000b'),
  format('A cannot delete B rows in %s', t.name))
from personal_tables t order by t.name;

select throws_ok(format(i.command, '00000000-0000-0000-0000-00000000000b'), '42501', null,
                 format('A cannot insert into %s with B user_id', i.table_name))
from inserts i order by i.table_name;

-- Control: the same insert with A's own user_id succeeds, so the failure above comes from RLS.
select lives_ok(format(i.command, '00000000-0000-0000-0000-00000000000a'),
                format('A inserts into %s with own user_id', i.table_name))
from inserts i order by i.table_name;

select throws_ok(
  format('update %I set user_id = %L where user_id = %L', t.name,
         '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a'),
  '42501', null,
  format('A cannot transfer own rows in %s to B', t.name))
from personal_tables t order by t.name;

-- User A on child tables (access derives from the parent)
select isnt_empty($$ select 1 from review_logs where card_id = '00000000-0000-0000-0006-00000000000a' $$,
                  'A reads review logs of own cards');
select is_empty($$ select 1 from review_logs where card_id <> all (
                     select id from cards where user_id = '00000000-0000-0000-0000-00000000000a') $$,
                'A cannot read review logs of B cards');
select is_empty($$ update review_logs set rating = 1
                   where card_id = '00000000-0000-0000-0006-00000000000b' returning 1 $$,
                'A cannot update review logs of B cards');
select is_empty($$ delete from review_logs
                   where card_id = '00000000-0000-0000-0006-00000000000b' returning 1 $$,
                'A cannot delete review logs of B cards');
select throws_ok($$ insert into review_logs (card_id, rating, state, due, stability, difficulty,
                                            elapsed_days, last_elapsed_days, scheduled_days)
                    values ('00000000-0000-0000-0006-00000000000b', 3, 2, now(), 1, 5, 0, 0, 1) $$,
                 '42501', null, 'A cannot insert a review log on a B card');
select lives_ok($$ insert into review_logs (card_id, rating, state, due, stability, difficulty,
                                           elapsed_days, last_elapsed_days, scheduled_days)
                   values ('00000000-0000-0000-0006-00000000000a', 3, 2, now(), 1, 5, 0, 0, 1) $$,
                'A inserts a review log on own card');

select isnt_empty($$ select 1 from mock_exam_questions
                     where mock_exam_id = '00000000-0000-0000-0005-00000000000a' $$,
                  'A reads questions of own mock exams');
select is_empty($$ select 1 from mock_exam_questions where mock_exam_id <> all (
                     select id from mock_exams where user_id = '00000000-0000-0000-0000-00000000000a') $$,
                'A cannot read questions of B mock exams');
select is_empty($$ update mock_exam_questions set sort_order = 2
                   where mock_exam_id = '00000000-0000-0000-0005-00000000000b' returning 1 $$,
                'A cannot update questions of B mock exams');
select is_empty($$ delete from mock_exam_questions
                   where mock_exam_id = '00000000-0000-0000-0005-00000000000b' returning 1 $$,
                'A cannot delete questions of B mock exams');
select throws_ok($$ insert into mock_exam_questions (mock_exam_id, question_id, sort_order, subject)
                    values ('00000000-0000-0000-0005-00000000000b',
                            '00000000-0000-0000-0003-000000000002', 2, 'specific') $$,
                 '42501', null, 'A cannot insert a question into a B mock exam');
select lives_ok($$ insert into mock_exam_questions (mock_exam_id, question_id, sort_order, subject)
                   values ('00000000-0000-0000-0005-00000000000a',
                           '00000000-0000-0000-0003-000000000002', 2, 'specific') $$,
                'A inserts a question into own mock exam');

-- Authenticated user reads and writes reference tables
select isnt_empty(format('select 1 from %I', t.name), format('authenticated reads %s', t.name))
from reference_tables t order by t.name;

select lives_ok($$ insert into exam_boards (id, name, default_format, wrong_answer_penalty)
                   values ('board_rls', 'Banca RLS', 'true_false', 1) $$,
                'authenticated inserts into exam_boards');
select lives_ok($$ insert into rubrics (id, exam_board_id, type, definition)
                   values ('rubric_rls', 'board_rls', 'technical_question', '{}') $$,
                'authenticated inserts into rubrics');
select lives_ok($$ insert into exams (id, court, year, exam_board_id, position, duration_min, objective)
                   values ('exam_rls', 'TRT-RLS', 2026, 'board_rls', 'Analista', 240, '{}') $$,
                'authenticated inserts into exams');
select lives_ok($$ insert into topics (id, category, name) values ('topic_rls', 'general', 'Assunto RLS') $$,
                'authenticated inserts into topics');
select lives_ok($$ insert into subtopics (topic_id, name) values ('topic_rls', 'Subtópico RLS') $$,
                'authenticated inserts into subtopics');
select lives_ok($$ insert into incidences (exam_id, topic_id, value)
                   values ('exam_rls', 'topic_rls', 1) $$,
                'authenticated inserts into incidences');
select lives_ok($$ insert into papers (exam_board_id, agency, year, position)
                   values ('board_rls', 'TRT-RLS', 2025, 'Analista') $$,
                'authenticated inserts into papers');
select lives_ok($$ insert into questions (id, exam_board_id, format, statement, answer_key, source)
                   values ('00000000-0000-0000-0003-000000000009', 'board_rls', 'true_false',
                           'Questão RLS', 'C', 'user') $$,
                'authenticated inserts into questions');
select lives_ok($$ insert into question_topics (question_id, topic_id)
                   values ('00000000-0000-0000-0003-000000000009', 'topic_rls') $$,
                'authenticated inserts into question_topics');
select lives_ok($$ insert into essay_prompts (type, title, statement, source)
                   values ('technical_question', 'Tema RLS', 'Enunciado', 'user') $$,
                'authenticated inserts into essay_prompts');

select isnt_empty(format('update %I set %I = %I returning 1', t.name, c.column_name, c.column_name),
                  format('authenticated updates %s', t.name))
from reference_tables t
cross join lateral (
  select a.attname::text as column_name from pg_attribute a
  where a.attrelid = format('public.%I', t.name)::regclass and a.attnum = 1
) c
order by t.name;

-- Views
reset role;

select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class
   where oid = format('public.%I', v)::regclass),
  format('%s has security_invoker = true', v))
from unnest(array['v_topic_performance', 'v_topic_priority']) v;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select results_eq(
  $$ select user_id, topic_id, answered from v_topic_performance $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid, 'pdpj_stack'::text, 2::bigint) $$,
  'v_topic_performance shows A only the answers of A'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select results_eq(
  $$ select user_id, topic_id, answered from v_topic_performance $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid, 'pdpj_stack'::text, 1::bigint) $$,
  'v_topic_performance shows B only the answers of B'
);

reset role;

select * from finish();
rollback;
