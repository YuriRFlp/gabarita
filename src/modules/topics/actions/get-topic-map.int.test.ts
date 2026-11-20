import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@/shared/supabase';
import { createAnswers, createQuestion, deleteQuestion } from '#factories/answers';
import { createFakeTopicsClient } from '#factories/fake-topics-client';
import { S1_UNITS, clearExamWeightsFor, writeExamWeightsFor } from '#factories/exam-weights';
import {
  createAdminClient,
  createUser,
  deleteUser,
  signInAs,
  type TestUser,
} from '#factories/users';
import type { TopicMapQuery } from '../domain';
import { getTopicDetail, getTopicMap } from './get-topic-map';

const admin = createAdminClient();
const QUERY: TopicMapQuery = { view: 'list', category: 'all', profile: 'all', sort: 'urgency' };
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
  await clearExamWeightsFor(admin, userA.id);
  await clearExamWeightsFor(admin, userB.id);
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

async function mapOf(client: DbClient, userId: string, query = QUERY) {
  const result = await getTopicMap(client, userId, query);
  if (!result.ok) throw new Error('getTopicMap failed');
  return result.value;
}

describe('getTopicMap with the seed', () => {
  it('builds the whole taxonomy with every mastery not measured for a user without answers', async () => {
    const map = await mapOf(clientA, userA.id);

    expect(map.totals).toEqual({ topics: 38, subtopics: 218, exams: 14, shown: 38, measured: 0 });
    expect(map.entries.every((entry) => entry.mastery.kind === 'no_answers')).toBe(true);
    expect(map.entries[0]?.topic.id).toBe('pdpj_stack');
    expect(map.entries[0]?.priority.priority).toBe(1);
  });

  it('applies the query filters', async () => {
    const map = await mapOf(clientA, userA.id, { ...QUERY, category: 'general' });

    expect(map.totals.shown).toBe(10);
    expect(map.totals.topics).toBe(38);
  });
});

describe('CA-16 — the map reflects only the signed-in user', () => {
  it('measures the topic for the user who answered and not for the other', async () => {
    const question = await createQuestion(admin, ['pdpj_stack']);
    questions.push(question);
    await createAnswers(admin, userA.id, question, [
      { correct: true, confidence: 'certain' },
      { correct: false, confidence: 'certain' },
    ]);

    const mapA = await mapOf(clientA, userA.id);
    const mapB = await mapOf(clientB, userB.id);

    const entryA = mapA.entries.find((entry) => entry.topic.id === 'pdpj_stack');
    const entryB = mapB.entries.find((entry) => entry.topic.id === 'pdpj_stack');
    expect(entryA?.mastery).toMatchObject({ kind: 'measured', answered: 2, firmCorrect: 1 });
    expect(mapA.totals.measured).toBe(1);
    expect(entryB?.mastery.kind).toBe('no_answers');
    expect(mapB.totals.measured).toBe(0);
  });
});

describe('CA-16, CA-35, CA-36 — the map uses the effective weights of the user', () => {
  beforeEach(async () => {
    await clearExamWeightsFor(admin, userA.id);
    await clearExamWeightsFor(admin, userB.id);
  });

  it('gives A the S1 priorities, the TRT-2 as first column and the custom summary; B keeps the defaults', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);

    const mapA = await mapOf(clientA, userA.id);
    const mapB = await mapOf(clientB, userB.id);

    const priorityOf = (map: typeof mapA, id: string) =>
      map.entries.find((entry) => entry.topic.id === id)?.priority.priority;
    expect(priorityOf(mapA, 'legislacao_mg')).toBeCloseTo(0.088, 10);
    expect(priorityOf(mapA, 'pdpj_stack')).toBe(1);
    expect(mapA.exams[0]?.id).toBe('trt2');
    expect(mapA.weights).toEqual({
      mode: 'custom',
      activeTotal: 1000,
      unweightedExamIds: [],
      fingerprint: expect.any(String),
    });
    expect(mapB.exams[0]?.id).toBe('trt3');
    expect(mapB.weights).toEqual({
      mode: 'default',
      activeTotal: 1000,
      unweightedExamIds: [],
      fingerprint: null,
    });
  });

  it('passes the weights summary to the detail and shows the TJMG contribution of 8.8%', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);

    const result = await getTopicDetail(clientA, userA.id, 'legislacao_mg');

    expect(result.ok).toBe(true);
    if (!result.ok || result.value === null) throw new Error('expected a topic');
    expect(result.value.entry.weights.mode).toBe('custom');
    const tjmg = result.value.entry.priority.contributions.find((c) => c.exam.id === 'tjmg');
    expect(tjmg?.exam.targetWeight).toBe(0.088);
    expect(tjmg?.contribution).toBeCloseTo(0.088, 10);
    expect(result.value.entry.priority.priority).toBeCloseTo(0.088, 10);
  });

  it('flags a total different from 100% in the summary', async () => {
    await writeExamWeightsFor(admin, userA.id, { trt2: 720 });

    const map = await mapOf(clientA, userA.id);

    expect(map.weights.mode).toBe('custom');
    expect(map.weights.activeTotal).toBe(720);
    expect(map.weights.unweightedExamIds).toHaveLength(13);
  });
});

describe('getTopicDetail', () => {
  it('returns the entry and the exams in contribution order', async () => {
    const result = await getTopicDetail(clientA, userA.id, 'pdpj_stack');

    expect(result.ok).toBe(true);
    if (!result.ok || result.value === null) throw new Error('expected a topic');
    expect(result.value.entry.topic.id).toBe('pdpj_stack');
    expect(result.value.exams).toHaveLength(14);
    expect(result.value.exams.map((exam) => exam.id)).toEqual(
      result.value.entry.priority.contributions.map((c) => c.exam.id),
    );
  });

  it('returns null value for a topic that does not exist', async () => {
    await expect(getTopicDetail(clientA, userA.id, 'does_not_exist')).resolves.toEqual({
      ok: true,
      value: null,
    });
  });
});

describe('CA-17 — failure of the database', () => {
  const failure = { ok: false, error: 'load_failed' };
  const dbError = { code: '08006', message: 'connection failure', details: 'pg_hba.conf' };

  it.each(['topics', 'exams', 'incidences', 'v_topic_performance', 'exam_weights'])(
    'getTopicMap returns load_failed when %s fails',
    async (table) => {
      const client = createFakeTopicsClient({
        results: { [table]: { data: null, error: dbError } },
      });

      await expect(getTopicMap(client, userA.id, QUERY)).resolves.toEqual(failure);
    },
  );

  it.each(['topics', 'exams', 'incidences', 'v_topic_performance', 'exam_weights'])(
    'getTopicDetail returns load_failed when %s fails',
    async (table) => {
      const client = createFakeTopicsClient({
        results: { [table]: { data: null, error: dbError } },
      });

      await expect(getTopicDetail(client, userA.id, 'pdpj_stack')).resolves.toEqual(failure);
    },
  );

  it('does not throw when a query rejects', async () => {
    const client = createFakeTopicsClient({ throwOn: 'topics' });

    await expect(getTopicMap(client, userA.id, QUERY)).resolves.toEqual(failure);
    await expect(getTopicDetail(client, userA.id, 'pdpj_stack')).resolves.toEqual(failure);
  });
});
