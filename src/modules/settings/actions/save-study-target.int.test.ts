import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@/shared/supabase';
import { copyCookieStore, createCookieStore, type CookieStore } from '#factories/cookies';
import { DATABASE_ERROR } from '#factories/fake-supabase-client';
import { createFakeTablesClient } from '#factories/fake-tables-client';
import {
  createAdminClient,
  createUser,
  deleteSettings,
  deleteUser,
  signInIntoStore,
  type TestUser,
} from '#factories/users';
import { INITIAL_STUDY_TARGET_STATE } from './study-target-schema';
import { saveStudyTarget } from './save-study-target';

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
let user: TestUser;
let signedInStore: CookieStore;

function choice(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return formData;
}

async function readRow() {
  const { data, error } = await admin
    .from('settings')
    .select('target_exam_id, target_notice_published, theme')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const run = (formData: FormData) => saveStudyTarget(INITIAL_STUDY_TARGET_STATE, formData);

const FAILURE = {
  status: 'error',
  message: 'Não foi possível salvar o concurso-alvo. Tente de novo.',
};

beforeAll(async () => {
  user = await createUser(admin);
  signedInStore = createCookieStore();
  await signInIntoStore(signedInStore, user);
});

afterAll(async () => {
  await deleteUser(admin, user.id);
});

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  context.store = copyCookieStore(signedInStore);
  context.fakeClient = undefined;
  context.revalidatePath.mockClear();
  await deleteSettings(admin, user.id);
  const { error } = await admin.from('settings').insert({ user_id: user.id });
  if (error) throw error;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CA-29 — saving the target exam', () => {
  it('saves trt2 with the notice published and confirms', async () => {
    const state = await run(choice({ targetExamId: 'trt2', targetNoticePublished: 'on' }));

    expect(state).toEqual({ status: 'saved', message: 'Concurso-alvo salvo.' });
    expect(await readRow()).toMatchObject({
      target_exam_id: 'trt2',
      target_notice_published: true,
    });
  });

  it('saves trt2 without the box as not published', async () => {
    await run(choice({ targetExamId: 'trt2', targetNoticePublished: 'on' }));

    await run(choice({ targetExamId: 'trt2' }));

    expect(await readRow()).toMatchObject({
      target_exam_id: 'trt2',
      target_notice_published: false,
    });
  });

  it('saves "Nenhum" without the box as no target', async () => {
    await run(choice({ targetExamId: 'trt2' }));

    const state = await run(choice({ targetExamId: '' }));

    expect(state).toMatchObject({ status: 'saved' });
    expect(await readRow()).toMatchObject({
      target_exam_id: null,
      target_notice_published: false,
    });
  });

  it('does not change the saved theme or any exam weight', async () => {
    await admin.from('settings').update({ theme: 'dark' }).eq('user_id', user.id);

    await run(choice({ targetExamId: 'trt3' }));

    expect(await readRow()).toMatchObject({ theme: 'dark' });
    const { count } = await admin
      .from('exam_weights')
      .select('exam_id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    expect(count).toBe(0);
  });

  it('revalidates the settings page', async () => {
    await run(choice({ targetExamId: 'trt2' }));

    expect(context.revalidatePath).toHaveBeenCalledWith('/settings');
  });
});

describe('CA-10 — invalid combinations write nothing', () => {
  it('rejects the notice without a target exam with the dedicated message', async () => {
    await run(choice({ targetExamId: 'trt2' }));
    context.revalidatePath.mockClear();

    const state = await run(choice({ targetExamId: '', targetNoticePublished: 'on' }));

    expect(state).toEqual({
      status: 'error',
      message: 'Escolha o concurso-alvo antes de marcar o edital como publicado.',
    });
    expect(await readRow()).toMatchObject({ target_exam_id: 'trt2' });
    expect(context.revalidatePath).not.toHaveBeenCalledWith('/settings');
  });

  it.each(['nope', 'TRT2', 'trt-2'])(
    'rejects the unknown or malformed exam id "%s"',
    async (id) => {
      const state = await run(choice({ targetExamId: id }));

      expect(state).toEqual(FAILURE);
      expect(await readRow()).toMatchObject({ target_exam_id: null });
    },
  );

  it('rejects an inactive exam', async () => {
    const { error } = await admin.from('exams').update({ active: false }).eq('id', 'tjsc');
    if (error) throw error;
    try {
      const state = await run(choice({ targetExamId: 'tjsc' }));

      expect(state).toEqual(FAILURE);
      expect(await readRow()).toMatchObject({ target_exam_id: null });
    } finally {
      await admin.from('exams').update({ active: true }).eq('id', 'tjsc');
    }
  });

  it('rejects a submission without the targetExamId field', async () => {
    await expect(run(choice({}))).resolves.toEqual(FAILURE);
  });
});

describe('CA-18 — failures and no session', () => {
  it('returns the failure message when the update affects 0 rows', async () => {
    await deleteSettings(admin, user.id);

    await expect(run(choice({ targetExamId: 'trt2' }))).resolves.toEqual(FAILURE);
    expect(context.revalidatePath).not.toHaveBeenCalled();
  });

  it('returns the failure message without technical detail when the database fails', async () => {
    context.fakeClient = createFakeTablesClient({
      results: {
        'exams:select': {
          data: [{ id: 'trt2', court: 'TRT-2 (SP)', year: 2025, exam_boards: { name: 'FCC' } }],
          error: null,
        },
        'settings:update': { data: null, error: DATABASE_ERROR },
      },
    }).client;

    const state = await run(choice({ targetExamId: 'trt2' }));

    expect(state).toEqual(FAILURE);
    expect(JSON.stringify(state)).not.toContain('pg_hba');
  });

  it('returns the failure message when reading the exam options fails', async () => {
    context.fakeClient = createFakeTablesClient({
      results: { 'exams:select': { data: null, error: DATABASE_ERROR } },
    }).client;

    await expect(run(choice({ targetExamId: 'trt2' }))).resolves.toEqual(FAILURE);
  });

  it('does not throw when a query rejects', async () => {
    context.fakeClient = createFakeTablesClient({ throwOn: ['exams:select'] }).client;

    await expect(run(choice({ targetExamId: 'trt2' }))).resolves.toEqual(FAILURE);
  });

  it('redirects to /login without writing when there is no session', async () => {
    context.store = createCookieStore();

    await expect(run(choice({ targetExamId: 'trt2' }))).rejects.toMatchObject({
      destination: '/login',
    });
    expect(await readRow()).toMatchObject({ target_exam_id: null });
  });
});
