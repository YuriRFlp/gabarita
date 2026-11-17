-- UI theme preference in settings, synced across devices (SPEC-001).
create type theme_preference as enum ('system', 'light', 'dark');

alter table settings
  add column theme theme_preference not null default 'system';

comment on column settings.theme is
  'UI theme chosen by the user. system = follows the device prefers-color-scheme; '
  'the app keeps a copy in a cookie only as a cache to paint the page without querying the database.';
