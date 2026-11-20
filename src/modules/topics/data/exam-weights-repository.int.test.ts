import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@/shared/supabase';
import { DATABASE_ERROR } from '#factories/fake-supabase-client';
import { createFakeTablesClient } from '#factories/fake-tables-client';
import {
  S1_UNITS,
  clearExamWeightsFor,
  readExamWeightUnitsFor,
  s1Map,
  writeExamWeightsFor,
} from '#factories/exam-weights';
import {
  createAdminClient,
  createUser,
  deleteUser,
  signInAs,
  type TestUser,
} from '#factories/users';
import {
  deleteExamWeights,
  readExamCatalog,
  readExamWeights,
  saveExamWeights,
} from './exam-weights-repository';

const admin = createAdminClient();
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
  await deleteUser(admin, userA.id);
  await deleteUser(admin, userB.id);
});

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await clearExamWeightsFor(admin, userA.id);
  await clearExamWeightsFor(admin, userB.id);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CA-17 — readExamWeights', () => {
  it('returns no rows for a user without custom weights', async () => {
    await expect(readExamWeights(clientA, userA.id)).resolves.toEqual({ ok: true, value: [] });
  });

  it('returns the rows of the user as weight 0..1', async () => {
    await writeExamWeightsFor(admin, userA.id, { trt2: 400, trt3: 177 });

    const result = await readExamWeights(clientA, userA.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.value].sort((a, b) => a.examId.localeCompare(b.examId))).toEqual([
      { examId: 'trt2', weight: 0.4 },
      { examId: 'trt3', weight: 0.177 },
    ]);
  });

  it("does not return another user's rows (RLS)", async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);

    await expect(readExamWeights(clientB, userA.id)).resolves.toEqual({ ok: true, value: [] });
  });
});

describe('CA-17 — saveExamWeights', () => {
  it('writes the 14 rows of the set S1 for the user', async () => {
    const result = await saveExamWeights(clientA, userA.id, s1Map());

    expect(result).toEqual({ ok: true });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual(S1_UNITS);
    expect(await readExamWeightUnitsFor(admin, userB.id)).toEqual({});
  });

  it('updates the 14 rows when saving again with other values', async () => {
    await saveExamWeights(clientA, userA.id, s1Map());
    const other = new Map(Object.keys(S1_UNITS).map((examId) => [examId, 0]));
    other.set('trt2', 1000);

    const result = await saveExamWeights(clientA, userA.id, other);

    expect(result).toEqual({ ok: true });
    const stored = await readExamWeightUnitsFor(admin, userA.id);
    expect(Object.keys(stored)).toHaveLength(14);
    expect(stored.trt2).toBe(1000);
    expect(stored.trt3).toBe(0);
  });

  it('sends every row in one upsert call', async () => {
    const { client, writes } = createFakeTablesClient();

    await saveExamWeights(client, userA.id, s1Map());

    expect(writes['exam_weights:upsert']).toHaveLength(1);
    expect(writes['exam_weights:upsert']?.[0]).toHaveLength(14);
  });

  it('is rejected by RLS when the rows belong to another user', async () => {
    const result = await saveExamWeights(clientA, userB.id, s1Map());

    expect(result).toEqual({ ok: false, error: 'save_failed' });
    expect(await readExamWeightUnitsFor(admin, userB.id)).toEqual({});
  });

  it('writes nothing when a row is invalid (all or nothing)', async () => {
    const set = new Map([
      ['trt2', 500],
      ['trt3', 1500],
    ]);

    const result = await saveExamWeights(clientA, userA.id, set);

    expect(result).toEqual({ ok: false, error: 'save_failed' });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });
});

