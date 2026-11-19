import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../src/shared/supabase/types.ts';

type Confidence = 'guess' | 'doubt' | 'certain';

export type AnswerSpec = {
  /** null = left blank. */
  correct: boolean | null;
  confidence?: Confidence | null;
  /** Defaults to now. */
  answeredAt?: Date;
};

const EXAM_BOARD_ID = 'fumarc';

/** Creates a true/false question linked to the topics. Needs the local seed (exam board). */
export async function createQuestion(
  admin: DbClient,
  topicIds: ReadonlyArray<string>,
): Promise<string> {
  const id = randomUUID();
  const inserted = await admin.from('questions').insert({
    id,
    exam_board_id: EXAM_BOARD_ID,
    format: 'true_false',
    statement: `Integration question ${id}`,
    answer_key: 'C',
    source: 'user',
  });
  if (inserted.error) throw inserted.error;
  const linked = await admin
    .from('question_topics')
    .insert(topicIds.map((topic_id) => ({ question_id: id, topic_id })));
  if (linked.error) throw linked.error;
  return id;
}

export async function createAnswers(
  admin: DbClient,
  userId: string,
  questionId: string,
  answers: ReadonlyArray<AnswerSpec>,
): Promise<void> {
  const { error } = await admin.from('answers').insert(
    answers.map(({ correct, confidence = null, answeredAt = new Date() }) => ({
      user_id: userId,
      question_id: questionId,
      answer: correct === null ? null : correct ? 'C' : 'E',
      correct,
      confidence,
      answered_at: answeredAt.toISOString(),
    })),
  );
  if (error) throw error;
}

/** Deleting the question cascades to question_topics and answers. */
export async function deleteQuestion(admin: DbClient, questionId: string): Promise<void> {
  const { error } = await admin.from('questions').delete().eq('id', questionId);
  if (error) throw error;
}
