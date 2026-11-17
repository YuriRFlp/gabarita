-- Theme preference in settings (SPEC-001, CA-33).
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select enum_has_labels('public', 'theme_preference', array['system', 'light', 'dark'],
                       'theme_preference has system, light and dark, in that order');

select col_type_is('public', 'settings', 'theme', 'theme_preference',
                   'settings.theme is theme_preference');
select col_not_null('public', 'settings', 'theme', 'settings.theme is not null');
select col_default_is('public', 'settings', 'theme', 'system',
                      'settings.theme defaults to system');

select isnt(col_description('public.settings'::regclass,
                            (select attnum from pg_attribute
                             where attrelid = 'public.settings'::regclass and attname = 'theme')),
            null, 'settings.theme has a column comment');

-- A = ...0a, B = ...0b; B already has a row, A creates its own through RLS.
insert into settings (user_id, theme)
values ('00000000-0000-0000-0000-00000000000b', 'dark');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok($$ insert into settings default values $$,
                'A creates own row without providing theme');
select is((select theme from settings), 'system'::theme_preference,
          'row inserted without theme gets system');

select throws_ok($$ update settings set theme = 'blue' $$, '22P02', null,
                 'writing a theme outside the enum fails');

select lives_ok($$ update settings set theme = 'light' $$, 'A updates own theme');
select is((select theme from settings), 'light'::theme_preference, 'A theme becomes light');

select is_empty($$ update settings set theme = 'light'
                   where user_id = '00000000-0000-0000-0000-00000000000b' returning 1 $$,
                'A cannot update B theme');
select is_empty($$ select theme from settings
                   where user_id = '00000000-0000-0000-0000-00000000000b' $$,
                'A cannot read B theme');

select * from finish();
rollback;
