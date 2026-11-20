import type { DbClient } from '@/shared/supabase';
import type { Exam, ExamWeightOverride, WeightUnits } from '../domain';
import { selectExams, toExam } from './exam-catalog';
import type { LoadResult } from './topics-repository';

type WriteResult = { ok: true } | { ok: false; error: 'save_failed' };

const SAVE_FAILED = { ok: false, error: 'save_failed' } as const;

/** The user's own exam_weights rows; empty means default weights (ADR-011). */
export async function readExamWeights(
  client: DbClient,
  userId: string,
): Promise<LoadResult<ExamWeightOverride[]>> {
  try {
    const { data, error, count } = await client
      .from('exam_weights')
      .select('exam_id, weight', { count: 'exact' })
      .eq('user_id', userId);
    if (error || !data) {
      console.error('readExamWeights: read failed', error);
      return { ok: false, error: 'load_failed' };
    }
    // PostgREST truncates at its row limit without an error; a partial set would look complete.
    if (count !== data.length) {
      console.error('readExamWeights: result truncated by the row limit');
      return { ok: false, error: 'load_failed' };
    }
    return { ok: true, value: data.map((row) => ({ examId: row.exam_id, weight: row.weight })) };
  } catch (error) {
    console.error('readExamWeights: unexpected failure', error);
    return { ok: false, error: 'load_failed' };
  }
}

/** One upsert of every row: a single statement, so the set is written whole or not at all. */
export async function saveExamWeights(
  client: DbClient,
  userId: string,
  set: ReadonlyMap<string, WeightUnits>,
): Promise<WriteResult> {
  try {
    const rows = [...set].map(([examId, units]) => ({
      user_id: userId,
      exam_id: examId,
      weight: units / 1000,
    }));
    const { error } = await client
      .from('exam_weights')
      .upsert(rows, { onConflict: 'user_id,exam_id' });
    if (error) {
      console.error('saveExamWeights: write failed', error);
      return SAVE_FAILED;
    }
    return { ok: true };
  } catch (error) {
    console.error('saveExamWeights: unexpected failure', error);
    return SAVE_FAILED;
  }
}

/** "Restore defaults": removes only the user's rows (RLS keeps the others out of reach). */
export async function deleteExamWeights(client: DbClient, userId: string): Promise<WriteResult> {
  try {
    const { error } = await client.from('exam_weights').delete().eq('user_id', userId);
    if (error) {
      console.error('deleteExamWeights: delete failed', error);
      return SAVE_FAILED;
    }
    return { ok: true };
  } catch (error) {
    console.error('deleteExamWeights: unexpected failure', error);
    return SAVE_FAILED;
  }
}

/** Every exam with its seed default weight; the base the user's rows are applied over. */
export async function readExamCatalog(client: DbClient): Promise<LoadResult<Exam[]>> {
  try {
    const { data, error, count } = await selectExams(client);
    if (error || !data) {
      console.error('readExamCatalog: read failed', error);
      return { ok: false, error: 'load_failed' };
    }
    if (count !== data.length) {
      console.error('readExamCatalog: result truncated by the row limit');
      return { ok: false, error: 'load_failed' };
    }
    const exams: Exam[] = [];
    for (const row of data) {
      const exam = toExam(row);
      if (!exam) {
        console.error('readExamCatalog: exam without exam board', row.id);
        return { ok: false, error: 'load_failed' };
      }
      exams.push(exam);
    }
    return { ok: true, value: exams };
  } catch (error) {
    console.error('readExamCatalog: unexpected failure', error);
    return { ok: false, error: 'load_failed' };
  }
}
