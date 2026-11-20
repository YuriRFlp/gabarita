import type { DbClient } from '@/shared/supabase';
import {
  readActiveExamOptions,
  readStudyTarget,
  type ExamOption,
  type LoadResult,
} from '../data/settings-repository';
import type { StudyTarget } from '../domain';

// Server-side reader, deliberately without 'use server': not callable from the client (P-9).
export async function getStudyTarget(
  client: DbClient,
  userId: string,
): Promise<LoadResult<{ target: StudyTarget; examOptions: ReadonlyArray<ExamOption> }>> {
  const [target, examOptions] = await Promise.all([
    readStudyTarget(client, userId),
    readActiveExamOptions(client),
  ]);
  if (!target.ok) return target;
  if (!examOptions.ok) return examOptions;
  return { ok: true, value: { target: target.value, examOptions: examOptions.value } };
}
