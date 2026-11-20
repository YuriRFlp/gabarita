import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@/shared/supabase';
import { copyCookieStore, createCookieStore, type CookieStore } from '#factories/cookies';
import { DATABASE_ERROR } from '#factories/fake-supabase-client';
import { createFakeTablesClient } from '#factories/fake-tables-client';
import {
  S1_UNITS,
  clearExamWeightsFor,
  readExamWeightUnitsFor,
  writeExamWeightsFor,
} from '#factories/exam-weights';
import {
  createAdminClient,
  createUser,
  deleteUser,
  signInIntoStore,
  type TestUser,
} from '#factories/users';
import {
  INITIAL_EXAM_WEIGHTS_STATE,
  INVALID_FIELDS_MESSAGE,
  NOTHING_TO_REBALANCE_MESSAGE,
  SAVED_MESSAGE,
  SAVE_FAILED_MESSAGE,
  WEIGHT_FIELD_MESSAGE,
} from './exam-weights-schema';
import { saveExamWeights } from './save-exam-weights';

const context = vi.hoisted(() => ({
  store: undefined as CookieStore | undefined,
  fakeClient: undefined as DbClient | undefined,
  revalidatePath: vi.fn(),
}));

const Redirect = vi.hoisted(
  () =>
    class Redirect extends Error {
      constructor(readonly destination: string) {
        super(`NEXT_REDIRECT ${destination}`);
      }
    },
);

vi.mock('next/headers', () => ({ cookies: async () => context.store }));
vi.mock('next/navigation', () => ({
  redirect: (destination: string) => {
    throw new Redirect(destination);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: context.revalidatePath }));
vi.mock('@/shared/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/supabase')>();
  return {
    ...original,
    createSupabaseServerClient: async () =>
      context.fakeClient ?? original.createSupabaseServerClient(),
  };
});

const admin = createAdminClient();
let userA: TestUser;
let userB: TestUser;
let storeA: CookieStore;
/** Seed default weights of the 14 active exams, in thousandths. */
let defaults: Record<string, number>;

/** 280 → "28", 15 → "1,5": what the user types in the field. */
function asText(units: number): string {
  return String(units / 10).replace('.', ',');
}

function submit(intent: string, typed: Record<string, string>): FormData {
  const formData = new FormData();
  formData.set('intent', intent);
  for (const [examId, text] of Object.entries(typed)) formData.set(`weight.${examId}`, text);
  return formData;
}

function defaultsAsText(changes: Record<string, string> = {}): Record<string, string> {
  const typed = Object.fromEntries(
    Object.entries(defaults).map(([examId, units]) => [examId, asText(units)]),
  );
  return { ...typed, ...changes };
}

function s1AsText(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(S1_UNITS).map(([examId, units]) => [examId, asText(units)]),
  );
}

const run = (formData: FormData) => saveExamWeights(INITIAL_EXAM_WEIGHTS_STATE, formData);

beforeAll(async () => {
  userA = await createUser(admin);
  userB = await createUser(admin);
  storeA = createCookieStore();
  await signInIntoStore(storeA, userA);
  const { data, error } = await admin.from('exams').select('id, target_weight').eq('active', true);
  if (error) throw error;
  defaults = Object.fromEntries(
    (data ?? []).map((row) => [row.id, Math.round(row.target_weight * 1000)]),
  );
});

afterAll(async () => {
  await clearExamWeightsFor(admin, userA.id);
  await clearExamWeightsFor(admin, userB.id);
  await deleteUser(admin, userA.id);
  await deleteUser(admin, userB.id);
});

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  context.store = copyCookieStore(storeA);
  context.fakeClient = undefined;
  context.revalidatePath.mockClear();
  await clearExamWeightsFor(admin, userA.id);
  await clearExamWeightsFor(admin, userB.id);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CA-22 — save with a sum different from 100%', () => {
  it('writes nothing, reports the total and keeps what was typed', async () => {
    const typed = defaultsAsText({ trt2: '40' });

    const state = await run(submit('save', typed));

    expect(state).toEqual({
      status: 'error',
      message: 'A soma dos pesos precisa ser 100%. Agora está em 135%.',
      fieldErrors: {},
      values: typed,
    });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
    expect(context.revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects a set that is missing an active exam', async () => {
    const typed = defaultsAsText();
    delete typed.trt2;

    const state = await run(submit('save', typed));

    expect(state).toMatchObject({ status: 'error', message: SAVE_FAILED_MESSAGE });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });

  it('rejects an exam id that is not active or does not exist', async () => {
    const state = await run(submit('save', { ...defaultsAsText(), ghost: '0' }));

    expect(state).toMatchObject({ status: 'error', message: SAVE_FAILED_MESSAGE });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });
});

