-- MVP initial schema: reference, content, study, memorization, essay and AI tables, views and RLS (docs/03-modelo-de-dados.md).

create extension if not exists pgcrypto;

-- Enumerated types
create type topic_category    as enum ('specific', 'general');
create type topic_profile     as enum ('systems', 'infra', 'common');
create type study_phase       as enum ('pre_notice', 'post_notice');
create type question_format   as enum ('multiple_choice', 'true_false');
create type content_source    as enum ('past_paper', 'ai_manual', 'ai_api', 'user', 'official');
create type confidence_level  as enum ('guess', 'doubt', 'certain');
create type material_type     as enum ('summary', 'link', 'note');
create type card_type         as enum ('question', 'concept');
create type session_type      as enum ('cycle', 'review', 'mock_exam', 'essay');
create type cycle_stage       as enum ('reading', 'questions', 'review');
create type item_status       as enum ('pending', 'done', 'skipped');
create type essay_type        as enum ('general_essay', 'technical_case_study', 'technical_question');
create type ai_mode           as enum ('off', 'manual', 'api');
create type ai_request_type   as enum ('summary', 'questions', 'essay_grading', 'classification', 'cards');
create type ai_request_status as enum ('awaiting_response', 'imported', 'discarded');

-- Utility function: keeps updated_at current
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- 1. REFERENCE: exam boards, rubrics, exams and taxonomy
create table exam_boards (
  id                    text primary key,                 -- e.g. 'fumarc', 'cebraspe'
  name                  text not null,
  default_format        question_format not null,
  wrong_answer_penalty  numeric(3,2) not null default 0   -- Cebraspe: 1.00 (one wrong answer cancels one right answer)
);

create table rubrics (
  id               text primary key,                 -- e.g. 'fumarc_redacao'
  exam_board_id    text not null references exam_boards(id),
  type             essay_type not null,
  definition       jsonb not null                    -- criteria, bands, deductions, formula
);

create table exams (
  id               text primary key,                 -- e.g. 'trt3'
  court            text not null,
  year             int  not null,
  exam_board_id    text not null references exam_boards(id),
  position         text not null,
  duration_min     int  not null check (duration_min > 0),
  objective        jsonb not null,                   -- distribution, weights, passing rules
  essay            jsonb,                            -- type, lines, points, minimum
  rubric_id        text references rubrics(id),
  target_weight    numeric(4,3) not null default 0 check (target_weight between 0 and 1),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create table topics (
  id               text primary key,                 -- e.g. 'pdpj_stack'
  category         topic_category not null,
  name             text not null,
  profile          topic_profile,                    -- filled only for 'specific'
  phase            study_phase not null default 'pre_notice',
  sort_order       int not null default 0
);

create table subtopics (
  id               uuid primary key default gen_random_uuid(),
  topic_id         text not null references topics(id) on delete cascade,
  name             text not null,
  sort_order       int  not null default 0,
  unique (topic_id, name)
);

create table incidences (
  exam_id          text not null references exams(id) on delete cascade,
  topic_id         text not null references topics(id) on delete cascade,
  value            numeric(2,1) not null check (value in (0, 0.5, 1)),
  primary key (exam_id, topic_id)
);

-- 2. CONTENT: study material, papers and questions
create table materials (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  subtopic_id      uuid not null references subtopics(id) on delete cascade,
  type             material_type not null,
  title            text not null,
  content_md       text,                             -- Markdown; rendered as a mind map via Markmap
  url              text,                             -- official source or external material
  source           content_source not null,
  verified         boolean not null default false,   -- checked against the official source?
  version          int not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (type <> 'link' or url is not null),
  check (type =  'link' or content_md is not null)
);
create trigger trg_materials_updated before update on materials
  for each row execute function set_updated_at();

create table papers (
  id               uuid primary key default gen_random_uuid(),
  exam_board_id    text not null references exam_boards(id),
  agency           text not null,                    -- e.g. 'TRT-3'
  year             int  not null,
  position         text not null,
  exam_id          text references exams(id),        -- when the paper belongs to a registered exam
  source_url       text,
  created_at       timestamptz not null default now(),
  unique (exam_board_id, agency, year, position)
);

create table questions (
  id               uuid primary key default gen_random_uuid(),
  paper_id         uuid references papers(id) on delete set null,
  number           int,                              -- number in the original paper
  exam_board_id    text not null references exam_boards(id),
  format           question_format not null,
  base_text        text,                             -- text or scenario shared by several items
  statement        text not null,
  options          jsonb,                            -- [{"letter":"A","text":"..."}]
  answer_key       text not null,                    -- 'A'..'E' or 'C'/'E'
  commentary_md    text,
  source           content_source not null,
  annulled         boolean not null default false,
  content_hash     text unique,                      -- prevents importing the same question twice
  created_at       timestamptz not null default now(),
  check (
    (format = 'true_false'      and answer_key in ('C', 'E')) or
    (format = 'multiple_choice' and options is not null and answer_key ~ '^[A-E]$')
  )
);
create index idx_questions_paper on questions (paper_id);

create table question_topics (
  question_id      uuid not null references questions(id) on delete cascade,
  topic_id         text not null references topics(id),
  subtopic_id      uuid references subtopics(id),
  primary key (question_id, topic_id)
);
create index idx_question_topics_topic on question_topics (topic_id);

-- 3. STUDY: settings, schedule, sessions, mock exams and answers
create table settings (
  user_id                   uuid primary key default auth.uid(),
  target_exam_id            text references exams(id),
  hours_per_day             jsonb not null default
    '{"mon":3,"tue":3,"wed":3,"thu":3,"fri":3,"sat":3,"sun":3}',
  infra_quota_min_per_week  int not null default 180,
  new_cards_per_day         int not null default 20,
  desired_retention         numeric(3,2) not null default 0.90
                            check (desired_retention between 0.70 and 0.99),
  ai_mode                   ai_mode not null default 'manual',
  updated_at                timestamptz not null default now()
);
create trigger trg_settings_updated before update on settings
  for each row execute function set_updated_at();

create table study_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid(),
  type               session_type not null,
  topic_id           text references topics(id),
  stage              cycle_stage,
  planned_minutes    int,
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
create index idx_study_sessions_user_started on study_sessions (user_id, started_at desc);

create table schedule_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  date             date not null,
  sort_order       int  not null default 0,
  type             session_type not null,
  topic_id         text references topics(id),
  stage            cycle_stage,
  minutes          int not null check (minutes > 0),
  status           item_status not null default 'pending',
  session_id       uuid references study_sessions(id) on delete set null,
  generated_at     timestamptz not null default now()
);
create index idx_schedule_items_user_date on schedule_items (user_id, date);

