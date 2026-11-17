import { describe, expect, expectTypeOf, it } from 'vitest';
import { Constants, type Database } from '@/shared/supabase/database.types';
import { THEME_PREFERENCES, type ThemePreference } from '../domain';

type DbThemePreference = Database['public']['Enums']['theme_preference'];

describe('THEME_PREFERENCES matches the generated theme_preference enum (CA-34)', () => {
  it('has the same values, in the same order, as the database enum', () => {
    expect([...THEME_PREFERENCES]).toEqual([...Constants.public.Enums.theme_preference]);
  });

  it('has the same type as the database enum', () => {
    expectTypeOf<ThemePreference>().toEqualTypeOf<DbThemePreference>();
  });
});