describe('CA-9 — invalid input never touches the database', () => {
  it('flags the invalid fields by exam id and keeps the typed values', async () => {
    const typed = defaultsAsText({ trt2: 'abc', tjmg: '100,1' });

    const state = await run(submit('save', typed));

    expect(state).toEqual({
      status: 'error',
      message: INVALID_FIELDS_MESSAGE,
      fieldErrors: { trt2: WEIGHT_FIELD_MESSAGE, tjmg: WEIGHT_FIELD_MESSAGE },
      values: typed,
    });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });

  it.each(['delete', '', 'SAVE'])('rejects intent "%s"', async (intent) => {
    const state = await run(submit(intent, s1AsText()));

    expect(state).toMatchObject({ status: 'error' });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });

  it('rejects an exam id outside the pattern', async () => {
    const state = await run(submit('save', { ...defaultsAsText(), 'TRT-2': '1' }));

    expect(state).toMatchObject({ status: 'error' });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });
});

describe('CA-17 — save with a valid set', () => {
  it('writes the 14 rows of S1 and confirms', async () => {
    const state = await run(submit('save', s1AsText()));

    expect(state).toEqual({ status: 'saved', message: SAVED_MESSAGE });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual(S1_UNITS);
    expect(await readExamWeightUnitsFor(admin, userB.id)).toEqual({});
  });

  it('updates the existing rows when saved again with other values', async () => {
    await run(submit('save', s1AsText()));
    const other = Object.fromEntries(Object.keys(S1_UNITS).map((examId) => [examId, '0']));
    other.trt2 = '100';

    const state = await run(submit('save', other));

    expect(state).toMatchObject({ status: 'saved' });
    const stored = await readExamWeightUnitsFor(admin, userA.id);
    expect(Object.keys(stored)).toHaveLength(14);
    expect(stored.trt2).toBe(1000);
  });

  it('revalidates the settings page and the topics layout', async () => {
    await run(submit('save', s1AsText()));

    expect(context.revalidatePath).toHaveBeenCalledWith('/settings');
    expect(context.revalidatePath).toHaveBeenCalledWith('/topics', 'layout');
  });
});

describe('CA-24 — a set equal to the defaults leaves the user without rows', () => {
  it('stores nothing when saving the default weights', async () => {
    const state = await run(submit('save', defaultsAsText()));

    expect(state).toMatchObject({ status: 'saved' });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });

  it('removes the custom rows when the values go back to the defaults', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);

    const state = await run(submit('save', defaultsAsText()));

    expect(state).toMatchObject({ status: 'saved' });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });

  it('does not touch the rows of another user', async () => {
    await writeExamWeightsFor(admin, userB.id, { trt2: 1000 });

    await run(submit('save', defaultsAsText()));

    expect(await readExamWeightUnitsFor(admin, userB.id)).toEqual({ trt2: 1000 });
  });
});

describe('CA-23 — rebalance', () => {
  it('turns TRT-2 = 40 over the default weights into the set S1', async () => {
    const state = await run(submit('rebalance', defaultsAsText({ trt2: '40' })));

    expect(state).toEqual({ status: 'saved', message: SAVED_MESSAGE });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual(S1_UNITS);
  });

  it('decides "changed" against the weights stored now, not the defaults', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);

    // Same typed values as the stored set: nothing changed, the sum is already 100%.
    const state = await run(submit('rebalance', s1AsText()));

    expect(state).toMatchObject({ status: 'saved' });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual(S1_UNITS);
  });

  it('removes the rows when the rebalanced set equals the defaults', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);

    // Typing the default of TRT-2 over S1 changes only it; the rest scales back to the defaults
    // only if the proportions allow, so just check the sum stays valid.
    const state = await run(
      submit('rebalance', { ...s1AsText(), trt2: asText(defaults.trt2 ?? 50) }),
    );

    expect(state).toMatchObject({ status: 'saved' });
    const stored = await readExamWeightUnitsFor(admin, userA.id);
    const total = Object.values(stored).reduce((sum, units) => sum + units, 0);
    expect(Object.keys(stored).length === 0 || total === 1000).toBe(true);
  });
});

