-- v_topic_priority and v_topic_performance (SPEC-004, CA-13 and CA-14).
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- CA-13: priority from the seed (runs as the owner role; the view reads reference tables only).
select is((select count(*) from v_topic_priority), 38::bigint, 'v_topic_priority has one row per topic');
select ok((select bool_and(priority between 0 and 1) from v_topic_priority),
          'every priority is between 0 and 1');
select is((select priority from v_topic_priority where topic_id = 'pdpj_stack'), 1.000::numeric,
          'pdpj_stack priority is 1.000');
select is((select priority from v_topic_priority where topic_id = 'seg_aplicacoes'), 0.833::numeric,
          'seg_aplicacoes priority is 0.833');
select is((select priority from v_topic_priority where topic_id = 'legislacao_mg'), 0.140::numeric,
          'legislacao_mg priority is 0.140');
select is((select priority from v_topic_priority where topic_id = 'arquitetura_computadores'), 0.065::numeric,
          'arquitetura_computadores priority is 0.065');

update exams set active = false where id = 'trt3';
select is((select priority from v_topic_priority where topic_id = 'pdpj_stack'), 0.720::numeric,
          'deactivating trt3 drops pdpj_stack to 0.720');

insert into topics (id, category, name, profile, phase, sort_order)
values ('topic_without_incidence', 'general', 'Assunto sem incidência', null, 'pre_notice', 99);
select is((select priority from v_topic_priority where topic_id = 'topic_without_incidence'), 0::numeric,
          'a topic without incidences has priority 0');

-- CA-14: performance. A = ...0a, B = ...0b.
insert into questions (id, exam_board_id, format, statement, answer_key, source)
values ('00000000-0000-0000-0003-0000000000f1', 'cebraspe', 'true_false', 'Questão de desempenho', 'C', 'user');
insert into question_topics (question_id, topic_id) values
  ('00000000-0000-0000-0003-0000000000f1', 'pdpj_stack'),
  ('00000000-0000-0000-0003-0000000000f1', 'redes');

insert into answers (user_id, question_id, answer, correct, confidence, answered_at) values
  -- inside the window: exactly 60 days counts
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0003-0000000000f1', 'C', true,  'certain', now() - interval '60 days'),
  -- outside the window
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0003-0000000000f1', 'C', true,  'certain', now() - interval '60 days 1 second'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0003-0000000000f1', 'C', true,  'certain', now() - interval '61 days'),
  -- recent: guess, doubt, certain hit, certain miss, blank
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0003-0000000000f1', 'C', true,  'guess',   now()),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0003-0000000000f1', 'C', true,  'doubt',   now()),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0003-0000000000f1', 'C', true,  'certain', now()),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0003-0000000000f1', 'E', false, 'certain', now()),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0003-0000000000f1', null, null, null,      now()),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0003-0000000000f1', 'C', true,  'certain', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- Counted: day 60, guess, doubt, certain hit, certain miss, blank = 6 answered; firm = day 60, doubt, certain hit = 3.
select is((select answered from v_topic_performance where topic_id = 'pdpj_stack'), 6::bigint,
          'answered counts day 60, guess, doubt, certain hit, certain miss and blank, not day 60 plus 1 second nor day 61');
select is((select firm_correct from v_topic_performance where topic_id = 'pdpj_stack'), 3::bigint,
          'firm_correct counts day 60, doubt and certain hits only');
select is((select mastery_rate from v_topic_performance where topic_id = 'pdpj_stack'), 0.500::numeric,
          'mastery_rate is firm_correct over answered');
select results_eq(
  $$ select answered, firm_correct from v_topic_performance where topic_id = 'redes' $$,
  $$ values (6::bigint, 3::bigint) $$,
  'the same answers appear under the second topic of the question');
select is((select count(*) from v_topic_performance), 2::bigint,
          'A sees only the two topics of the question');
select is((select count(*) from v_topic_performance where user_id <> auth.uid()), 0::bigint,
          'A does not see B rows in the view');

reset role;
select is((select answered from v_topic_performance
           where topic_id = 'pdpj_stack' and user_id = '00000000-0000-0000-0000-00000000000b'), 1::bigint,
          'B has its own single answer in the view');

set local request.jwt.claims = '';
set local role anon;
select is_empty($$ select * from v_topic_performance $$,
                'anon reads no row of v_topic_performance');
reset role;
select is((select count(*) from v_topic_performance where topic_id = 'legislacao_mg'), 0::bigint,
          'a topic without answers has no performance row');

select * from finish();
rollback;
