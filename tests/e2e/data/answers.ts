import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/shared/supabase/database.types.ts';
import { isLocalUrl, readLocalSupabase } from '../../../scripts/local-supabase.ts';
import { createAnswers, createQuestion, deleteQuestion, type AnswerSpec } from '#factories/answers';

function adminClient() {
  const { url, secretKey } = readLocalSupabase();
  if (!isLocalUrl(url)) throw new Error(`Refused: ${url} is not the local Supabase.`);
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 10 answers: 7 firm correct ("certain"), 3 wrong. With no cards, mastery = 70%. */
export const SEVENTY_PERCENT_ANSWERS: ReadonlyArray<AnswerSpec> = [
  ...Array.from({ length: 7 }, (): AnswerSpec => ({ correct: true, confidence: 'certain' })),
  ...Array.from({ length: 3 }, (): AnswerSpec => ({ correct: false, confidence: 'certain' })),
];

/**
 * Gives the user answers on the given topics and returns a cleanup. The question is created per
 * call, so a test never depends on rows another test left behind.
 */
export async function answerTopics(
  userId: string,
  topicIds: ReadonlyArray<string>,
  answers: ReadonlyArray<AnswerSpec> = SEVENTY_PERCENT_ANSWERS,
): Promise<() => Promise<void>> {
  const admin = adminClient();
  const questionId = await createQuestion(admin, topicIds);
  await createAnswers(admin, userId, questionId, answers);
  return () => deleteQuestion(admin, questionId);
}
