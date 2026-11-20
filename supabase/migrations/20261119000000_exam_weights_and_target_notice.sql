-- Per-user exam weights over the seed defaults, and the target exam notice flag (SPEC-005, ADR-011).
create table exam_weights (
  user_id     uuid not null default auth.uid(),
  exam_id     text not null references exams(id) on delete cascade,
  weight      numeric(4,3) not null check (weight between 0 and 1),
  updated_at  timestamptz not null default now(),
  primary key (user_id, exam_id)
);
create trigger trg_exam_weights_updated before update on exam_weights
  for each row execute function set_updated_at();

alter table exam_weights enable row level security;
create policy owner_exam_weights on exam_weights for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table exam_weights is
  'User weight of each exam in topic priority, over exams.target_weight (the seed default, rewritten '
  'by every seed run). Any row puts the user in custom mode: an active exam without a row weighs 0. '
  'No rows = defaults. The 100% total is checked by the application (SPEC-005).';

alter table settings
  add column target_notice_published boolean not null default false;
alter table settings
  add constraint settings_notice_requires_target
  check (target_exam_id is not null or not target_notice_published);
comment on column settings.target_notice_published is
  'The notice of the target exam has been published: post_notice topics may enter the cycle '
  '(docs/04, exception 1; used by module 4).';
