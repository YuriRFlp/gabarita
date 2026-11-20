import type { DbClient } from '@/shared/supabase';
import { parseThemePreference, type StudyTarget, type ThemePreference } from '../domain';

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

export type LoadResult<T> = { ok: true; value: T } | { ok: false; error: 'load_failed' };

/** An active exam as the target-exam select shows it. */
export type ExamOption = { id: string; label: string };

const LOAD_FAILED = { ok: false, error: 'load_failed' } as const;
const courtCollator = new Intl.Collator('pt-BR', { numeric: true });

/** A user without a settings row has no target yet; the row is created at login. */
export async function readStudyTarget(
  client: DbClient,
  userId: string,
): Promise<LoadResult<StudyTarget>> {
  try {
    const { data, error } = await client
      .from('settings')
      .select('target_exam_id, target_notice_published')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('readStudyTarget: read failed', error);
      return LOAD_FAILED;
    }
    return {
      ok: true,
      value: {
        targetExamId: data?.target_exam_id ?? null,
        targetNoticePublished: data?.target_notice_published ?? false,
      },
    };
  } catch (error) {
    console.error('readStudyTarget: unexpected failure', error);
    return LOAD_FAILED;
  }
}

/** Zero updated rows counts as a failure: the target was not saved. */
export async function saveStudyTarget(
  client: DbClient,
  userId: string,
  target: StudyTarget,
): Promise<{ ok: true } | DbFailure> {
  try {
    const { data, error } = await client
      .from('settings')
      .update({
        target_exam_id: target.targetExamId,
        target_notice_published: target.targetNoticePublished,
      })
      .eq('user_id', userId)
      .select('user_id');
    if (error) console.error('saveStudyTarget: write failed', error);
    if (error || !data || data.length === 0) return { ok: false, error: 'db_failure' };
    return { ok: true };
  } catch (error) {
    console.error('saveStudyTarget: unexpected failure', error);
    return { ok: false, error: 'db_failure' };
  }
}

/** Active exams in court order, labelled "TRT-2 (SP) · FCC 2025". */
export async function readActiveExamOptions(client: DbClient): Promise<LoadResult<ExamOption[]>> {
  try {
    const { data, error, count } = await client
      .from('exams')
      .select('id, court, year, exam_boards(name)', { count: 'exact' })
      .eq('active', true);
    if (error || !data) {
      console.error('readActiveExamOptions: read failed', error);
      return LOAD_FAILED;
    }
    if (count !== data.length) {
      console.error('readActiveExamOptions: result truncated by the row limit');
      return LOAD_FAILED;
    }
    const options: ExamOption[] = [];
    for (const row of data) {
      if (!row.exam_boards) {
        console.error('readActiveExamOptions: exam without exam board', row.id);
        return LOAD_FAILED;
      }
      options.push({ id: row.id, label: `${row.court} · ${row.exam_boards.name} ${row.year}` });
    }
    options.sort((a, b) => courtCollator.compare(a.label, b.label));
    return { ok: true, value: options };
  } catch (error) {
    console.error('readActiveExamOptions: unexpected failure', error);
    return LOAD_FAILED;
  }
}