create table mock_exams (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  exam_id          text not null references exams(id),
  time_limit_min   int not null,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  result           jsonb,                            -- score per subject and final score
  passed           boolean
);

create table mock_exam_questions (
  mock_exam_id     uuid not null references mock_exams(id) on delete cascade,
  question_id      uuid not null references questions(id),
  sort_order       int  not null,
  subject          text not null,                    -- key of the exam's objective distribution
  primary key (mock_exam_id, question_id)
);

create table answers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  question_id      uuid not null references questions(id) on delete cascade,
  session_id       uuid references study_sessions(id) on delete set null,
  mock_exam_id     uuid references mock_exams(id) on delete cascade,
  answer           text,                             -- null = left blank
  correct          boolean,                          -- null = blank
  confidence       confidence_level,
  time_sec         int check (time_sec >= 0),
  answered_at      timestamptz not null default now(),
  check ((answer is null) = (correct is null))
);
create index idx_answers_user_answered on answers (user_id, answered_at desc);
create index idx_answers_question      on answers (question_id);

-- 4. MEMORIZATION: FSRS cards and review history
--    Columns mirror Card and ReviewLog from the ts-fsrs library.
create table cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  type             card_type not null,
  question_id      uuid references questions(id) on delete cascade,
  subtopic_id      uuid references subtopics(id) on delete set null,
  front            text,
  back             text,
  source           content_source not null,
  suspended        boolean not null default false,
  -- FSRS state
  due              timestamptz not null default now(),
  stability        double precision not null default 0,
  difficulty       double precision not null default 0,
  elapsed_days     int not null default 0,
  scheduled_days   int not null default 0,
  learning_steps   int not null default 0,
  reps             int not null default 0,
  lapses           int not null default 0,
  state            smallint not null default 0 check (state between 0 and 3), -- 0 New, 1 Learning, 2 Review, 3 Relearning
  last_review      timestamptz,
  created_at       timestamptz not null default now(),
  check (
    (type = 'question' and question_id is not null) or
    (type = 'concept'  and front is not null and back is not null)
  )
);
create unique index uq_cards_question on cards (user_id, question_id) where question_id is not null;
create index idx_cards_queue on cards (user_id, due) where not suspended;

