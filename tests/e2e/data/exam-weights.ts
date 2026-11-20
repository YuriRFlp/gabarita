import {
  clearExamWeightsFor,
  readExamWeightUnitsFor,
  S1_UNITS,
  writeExamWeightsFor,
} from '#factories/exam-weights';
import type { ThemePreference } from '../support/theme.ts';
import { adminClient } from '../support/users.ts';

export { S1_UNITS };

/** Seeds the user's custom weights (thousandths) as if saved earlier. */
export function seedWeights(userId: string, units: Readonly<Record<string, number>> = S1_UNITS) {
  return writeExamWeightsFor(adminClient(), userId, units);
}

export function readWeights(userId: string) {
  return readExamWeightUnitsFor(adminClient(), userId);
}

/** exam_weights has no foreign key to auth.users, so a disposable user's rows are removed here. */
export function clearWeights(userId: string) {
  return clearExamWeightsFor(adminClient(), userId);
}

export async function seedStudyTarget(
  userId: string,
  target: { targetExamId: string | null; targetNoticePublished: boolean },
): Promise<void> {
  const { error } = await adminClient().from('settings').upsert(
    {
      user_id: userId,
      target_exam_id: target.targetExamId,
      target_notice_published: target.targetNoticePublished,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

export async function seedTheme(userId: string, theme: ThemePreference): Promise<void> {
  const { error } = await adminClient()
    .from('settings')
    .upsert({ user_id: userId, theme }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function readSettings(userId: string) {
  const { data, error } = await adminClient()
    .from('settings')
    .select('theme, target_exam_id, target_notice_published')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