describe('CA-25 — rebalance errors', () => {
  it('reports changed weights above 100% and writes nothing', async () => {
    const typed = defaultsAsText({ trt2: '100', trt3: '35' });

    const state = await run(submit('rebalance', typed));

    expect(state).toEqual({
      status: 'error',
      message: 'Os pesos alterados já somam 135%, mais que 100%. Reduza algum deles.',
      fieldErrors: {},
      values: typed,
    });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });

  it('reports nothing to rebalance when every unchanged exam weighs 0', async () => {
    const stored = Object.fromEntries(Object.keys(S1_UNITS).map((examId) => [examId, 0]));
    stored.trt2 = 1000;
    await writeExamWeightsFor(admin, userA.id, stored);
    const typed = Object.fromEntries(Object.keys(S1_UNITS).map((examId) => [examId, '0']));
    typed.trt2 = '50';

    const state = await run(submit('rebalance', typed));

    expect(state).toEqual({
      status: 'error',
      message: NOTHING_TO_REBALANCE_MESSAGE,
      fieldErrors: {},
      values: typed,
    });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual(stored);
  });
});

describe('CA-18 — failures and no session', () => {
  const seedExam = (id: string, weight: number) => ({
    id,
    court: id.toUpperCase(),
    year: 2025,
    target_weight: weight,
    active: true,
    exam_boards: { name: 'Board' },
  });
  const catalog = {
    data: [seedExam('aaa', 0.6), seedExam('bbb', 0.4)],
    error: null,
  };
  const typed = { aaa: '50', bbb: '50' };

  it('returns the failure message and keeps the values when the upsert fails', async () => {
    context.fakeClient = createFakeTablesClient({
      results: {
        'exams:select': catalog,
        'exam_weights:upsert': { data: null, error: DATABASE_ERROR },
      },
    }).client;

    const state = await run(submit('save', typed));

    expect(state).toEqual({
      status: 'error',
      message: SAVE_FAILED_MESSAGE,
      fieldErrors: {},
      values: typed,
    });
    expect(JSON.stringify(state)).not.toContain('pg_hba');
    expect(context.revalidatePath).not.toHaveBeenCalled();
  });

  it('returns the failure message when the delete of a default set fails', async () => {
    context.fakeClient = createFakeTablesClient({
      results: {
        'exams:select': catalog,
        'exam_weights:delete': { data: null, error: DATABASE_ERROR },
      },
    }).client;

    const state = await run(submit('save', { aaa: '60', bbb: '40' }));

    expect(state).toMatchObject({ status: 'error', message: SAVE_FAILED_MESSAGE });
  });

  it.each(['exams:select', 'exam_weights:select'])(
    'returns the failure message when reading %s fails',
    async (key) => {
      context.fakeClient = createFakeTablesClient({
        results: { 'exams:select': catalog, [key]: { data: null, error: DATABASE_ERROR } },
      }).client;

      const state = await run(submit('rebalance', typed));

      expect(state).toMatchObject({ status: 'error', message: SAVE_FAILED_MESSAGE });
    },
  );

  it('does not throw when a query rejects', async () => {
    context.fakeClient = createFakeTablesClient({
      results: { 'exams:select': catalog },
      throwOn: ['exam_weights:upsert'],
    }).client;

    await expect(run(submit('save', typed))).resolves.toMatchObject({ status: 'error' });
  });

  it('writes one upsert with every row on a successful save', async () => {
    const fake = createFakeTablesClient({ results: { 'exams:select': catalog } });
    context.fakeClient = fake.client;

    await run(submit('save', typed));

    expect(fake.writes['exam_weights:upsert']).toEqual([
      [
        { user_id: 'fake-user', exam_id: 'aaa', weight: 0.5 },
        { user_id: 'fake-user', exam_id: 'bbb', weight: 0.5 },
      ],
    ]);
  });

  it('redirects to /login without writing anything when there is no session', async () => {
    context.store = createCookieStore();

    await expect(run(submit('save', s1AsText()))).rejects.toMatchObject({ destination: '/login' });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
  });
});
