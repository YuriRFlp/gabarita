import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DATABASE_ERROR,
  NETWORK_ERROR,
  createFakeSupabaseClient,
} from '#factories/fake-supabase-client';
import { createCookieStore, type CookieStore } from '#factories/cookies';
import {
  countSettingsRows,
  createAdminClient,
  createUser,
  deleteSettings,
  deleteUser,
  readThemeInDb,
  setThemeInDb,
  type TestUser,
} from '#factories/users';
import type { DbClient } from '@/shared/supabase';
import { login } from './login';
import {
  INITIAL_LOGIN_STATE,
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_FAILURE_MESSAGE,
} from './login-schema';

const context = vi.hoisted(() => ({
  store: undefined as CookieStore | undefined,
  fakeClient: undefined as DbClient | undefined,
  realClientRequested: vi.fn(),
}));

const Redirect = vi.hoisted(
  () =>
    class Redirect extends Error {
      constructor(readonly destination: string) {
        super(`NEXT_REDIRECT ${destination}`);
      }
    },
);

vi.mock('next/headers', () => ({
  cookies: async () => context.store,
}));

vi.mock('next/navigation', () => ({
  redirect: (destination: string) => {
    throw new Redirect(destination);
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/shared/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/supabase')>();
  return {
    ...original,
    createSupabaseServerClient: vi.fn(async () => {
      context.realClientRequested();
      return context.fakeClient ?? original.createSupabaseServerClient();
    }),
  };
});

const THEME_COOKIE = 'gb-theme';
const admin = createAdminClient();
let user: TestUser;

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return formData;
}

function credentials(extra: Record<string, string> = {}): FormData {
  return form({ email: user.email, password: user.password, ...extra });
}

async function redirectDestination(promise: Promise<unknown>): Promise<string> {
  const reason: unknown = await promise.then(
    () => undefined,
    (error: unknown) => error,
  );
  if (!(reason instanceof Redirect)) throw new Error('login did not redirect.');
  return reason.destination;
}

beforeAll(async () => {
  user = await createUser(admin);
});

afterAll(async () => {
  await deleteUser(admin, user.id);
});

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  context.store = createCookieStore();
  context.fakeClient = undefined;
  context.realClientRequested.mockClear();
  await deleteSettings(admin, user.id);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('CA-16 — validation before calling Supabase', () => {
  it('returns a field error for an invalid e-mail without calling Supabase', async () => {
    const state = await login(INITIAL_LOGIN_STATE, form({ email: 'not-an-email', password: 'x' }));

    expect(state).toEqual({
      status: 'error',
      fields: { email: 'Informe um e-mail válido.' },
      email: 'not-an-email',
    });
    expect(context.realClientRequested).not.toHaveBeenCalled();
  });

  it('returns errors on both fields when both are empty, without calling Supabase', async () => {
    const state = await login(INITIAL_LOGIN_STATE, form({ email: '', password: '' }));

    expect(state).toEqual({
      status: 'error',
      fields: { email: 'Informe um e-mail válido.', password: 'Informe a senha.' },
      email: '',
    });
    expect(context.realClientRequested).not.toHaveBeenCalled();
  });

  it('treats fields missing from the form as empty', async () => {
    const state = await login(INITIAL_LOGIN_STATE, new FormData());

    expect(state).toMatchObject({ status: 'error', email: '' });
    expect(context.realClientRequested).not.toHaveBeenCalled();
  });
});

describe('CA-15 — wrong credentials', () => {
  it('returns the generic message and keeps the e-mail when the password is wrong', async () => {
    const state = await login(INITIAL_LOGIN_STATE, credentials({ password: 'wrong-password' }));

    expect(state).toEqual({
      status: 'error',
      message: INVALID_CREDENTIALS_MESSAGE,
      email: user.email,
    });
  });

  it('returns the same generic message when the e-mail does not exist', async () => {
    const email = 'nobody-registered@gabarita.local';

    const state = await login(INITIAL_LOGIN_STATE, form({ email, password: 'anything' }));

    expect(state).toEqual({ status: 'error', message: INVALID_CREDENTIALS_MESSAGE, email });
  });
});

describe('CA-17 — unexpected Supabase failure', () => {
  it('shows the unavailability message with no technical detail when authentication fails', async () => {
    context.fakeClient = createFakeSupabaseClient({
      signIn: { data: { user: null, session: null }, error: NETWORK_ERROR },
    }).client;

    const state = await login(INITIAL_LOGIN_STATE, credentials());

    expect(state).toEqual({ status: 'error', message: LOGIN_FAILURE_MESSAGE, email: user.email });
    expect(JSON.stringify(state)).not.toContain('fetch');
  });

  it('shows the same message when Supabase is down', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:9');

    const state = await login(INITIAL_LOGIN_STATE, credentials());

    expect(state).toEqual({ status: 'error', message: LOGIN_FAILURE_MESSAGE, email: user.email });
  });

  it('neither writes the theme cookie nor redirects when authentication fails', async () => {
    context.fakeClient = createFakeSupabaseClient({
      signIn: { data: { user: null, session: null }, error: NETWORK_ERROR },
    }).client;

    await login(INITIAL_LOGIN_STATE, credentials());

    expect(context.store?.has(THEME_COOKIE)).toBe(false);
  });
});