describe('CA-17 — deleteExamWeights', () => {
  it('deletes only the rows of the user', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);
    await writeExamWeightsFor(admin, userB.id, { trt2: 1000 });

    const result = await deleteExamWeights(clientA, userA.id);

    expect(result).toEqual({ ok: true });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
    expect(await readExamWeightUnitsFor(admin, userB.id)).toEqual({ trt2: 1000 });
  });

  it("does not delete another user's rows even when given that user id (RLS)", async () => {
    await writeExamWeightsFor(admin, userB.id, { trt2: 1000 });

    await deleteExamWeights(clientA, userB.id);

    expect(await readExamWeightUnitsFor(admin, userB.id)).toEqual({ trt2: 1000 });
  });
});

describe('readExamCatalog', () => {
  it('reads the 14 exams of the seed with board name and default weight', async () => {
    const result = await readExamCatalog(clientA);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(14);
    const trt2 = result.value.find((exam) => exam.id === 'trt2');
    expect(trt2).toMatchObject({ active: true, targetWeight: 0.05 });
    expect(trt2?.examBoardName.length).toBeGreaterThan(0);
  });
});

describe('CA-18 — failures become load_failed or save_failed', () => {
  const dbError = { ...DATABASE_ERROR };
  const loadFailed = { ok: false, error: 'load_failed' };
  const saveFailed = { ok: false, error: 'save_failed' };

  it('readExamWeights returns load_failed on a database error', async () => {
    const { client } = createFakeTablesClient({
      results: { 'exam_weights:select': { data: null, error: dbError } },
    });

    await expect(readExamWeights(client, userA.id)).resolves.toEqual(loadFailed);
  });

  it('readExamWeights returns load_failed when the query rejects', async () => {
    const { client } = createFakeTablesClient({ throwOn: ['exam_weights:select'] });

    await expect(readExamWeights(client, userA.id)).resolves.toEqual(loadFailed);
  });

  it('readExamWeights returns load_failed when the result was truncated by the row limit', async () => {
    const { client } = createFakeTablesClient({
      results: { 'exam_weights:select': { data: [], error: null, count: 1001 } },
    });

    await expect(readExamWeights(client, userA.id)).resolves.toEqual(loadFailed);
  });

  it('readExamCatalog returns load_failed on error, truncation and an exam without board', async () => {
    const failing = createFakeTablesClient({
      results: { 'exams:select': { data: null, error: dbError } },
    });
    const truncated = createFakeTablesClient({
      results: { 'exams:select': { data: [], error: null, count: 1001 } },
    });
    const noBoard = createFakeTablesClient({
      results: {
        'exams:select': {
          data: [
            {
              id: 'x',
              court: 'X',
              year: 2025,
              target_weight: 0.1,
              active: true,
              exam_boards: null,
            },
          ],
          error: null,
        },
      },
    });

    await expect(readExamCatalog(failing.client)).resolves.toEqual(loadFailed);
    await expect(readExamCatalog(truncated.client)).resolves.toEqual(loadFailed);
    await expect(readExamCatalog(noBoard.client)).resolves.toEqual(loadFailed);
  });

  it('saveExamWeights and deleteExamWeights return save_failed on error and on rejection', async () => {
    const failing = createFakeTablesClient({
      results: {
        'exam_weights:upsert': { data: null, error: dbError },
        'exam_weights:delete': { data: null, error: dbError },
      },
    });
    const rejecting = createFakeTablesClient({
      throwOn: ['exam_weights:upsert', 'exam_weights:delete'],
    });

    await expect(saveExamWeights(failing.client, userA.id, s1Map())).resolves.toEqual(saveFailed);
    await expect(deleteExamWeights(failing.client, userA.id)).resolves.toEqual(saveFailed);
    await expect(saveExamWeights(rejecting.client, userA.id, s1Map())).resolves.toEqual(saveFailed);
    await expect(deleteExamWeights(rejecting.client, userA.id)).resolves.toEqual(saveFailed);
  });

  it('does not leak technical detail in the result', async () => {
    const { client } = createFakeTablesClient({
      results: { 'exam_weights:upsert': { data: null, error: dbError } },
    });

    const result = await saveExamWeights(client, userA.id, s1Map());

    expect(JSON.stringify(result)).not.toContain('pg_hba');
  });
});
