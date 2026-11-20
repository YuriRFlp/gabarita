import type { DbClient } from '@/shared/supabase';
import { readExamCatalog, readExamWeights } from '../data/exam-weights-repository';
import type { LoadResult } from '../data/topics-repository';
import { buildExamWeightsSettings, type ExamWeightsSettings } from '../domain';

// Server-side reader, deliberately without 'use server': not callable from the client (P-9).
export async function getExamWeightsSettings(
  client: DbClient,
  userId: string,
): Promise<LoadResult<ExamWeightsSettings>> {
  const [exams, overrides] = await Promise.all([
    readExamCatalog(client),
    readExamWeights(client, userId),
  ]);
  if (!exams.ok) return exams;
  if (!overrides.ok) return overrides;
  return { ok: true, value: buildExamWeightsSettings(exams.value, overrides.value) };
}
