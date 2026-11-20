import type { ExamWeightOverride } from '../../src/modules/topics/domain/index.ts';
import type { DbClient } from '../../src/shared/supabase/types.ts';

/** SPEC-005 § 4, set S1: TRT-2 raised from 5% to 40% and the others rebalanced, in thousandths. */
export const S1_UNITS: Readonly<Record<string, number>> = {
  trt2: 400,
  trt3: 177,
  trf6: 114,
  tjmg: 88,
  trf2: 32,
  trt1: 32,
  trt15: 32,
  trf4: 25,
  trt4: 25,
  trt12: 25,
  tjrj: 16,
  tjsp: 16,
  tjrs: 9,
  tjsc: 9,
};

export function s1Map(): Map<string, number> {
  return new Map(Object.entries(S1_UNITS));
}

/** S1 as exam_weights rows (weight 0..1). */
export function s1Overrides(): ExamWeightOverride[] {
  return Object.entries(S1_UNITS).map(([examId, units]) => ({ examId, weight: units / 1000 }));
}

/** Writes a set of weights (thousandths) for a user with the admin client, replacing any rows. */
export async function writeExamWeightsFor(
  admin: DbClient,
  userId: string,
  units: Readonly<Record<string, number>>,
): Promise<void> {
  const rows = Object.entries(units).map(([examId, value]) => ({
    user_id: userId,
    exam_id: examId,
    weight: value / 1000,
  }));
  const { error } = await admin
    .from('exam_weights')
    .upsert(rows, { onConflict: 'user_id,exam_id' });
  if (error) throw error;
}

export async function clearExamWeightsFor(admin: DbClient, userId: string): Promise<void> {
  const { error } = await admin.from('exam_weights').delete().eq('user_id', userId);
  if (error) throw error;
}

/** The user's rows as exam id to thousandths, read with the admin client. */
export async function readExamWeightUnitsFor(
  admin: DbClient,
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await admin
    .from('exam_weights')
    .select('exam_id, weight')
    .eq('user_id', userId);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((row) => [row.exam_id, Math.round(row.weight * 1000)]),
  );
}
