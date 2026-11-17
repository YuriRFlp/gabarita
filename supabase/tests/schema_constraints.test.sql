-- Enum labels, defaults, check constraints and seed shape of the English schema (ADR-007).
begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

-- Enum labels follow docs/08-glossario.md
select enum_has_labels('public', 'topic_category', array['specific', 'general'], 'topic_category labels');
select enum_has_labels('public', 'topic_profile', array['systems', 'infra', 'common'], 'topic_profile labels');
select enum_has_labels('public', 'study_phase', array['pre_notice', 'post_notice'], 'study_phase labels');
select enum_has_labels('public', 'question_format', array['multiple_choice', 'true_false'],
                       'question_format labels');
select enum_has_labels('public', 'content_source',
                       array['past_paper', 'ai_manual', 'ai_api', 'user', 'official'], 'content_source labels');
select enum_has_labels('public', 'confidence_level', array['guess', 'doubt', 'certain'],
                       'confidence_level labels');
select enum_has_labels('public', 'material_type', array['summary', 'link', 'note'], 'material_type labels');
select enum_has_labels('public', 'card_type', array['question', 'concept'], 'card_type labels');
select enum_has_labels('public', 'session_type', array['cycle', 'review', 'mock_exam', 'essay'],
                       'session_type labels');
select enum_has_labels('public', 'cycle_stage', array['reading', 'questions', 'review'], 'cycle_stage labels');
select enum_has_labels('public', 'item_status', array['pending', 'done', 'skipped'], 'item_status labels');
select enum_has_labels('public', 'essay_type',
                       array['general_essay', 'technical_case_study', 'technical_question',
                             'technical_questions_and_case_study'], 'essay_type labels');
select enum_has_labels('public', 'ai_mode', array['off', 'manual', 'api'], 'ai_mode labels');
select enum_has_labels('public', 'ai_request_type',
                       array['summary', 'questions', 'essay_grading', 'classification', 'cards'],
                       'ai_request_type labels');
select enum_has_labels('public', 'ai_request_status', array['awaiting_response', 'imported', 'discarded'],
                       'ai_request_status labels');

-- Defaults
insert into settings (user_id) values ('00000000-0000-0000-0000-00000000000a');

select is((select hours_per_day from settings where user_id = '00000000-0000-0000-0000-00000000000a'),
          '{"mon":3,"tue":3,"wed":3,"thu":3,"fri":3,"sat":3,"sun":3}'::jsonb,
          'settings.hours_per_day defaults to 3 hours on mon..sun');

-- Check constraints
select throws_ok($$ insert into questions (exam_board_id, format, statement, answer_key, source)
                    values ('cebraspe', 'true_false', 'x', 'A', 'user') $$,
                 '23514', null, 'true_false question rejects answer_key A');
select lives_ok($$ insert into questions (exam_board_id, format, statement, answer_key, source)
                   values ('cebraspe', 'true_false', 'x', 'E', 'user') $$,
                'true_false question accepts answer_key E');
select throws_ok($$ insert into questions (exam_board_id, format, statement, answer_key, source)
                    values ('fcc', 'multiple_choice', 'x', 'B', 'user') $$,
                 '23514', null, 'multiple_choice question without options is rejected');
select throws_ok($$ insert into questions (exam_board_id, format, statement, options, answer_key, source)
                    values ('fcc', 'multiple_choice', 'x', '[]', 'F', 'user') $$,
                 '23514', null, 'multiple_choice question rejects answer_key F');
select lives_ok($$ insert into questions (exam_board_id, format, statement, options, answer_key, source)
                   values ('fcc', 'multiple_choice', 'x', '[{"letter":"A","text":"a"}]', 'A', 'user') $$,
                'multiple_choice question with options and answer_key A is accepted');

select throws_ok($$ insert into answers (user_id, question_id, answer, correct)
                    select '00000000-0000-0000-0000-00000000000a', id, null, true from questions limit 1 $$,
                 '23514', null, 'blank answer cannot be marked correct');

select throws_ok($$ insert into cards (user_id, type, front, source)
                    values ('00000000-0000-0000-0000-00000000000a', 'concept', 'f', 'user') $$,
                 '23514', null, 'concept card without back is rejected');
select throws_ok($$ insert into cards (user_id, type, source)
                    values ('00000000-0000-0000-0000-00000000000a', 'question', 'user') $$,
                 '23514', null, 'question card without question_id is rejected');

select throws_ok($$ insert into incidences (exam_id, topic_id, value) values ('trt3', 'redes', 0.7)
                    on conflict (exam_id, topic_id) do update set value = excluded.value $$,
                 '23514', null, 'incidence value outside 0, 0.5, 1 is rejected');

select throws_ok($$ update settings set desired_retention = 0.5
                    where user_id = '00000000-0000-0000-0000-00000000000a' $$,
                 '23514', null, 'desired_retention below 0.70 is rejected');

select throws_ok($$ insert into materials (user_id, subtopic_id, type, title, source)
                    select '00000000-0000-0000-0000-00000000000a', id, 'link', 't', 'user'
                    from subtopics limit 1 $$,
                 '23514', null, 'link material without url is rejected');

select throws_ok($$ insert into study_sessions (user_id, type, started_at, ended_at)
                    values ('00000000-0000-0000-0000-00000000000a', 'cycle', now(), now() - interval '1 hour') $$,
                 '23514', null, 'study session cannot end before it starts');

-- Seed: jsonb columns carry English keys, enums carry English values
select ok((select objective ? 'distribution' and essay ? 'rubric' from exams where id = 'trt3'),
          'exams.objective and exams.essay use English keys');
select ok((select definition ? 'criteria' and definition ? 'zeroed_if' from rubrics where id = 'fumarc_redacao'),
          'rubrics.definition uses English keys');
select set_eq(
  $$ select category::text, count(*) from topics group by category $$,
  $$ values ('specific', 28::bigint), ('general', 10::bigint) $$,
  'seed loads 28 specific and 10 general topics'
);

select * from finish();
rollback;