describe('CA-19 — settings ensured on login', () => {
  it('creates the settings row with theme "system" on the first login', async () => {
    await redirectDestination(login(INITIAL_LOGIN_STATE, credentials()));

    expect(await readThemeInDb(admin, user.id)).toBe('system');
  });

  it('neither duplicates the row nor overwrites the saved theme when the row already exists', async () => {
    await setThemeInDb(admin, user.id, 'light');

    await redirectDestination(login(INITIAL_LOGIN_STATE, credentials()));

    expect(await readThemeInDb(admin, user.id)).toBe('light');
    expect(await countSettingsRows(admin, user.id)).toBe(1);
  });

  it('undoes the login and shows the CA-17 message when the insert fails', async () => {
    const { client, calls } = createFakeSupabaseClient({
      insertSettings: { data: null, error: DATABASE_ERROR },
    });
    context.fakeClient = client;

    const state = await login(INITIAL_LOGIN_STATE, credentials());

    expect(state).toEqual({ status: 'error', message: LOGIN_FAILURE_MESSAGE, email: user.email });
    expect(calls.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
    expect(context.store?.has(THEME_COOKIE)).toBe(false);
  });

  it('undoes the login and shows the CA-17 message when the read fails', async () => {
    const { client, calls } = createFakeSupabaseClient({
      readSettings: { data: null, error: DATABASE_ERROR },
    });
    context.fakeClient = client;

    const state = await login(INITIAL_LOGIN_STATE, credentials());

    expect(state).toEqual({ status: 'error', message: LOGIN_FAILURE_MESSAGE, email: user.email });
    expect(calls.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
    expect(context.store?.has(THEME_COOKIE)).toBe(false);
  });
});

describe('CA-35 — theme cache written on login', () => {
  it('writes the gb-theme cookie with the saved theme when the browser has no cookie', async () => {
    await setThemeInDb(admin, user.id, 'dark');

    await redirectDestination(login(INITIAL_LOGIN_STATE, credentials()));

    expect(context.store?.get(THEME_COOKIE)).toMatchObject({
      value: 'dark',
      options: { path: '/', httpOnly: true },
    });
  });

  it('replaces a stale gb-theme cookie with the saved theme', async () => {
    await setThemeInDb(admin, user.id, 'dark');
    context.store = createCookieStore({ [THEME_COOKIE]: 'light' });

    await redirectDestination(login(INITIAL_LOGIN_STATE, credentials()));

    expect(context.store.get(THEME_COOKIE)?.value).toBe('dark');
  });
});

describe('CA-13 and CA-14 — destination after login', () => {
  it.each([
    [undefined, '/'],
    ['/questions', '/questions'],
    ['https://site.com', '/'],
    ['//site.com', '/'],
  ])('with next=%s redirects to %s', async (next, expected) => {
    context.fakeClient = createFakeSupabaseClient().client;
    const formData = credentials(next === undefined ? {} : { next });

    const destination = await redirectDestination(login(INITIAL_LOGIN_STATE, formData));

    expect(destination).toBe(expected);
  });
});
