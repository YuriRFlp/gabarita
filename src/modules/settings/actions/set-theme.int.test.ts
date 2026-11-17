import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATABASE_ERROR, createFakeSupabaseClient } from '#factories/fake-supabase-client';
import { copyCookieStore, createCookieStore, type CookieStore } from '#factories/cookies';
import {
  createAdminClient,
  createUser,
  deleteSettings,
  deleteUser,
  readThemeInDb,
  setThemeInDb,
  signInIntoStore,
  type TestUser,
} from '#factories/users';
import type { DbClient } from '@/shared/supabase';
import { setTheme } from './set-theme';
import { INITIAL_SET_THEME_STATE, THEME_FAILURE_MESSAGE } from './set-theme-schema';

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

vi.mock('next/headers', () => ({
  cookies: async () => context.store,
}));

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

const THEME_COOKIE = 'gb-theme';
const admin = createAdminClient();
let user: TestUser;
let signedInStore: CookieStore;

function choice(theme?: string): FormData {
  const formData = new FormData();
  if (theme !== undefined) formData.set('theme', theme);
  return formData;
}

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
  await setThemeInDb(admin, user.id, 'system');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CA-25 — setTheme writes database and cookie', () => {
  it.each([
    ['dark', 'system'],
    ['light', 'system'],
    ['system', 'dark'],
  ] as const)('choosing "%s" (saved: %s) stores it in settings.theme', async (theme, previous) => {
    await setThemeInDb(admin, user.id, previous);

    const state = await setTheme(INITIAL_SET_THEME_STATE, choice(theme));

    expect(state).toEqual(INITIAL_SET_THEME_STATE);
    expect(await readThemeInDb(admin, user.id)).toBe(theme);
  });

  it.each(['dark', 'light', 'system'])(
    'choosing "%s" writes the same value to the gb-theme cookie',
    async (theme) => {
      await setTheme(INITIAL_SET_THEME_STATE, choice(theme));

      expect(context.store?.get(THEME_COOKIE)).toMatchObject({
        value: theme,
        options: { path: '/', httpOnly: true },
      });
    },
  );

  it('revalidates the layout so the server renders the new data-theme', async () => {
    await setTheme(INITIAL_SET_THEME_STATE, choice('dark'));

    expect(context.revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
});

describe('CA-38 — failure to save the theme', () => {
  it('returns the notice and leaves the cookie untouched when the user has no settings row', async () => {
    await deleteSettings(admin, user.id);
    context.store = copyCookieStore(signedInStore, { [THEME_COOKIE]: 'light' });

    const state = await setTheme(INITIAL_SET_THEME_STATE, choice('dark'));

    expect(state).toEqual({ status: 'error', message: THEME_FAILURE_MESSAGE });
    expect(context.store.get(THEME_COOKIE)?.value).toBe('light');
    expect(await readThemeInDb(admin, user.id)).toBeNull();
  });

  it('returns the notice with no technical detail and leaves the cookie untouched when the database fails', async () => {
    context.fakeClient = createFakeSupabaseClient({
      updateSettings: { data: null, error: DATABASE_ERROR },
    }).client;
    context.store = createCookieStore({ [THEME_COOKIE]: 'light' });

    const state = await setTheme(INITIAL_SET_THEME_STATE, choice('dark'));

    expect(state).toEqual({ status: 'error', message: THEME_FAILURE_MESSAGE });
    expect(context.store.get(THEME_COOKIE)?.value).toBe('light');
  });

  it('does not revalidate the layout when saving fails', async () => {
    await deleteSettings(admin, user.id);

    await setTheme(INITIAL_SET_THEME_STATE, choice('dark'));

    expect(context.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('CA-39 — invalid submission or no session', () => {
  it.each([['blue'], ['DARK'], ['escuro'], [''], [undefined]])(
    'rejects theme %s without writing to the database or the cookie',
    async (theme) => {
      await setThemeInDb(admin, user.id, 'light');

      const state = await setTheme(INITIAL_SET_THEME_STATE, choice(theme));

      expect(state).toEqual({ status: 'error', message: THEME_FAILURE_MESSAGE });
      expect(await readThemeInDb(admin, user.id)).toBe('light');
      expect(context.store?.has(THEME_COOKIE)).toBe(false);
    },
  );

  it('redirects to /login without writing anything when there is no session', async () => {
    context.store = createCookieStore();

    await expect(setTheme(INITIAL_SET_THEME_STATE, choice('dark'))).rejects.toMatchObject({
      destination: '/login',
    });
    expect(await readThemeInDb(admin, user.id)).toBe('system');
    expect(context.store.has(THEME_COOKIE)).toBe(false);
  });

  it('redirects to /login without writing anything when the session cookie is tampered with', async () => {
    const tampered = Object.fromEntries(
      signedInStore.getAll().map((cookie) => [cookie.name, `${cookie.value}tampered`]),
    );
    context.store = createCookieStore(tampered);

    await expect(setTheme(INITIAL_SET_THEME_STATE, choice('dark'))).rejects.toMatchObject({
      destination: '/login',
    });
    expect(await readThemeInDb(admin, user.id)).toBe('system');
    expect(context.store.has(THEME_COOKIE)).toBe(false);
  });
});
