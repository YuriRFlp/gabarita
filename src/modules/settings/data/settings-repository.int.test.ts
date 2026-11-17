import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@/shared/supabase';
import {
  countSettingsRows,
  createAdminClient,
  createUser,
  deleteSettings,
  deleteUser,
  readThemeInDb,
  setThemeInDb,
  signInAs,
  type TestUser,
} from '#factories/users';
import { ensureSettings, readSavedTheme, saveTheme } from './settings-repository';

const admin = createAdminClient();
let user: TestUser;
let client: DbClient;

beforeAll(async () => {
  user = await createUser(admin);
  client = await signInAs(user);
});

afterAll(async () => {
  await deleteUser(admin, user.id);
});

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await deleteSettings(admin, user.id);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CA-19 — ensureSettings', () => {
  it('creates the row with theme "system" when the user has no settings yet', async () => {
    const result = await ensureSettings(client, user.id);

    expect(result).toEqual({ ok: true, theme: 'system' });
    expect(await readThemeInDb(admin, user.id)).toBe('system');
  });

  it('is idempotent: calling it again neither fails nor duplicates the row', async () => {
    await ensureSettings(client, user.id);

    const result = await ensureSettings(client, user.id);

    expect(result).toEqual({ ok: true, theme: 'system' });
    expect(await countSettingsRows(admin, user.id)).toBe(1);
  });

  it('does not overwrite the saved theme and returns it', async () => {
    await ensureSettings(client, user.id);
    await saveTheme(client, user.id, 'dark');

    const result = await ensureSettings(client, user.id);

    expect(result).toEqual({ ok: true, theme: 'dark' });
    expect(await readThemeInDb(admin, user.id)).toBe('dark');
  });

  it('fails when the database refuses the insert (another user row, blocked by RLS)', async () => {
    const other = await createUser(admin);
    try {
      const result = await ensureSettings(client, other.id);

      expect(result).toEqual({ ok: false, error: 'db_failure' });
      expect(await countSettingsRows(admin, other.id)).toBe(0);
    } finally {
      await deleteUser(admin, other.id);
    }
  });
});

describe('readSavedTheme', () => {
  it('returns null when the user has no settings row', async () => {
    expect(await readSavedTheme(client, user.id)).toBeNull();
  });

  it('returns the theme stored in the database', async () => {
    await ensureSettings(client, user.id);
    await saveTheme(client, user.id, 'light');

    expect(await readSavedTheme(client, user.id)).toBe('light');
  });

  it('does not read another user theme (RLS)', async () => {
    const other = await createUser(admin);
    try {
      await setThemeInDb(admin, other.id, 'dark');

      expect(await readSavedTheme(client, other.id)).toBeNull();
    } finally {
      await deleteUser(admin, other.id);
    }
  });
});

describe('CA-25 — saveTheme', () => {
  it.each(['system', 'light', 'dark'] as const)('stores "%s" in settings.theme', async (theme) => {
    await ensureSettings(client, user.id);

    const result = await saveTheme(client, user.id, theme);

    expect(result).toEqual({ ok: true });
    expect(await readThemeInDb(admin, user.id)).toBe(theme);
  });
});

describe('CA-38 — saveTheme with no updated row', () => {
  it('fails when the user has no settings row', async () => {
    const result = await saveTheme(client, user.id, 'dark');

    expect(result).toEqual({ ok: false, error: 'db_failure' });
    expect(await countSettingsRows(admin, user.id)).toBe(0);
  });

  it('fails and leaves another user theme untouched (RLS)', async () => {
    const other = await createUser(admin);
    try {
      await setThemeInDb(admin, other.id, 'light');

      const result = await saveTheme(client, other.id, 'dark');

      expect(result).toEqual({ ok: false, error: 'db_failure' });
      expect(await readThemeInDb(admin, other.id)).toBe('light');
    } finally {
      await deleteUser(admin, other.id);
    }
  });
});
