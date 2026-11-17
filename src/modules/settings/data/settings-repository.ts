import type { DbClient } from '@/shared/supabase';
import { parseThemePreference, type ThemePreference } from '../domain';

export type DbFailure = { ok: false; error: 'db_failure' };

/**
 * Creates the user's settings row if it does not exist yet and returns the saved theme.
 * Takes the same client that has just signed in: a new client would read the request
 * cookies, which do not carry the session yet.
 */
export async function ensureSettings(
  client: DbClient,
  userId: string,
): Promise<{ ok: true; theme: ThemePreference } | DbFailure> {
  const insert = await client
    .from('settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (insert.error) {
    console.error('ensureSettings: insert failed', insert.error);
    return { ok: false, error: 'db_failure' };
  }
  const theme = await readSavedTheme(client, userId);
  return theme === null ? { ok: false, error: 'db_failure' } : { ok: true, theme };
}

/** null on error or missing row; the caller keeps the current cache. */
export async function readSavedTheme(
  client: DbClient,
  userId: string,
): Promise<ThemePreference | null> {
  const { data, error } = await client
    .from('settings')
    .select('theme')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) console.error('readSavedTheme: read failed', error);
  if (error || !data) return null;
  return parseThemePreference(data.theme);
}

/** Zero updated rows counts as a failure: the theme was not saved. */
export async function saveTheme(
  client: DbClient,
  userId: string,
  theme: ThemePreference,
): Promise<{ ok: true } | DbFailure> {
  const { data, error } = await client
    .from('settings')
    .update({ theme })
    .eq('user_id', userId)
    .select('user_id');
  if (error) console.error('saveTheme: write failed', error);
  if (error || !data || data.length === 0) return { ok: false, error: 'db_failure' };
  return { ok: true };
}
