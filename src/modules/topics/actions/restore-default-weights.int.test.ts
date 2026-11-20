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
  ENHANCED_FIELD,
  INITIAL_EXAM_WEIGHTS_STATE,
  RESTORED_MESSAGE,
  SAVE_FAILED_MESSAGE,
} from './exam-weights-schema';
import { restoreDefaultWeights } from './restore-default-weights';

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

beforeAll(async () => {
  userA = await createUser(admin);
  userB = await createUser(admin);
  storeA = createCookieStore();
  await signInIntoStore(storeA, userA);
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

/** With JavaScript the form sends `enhanced=1`; a plain browser POST does not. */
function call({ enhanced = true } = {}) {
  const formData = new FormData();
  if (enhanced) formData.set(ENHANCED_FIELD, '1');
  return restoreDefaultWeights(INITIAL_EXAM_WEIGHTS_STATE, formData);
}

describe('CA-28 — restoreDefaultWeights', () => {
  it('deletes only the rows of the signed-in user and confirms', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);
    await writeExamWeightsFor(admin, userB.id, { trt2: 1000 });

    const state = await call();

    expect(state).toEqual({ status: 'saved', message: RESTORED_MESSAGE });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
    expect(await readExamWeightUnitsFor(admin, userB.id)).toEqual({ trt2: 1000 });
  });

  it('succeeds when the user already has default weights', async () => {
    await expect(call()).resolves.toEqual({ status: 'saved', message: RESTORED_MESSAGE });
  });

  it('without JavaScript, restores and redirects to /settings?restored=1, leaving ?confirm=restore', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);

    await expect(call({ enhanced: false })).rejects.toMatchObject({
      destination: '/settings?restored=1#exam-weights',
    });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual({});
    expect(context.revalidatePath).toHaveBeenCalledWith('/settings');
  });

  it('without JavaScript, a failed delete answers with the error instead of redirecting', async () => {
    context.fakeClient = createFakeTablesClient({
      results: { 'exam_weights:delete': { data: null, error: DATABASE_ERROR } },
    }).client;

    await expect(call({ enhanced: false })).resolves.toMatchObject({ status: 'error' });
  });

  it('revalidates the settings page and the topics layout', async () => {
    await call();

    expect(context.revalidatePath).toHaveBeenCalledWith('/settings');
    expect(context.revalidatePath).toHaveBeenCalledWith('/topics', 'layout');
  });
});

describe('CA-18 — failure and no session', () => {
  it('returns the error state without technical detail and without revalidating when the delete fails', async () => {
    context.fakeClient = createFakeTablesClient({
      results: { 'exam_weights:delete': { data: null, error: DATABASE_ERROR } },
    }).client;

    const state = await call();

    expect(state).toEqual({
      status: 'error',
      message: SAVE_FAILED_MESSAGE,
      fieldErrors: {},
      values: {},
    });
    expect(JSON.stringify(state)).not.toContain('pg_hba');
    expect(context.revalidatePath).not.toHaveBeenCalled();
  });

  it('does not throw when the delete rejects', async () => {
    context.fakeClient = createFakeTablesClient({ throwOn: ['exam_weights:delete'] }).client;

    await expect(call()).resolves.toMatchObject({ status: 'error' });
  });

  it('redirects to /login without deleting anything when there is no session', async () => {
    await writeExamWeightsFor(admin, userA.id, S1_UNITS);
    context.store = createCookieStore();

    await expect(call()).rejects.toMatchObject({ destination: '/login' });
    expect(await readExamWeightUnitsFor(admin, userA.id)).toEqual(S1_UNITS);
  });
});
