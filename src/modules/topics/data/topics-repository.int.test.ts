import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@/shared/supabase';
import { createAnswers, createQuestion, deleteQuestion } from '#factories/answers';
import { createFakeTopicsClient } from '#factories/fake-topics-client';
import {
  createAdminClient,
  createUser,
  deleteUser,
  signInAs,
  type TestUser,
} from '#factories/users';
import { computeTopicPriority, type TopicMapSource } from '../domain';
import { readTopicMapSource } from './topics-repository';

const admin = createAdminClient();
const questions: string[] = [];
let userA: TestUser;
let userB: TestUser;
let clientA: DbClient;
let clientB: DbClient;

beforeAll(async () => {
  userA = await createUser(admin);
  userB = await createUser(admin);
  clientA = await signInAs(userA);
  clientB = await signInAs(userB);
});

afterAll(async () => {
  for (const id of questions) await deleteQuestion(admin, id);
  await deleteUser(admin, userA.id);
  await deleteUser(admin, userB.id);
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function loadSource(client: DbClient, userId: string): Promise<TopicMapSource> {
  const result = await readTopicMapSource(client, userId);
  if (!result.ok) throw new Error('readTopicMapSource failed');
  return result.value;
}

/** Postgres round(numeric, 3): half away from zero, on exact decimals. */
function roundToThousandths(value: number): number {
  const micro = Math.round(value * 1_000_000);
  return Math.floor((micro + 500) / 1000) / 1000;
}

describe('CA-15 — readTopicMapSource against the seed', () => {
  it('reads 38 topics, 218 subtopics, 14 exams with the exam board name and 532 incidences', async () => {
    const source = await loadSource(clientA, userA.id);

    expect(source.topics).toHaveLength(38);
    expect(source.topics.reduce((sum, topic) => sum + topic.subtopics.length, 0)).toBe(218);
    expect(source.exams).toHaveLength(14);
    expect(source.exams.every((exam) => exam.examBoardName.length > 0)).toBe(true);
    expect(source.incidences).toHaveLength(532);
  });

  it('maps snake_case columns to the domain types', async () => {
    const source = await loadSource(clientA, userA.id);

    const topic = source.topics.find((candidate) => candidate.id === 'pdpj_stack');
    expect(topic).toMatchObject({ category: 'specific', phase: expect.any(String) });
    expect(typeof topic?.sortOrder).toBe('number');
    expect(topic?.subtopics[0]).toMatchObject({
      id: expect.any(String),
      sortOrder: expect.any(Number),
    });
    const exam = source.exams.find((candidate) => candidate.id === 'trt3');
    expect(exam).toMatchObject({
      court: 'TRT-3 (MG)',
      active: true,
      examBoardName: expect.any(String),
    });
    expect(typeof exam?.targetWeight).toBe('number');
  });

  it('has no performance for a user without answers', async () => {
    const source = await loadSource(clientA, userA.id);

    expect(source.performance).toEqual([]);
  });

  it('gives the domain priority, rounded to thousandths, equal to v_topic_priority for the 38 topics', async () => {
    const source = await loadSource(clientA, userA.id);
    const view = await clientA.from('v_topic_priority').select('topic_id, priority');
    expect(view.error).toBeNull();

    const fromView = new Map((view.data ?? []).map((row) => [row.topic_id, row.priority]));
    expect(fromView.size).toBe(38);
    for (const topic of source.topics) {
      const domain = computeTopicPriority(topic.id, source.exams, source.incidences).priority;
      expect(roundToThousandths(domain), topic.id).toBe(fromView.get(topic.id));
    }
  });
});

describe('CA-16 — isolation between users', () => {
  it('returns only the answers of the signed-in user', async () => {
    const question = await createQuestion(admin, ['pdpj_stack', 'redes']);
    questions.push(question);
    await createAnswers(admin, userA.id, question, [
      { correct: true, confidence: 'certain' },
      { correct: false, confidence: 'doubt' },
    ]);
    await createAnswers(admin, userB.id, question, [
      { correct: true, confidence: 'certain' },
      { correct: true, confidence: 'certain' },
      { correct: true, confidence: 'doubt' },
      { correct: null },
      { correct: false, confidence: 'certain' },
    ]);

    const sourceA = await loadSource(clientA, userA.id);
    const sourceB = await loadSource(clientB, userB.id);

    const byTopic = (source: TopicMapSource, id: string) =>
      source.performance.find((row) => row.topicId === id);
    expect(byTopic(sourceA, 'pdpj_stack')).toEqual({
      topicId: 'pdpj_stack',
      answered: 2,
      firmCorrect: 1,
    });
    expect(byTopic(sourceA, 'redes')).toEqual({ topicId: 'redes', answered: 2, firmCorrect: 1 });
    expect(sourceA.performance).toHaveLength(2);
    expect(byTopic(sourceB, 'pdpj_stack')).toEqual({
      topicId: 'pdpj_stack',
      answered: 5,
      firmCorrect: 3,
    });
  });

  it("does not return another user's performance even when asked for that user id (RLS)", async () => {
    const source = await loadSource(clientB, userA.id);

    expect(source.performance).toEqual([]);
  });
});

describe('CA-17 — failures become load_failed', () => {
  const failure = { ok: false, error: 'load_failed' };
  const dbError = { code: '08006', message: 'connection failure', details: 'pg_hba.conf' };

  it.each(['topics', 'exams', 'incidences', 'v_topic_performance'])(
    'returns load_failed without throwing when the %s query errors',
    async (table) => {
      const client = createFakeTopicsClient({
        results: { [table]: { data: null, error: dbError } },
      });

      await expect(readTopicMapSource(client, userA.id)).resolves.toEqual(failure);
    },
  );

  it.each(['topics', 'exams', 'incidences', 'v_topic_performance'])(
    'returns load_failed without throwing when the %s query rejects',
    async (table) => {
      const client = createFakeTopicsClient({ throwOn: table });

      await expect(readTopicMapSource(client, userA.id)).resolves.toEqual(failure);
    },
  );

  it('returns load_failed when an incidence has a value outside 0, 0.5 and 1', async () => {
    const client = createFakeTopicsClient({
      results: { incidences: { data: [{ exam_id: 'e', topic_id: 't', value: 0.7 }], error: null } },
    });

    await expect(readTopicMapSource(client, userA.id)).resolves.toEqual(failure);
  });

  it.each(['topics', 'exams', 'incidences', 'v_topic_performance'])(
    'returns load_failed when the %s result was truncated by the row limit',
    async (table) => {
      const client = createFakeTopicsClient({
        results: { [table]: { data: [], error: null, count: 1001 } },
      });

      await expect(readTopicMapSource(client, userA.id)).resolves.toEqual(failure);
    },
  );

  it('does not leak technical detail in the result', async () => {
    const client = createFakeTopicsClient({ results: { exams: { data: null, error: dbError } } });

    const result = await readTopicMapSource(client, userA.id);

    expect(JSON.stringify(result)).not.toContain('pg_hba');
  });
});