create table review_logs (
  id                 uuid primary key default gen_random_uuid(),
  card_id            uuid not null references cards(id) on delete cascade,
  rating             smallint not null check (rating between 1 and 4), -- 1 Again, 2 Hard, 3 Good, 4 Easy
  state              smallint not null check (state between 0 and 3),
  due                timestamptz not null,
  stability          double precision not null,
  difficulty         double precision not null,
  elapsed_days       int not null,
  last_elapsed_days  int not null,
  scheduled_days     int not null,
  learning_steps     int not null default 0,
  reviewed_at        timestamptz not null default now()
);
create index idx_review_logs_card on review_logs (card_id, reviewed_at);

-- 5. ESSAYS
create table essay_prompts (
  id                  uuid primary key default gen_random_uuid(),
  type                essay_type not null,
  exam_board_id       text references exam_boards(id),
  topic_id            text references topics(id),   -- used in technical case studies
  title               text not null,
  statement           text not null,
  support_texts       jsonb,
  model_answer_md     text,                         -- exam board's model answer, when available
  source              content_source not null,
  created_at          timestamptz not null default now()
);

create table essays (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  prompt_id        uuid not null references essay_prompts(id),
  rubric_id        text not null references rubrics(id),
  text             text not null,
  lines            int  not null check (lines >= 0),
  time_sec         int,
  scores           jsonb,                            -- score per rubric criterion
  total_score      numeric(5,2),
  feedback_md      text,
  written_at       timestamptz not null default now(),
  graded_at        timestamptz
);

-- 6. AI (manual mode now; API mode in the future)
create table ai_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  type             ai_request_type not null,
  mode             ai_mode not null,
  reference        jsonb,                            -- e.g. {"subtopic_id": "..."}
  prompt           text not null,
  raw_response     text,
  status           ai_request_status not null default 'awaiting_response',
  created_at       timestamptz not null default now(),
  imported_at      timestamptz
);

-- 7. VIEWS
-- Priority of each topic = sum(target_weight × incidence) over active exams.
create view v_topic_priority with (security_invoker = true) as
select t.id as topic_id,
       t.name,
       t.category,
       t.profile,
       t.phase,
       coalesce(round(sum(e.target_weight * i.value), 3), 0) as priority
from topics t
left join incidences i on i.topic_id = t.id
left join exams      e on e.id = i.exam_id and e.active
group by t.id, t.name, t.category, t.profile, t.phase;

-- Performance over the last 60 days per topic.
-- A correct answer marked as 'guess' does not count as mastery (see docs/04-regras-de-estudo.md).
create view v_topic_performance with (security_invoker = true) as
select a.user_id,
       qt.topic_id,
       count(*) as answered,
       count(*) filter (where a.correct and a.confidence is distinct from 'guess') as firm_correct,
       round(
         count(*) filter (where a.correct and a.confidence is distinct from 'guess')::numeric
         / nullif(count(*), 0), 3) as mastery_rate
from answers a
join question_topics qt on qt.question_id = a.question_id
where a.answered_at >= now() - interval '60 days'
group by a.user_id, qt.topic_id;

-- 8. SECURITY (Row Level Security) — see ADR-005
--    Personal tables: each user only accesses their own rows.
--    Reference and content tables: full access for authenticated users
--    (acceptable while usage is personal).
do $$
declare t text;
begin
  foreach t in array array['materials','settings','study_sessions','schedule_items',
                           'mock_exams','answers','cards','essays','ai_requests'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())',
                   'owner_' || t, t);
  end loop;

  foreach t in array array['exam_boards','rubrics','exams','topics','subtopics','incidences',
                           'papers','questions','question_topics','essay_prompts'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)',
                   'authenticated_' || t, t);
  end loop;
end $$;

-- Child tables without user_id: access derives from the parent row.
alter table mock_exam_questions enable row level security;
create policy owner_mock_exam_questions on mock_exam_questions for all to authenticated
  using (exists (select 1 from mock_exams m where m.id = mock_exam_id and m.user_id = auth.uid()))
  with check (exists (select 1 from mock_exams m where m.id = mock_exam_id and m.user_id = auth.uid()));

alter table review_logs enable row level security;
create policy owner_review_logs on review_logs for all to authenticated
  using (exists (select 1 from cards c where c.id = card_id and c.user_id = auth.uid()))
  with check (exists (select 1 from cards c where c.id = card_id and c.user_id = auth.uid()));
