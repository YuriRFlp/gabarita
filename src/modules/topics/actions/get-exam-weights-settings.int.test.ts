import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@/shared/supabase';
import { DATABASE_ERROR } from '#factories/fake-supabase-client';
import { createFakeTablesClient } from '#factories/fake-tables-client';
import { clearExamWeightsFor, writeExamWeightsFor, S1_UNITS } from '#factories/exam-weights';
import {
  createAdminClient,
  createUser,
  deleteUser,
  signInAs,
  type TestUser,
} from '#factories/users';
import { getExamWeightsSettings } from './get-exam-weights-settings';

const admin = createAdminClient();
let user: TestUser;
let client: DbClient;

beforeAll(async () => {
  user = await createUser(admin);
  client = await signInAs(user);
});

afterAll(async () => {
  await clearExamWeightsFor(admin, user.id);
  await deleteUser(admin, user.id);
});

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await clearExamWeightsFor(admin, user.id);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getExamWeightsSettings', () => {
  it('shows the 14 active exams in default mode with a 100% total for a user without rows', async () => {
    const result = await getExamWeightsSettings(client, user.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.active).toHaveLength(14);
    expect(result.value.inactive).toEqual([]);
    expect(result.value.summary).toEqual({
      mode: 'default',
      activeTotal: 1000,
      unweightedExamIds: [],
      fingerprint: null,
    });
    expect(result.value.active[0]?.exam.id).toBe('trt3');
    expect(result.value.active.every((row) => row.weight === row.defaultWeight)).toBe(true);
  });

  it('keeps the order by default weight and shows the S1 weights in custom mode', async () => {
    await writeExamWeightsFor(admin, user.id, S1_UNITS);

    const result = await getExamWeightsSettings(client, user.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.active[0]?.exam.id).toBe('trt3');
    const trt2 = result.value.active.find((row) => row.exam.id === 'trt2');
    expect(trt2).toMatchObject({ defaultWeight: 0.05, weight: 0.4 });
    expect(result.value.summary).toEqual({
      mode: 'custom',
      activeTotal: 1000,
      unweightedExamIds: [],
      fingerprint: expect.any(String),
    });
  });

  it('marks an active exam without a row as unweighted in custom mode', async () => {
    await writeExamWeightsFor(admin, user.id, { trt2: 1000 });

    const result = await getExamWeightsSettings(client, user.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.activeTotal).toBe(1000);
    expect(result.value.summary.unweightedExamIds).toHaveLength(13);
    expect(result.value.active.find((row) => row.exam.id === 'trt3')?.weight).toBeNull();
  });

  it.each(['exams:select', 'exam_weights:select'])(
    'returns load_failed when %s fails',
    async (key) => {
      const { client: fake } = createFakeTablesClient({
        results: { [key]: { data: null, error: DATABASE_ERROR } },
      });

      await expect(getExamWeightsSettings(fake, user.id)).resolves.toEqual({
        ok: false,
        error: 'load_failed',
      });
    },
  );
});
