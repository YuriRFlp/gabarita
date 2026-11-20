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
import { DATABASE_ERROR } from '#factories/fake-supabase-client';
import { createFakeTablesClient } from '#factories/fake-tables-client';
import {
  ensureSettings,
  readActiveExamOptions,
  readSavedTheme,
  readStudyTarget,
  saveStudyTarget,
  saveTheme,
} from './settings-repository';

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

describe('CA-17 — study target', () => {
  it('reads no target and no notice for a fresh settings row', async () => {
    await ensureSettings(client, user.id);

    await expect(readStudyTarget(client, user.id)).resolves.toEqual({
      ok: true,
      value: { targetExamId: null, targetNoticePublished: false },
    });
  });

  it('saves trt2 with the notice published and reads it back', async () => {
    await ensureSettings(client, user.id);

    const saved = await saveStudyTarget(client, user.id, {
      targetExamId: 'trt2',
      targetNoticePublished: true,
    });

    expect(saved).toEqual({ ok: true });
    await expect(readStudyTarget(client, user.id)).resolves.toEqual({
      ok: true,
      value: { targetExamId: 'trt2', targetNoticePublished: true },
    });
  });

  it('keeps the theme when saving the target', async () => {
    await ensureSettings(client, user.id);
    await saveTheme(client, user.id, 'dark');

    await saveStudyTarget(client, user.id, { targetExamId: 'trt3', targetNoticePublished: false });

    expect(await readThemeInDb(admin, user.id)).toBe('dark');
  });

  it('clears the target back to "Nenhum"', async () => {
    await ensureSettings(client, user.id);
    await saveStudyTarget(client, user.id, { targetExamId: 'trt2', targetNoticePublished: true });

    await saveStudyTarget(client, user.id, { targetExamId: null, targetNoticePublished: false });

    await expect(readStudyTarget(client, user.id)).resolves.toEqual({
      ok: true,
      value: { targetExamId: null, targetNoticePublished: false },
    });
  });

  it('fails when the user has no settings row (zero updated rows)', async () => {
    const saved = await saveStudyTarget(client, user.id, {
      targetExamId: 'trt2',
      targetNoticePublished: false,
    });

    expect(saved).toEqual({ ok: false, error: 'db_failure' });
  });

  it('fails, without touching the row, when the notice is published without a target (check constraint)', async () => {
    await ensureSettings(client, user.id);

    const saved = await saveStudyTarget(client, user.id, {
      targetExamId: null,
      targetNoticePublished: true,
    });

    expect(saved).toEqual({ ok: false, error: 'db_failure' });
    await expect(readStudyTarget(client, user.id)).resolves.toMatchObject({
      value: { targetNoticePublished: false },
    });
  });

  it('fails when the target is an exam that does not exist (foreign key)', async () => {
    await ensureSettings(client, user.id);

    const saved = await saveStudyTarget(client, user.id, {
      targetExamId: 'nope',
      targetNoticePublished: false,
    });

    expect(saved).toEqual({ ok: false, error: 'db_failure' });
  });

  it('reads the active exams of the seed, labelled and in court order', async () => {
    const result = await readActiveExamOptions(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(14);
    const trt2 = result.value.find((option) => option.id === 'trt2');
    expect(trt2?.label).toMatch(/^TRT-2 \(SP\) · .+ \d{4}$/);
    const labels = result.value.map((option) => option.label);
    expect(labels).toEqual([...labels].sort(new Intl.Collator('pt-BR', { numeric: true }).compare));
  });
});

describe('CA-18 — study target failures', () => {
  it('readStudyTarget returns load_failed on error and on rejection', async () => {
    const failing = createFakeTablesClient({
      results: { 'settings:select': { data: null, error: DATABASE_ERROR } },
    });
    const rejecting = createFakeTablesClient({ throwOn: ['settings:select'] });

    const expected = { ok: false, error: 'load_failed' };
    await expect(readStudyTarget(failing.client, user.id)).resolves.toEqual(expected);
    await expect(readStudyTarget(rejecting.client, user.id)).resolves.toEqual(expected);
  });

  it('readActiveExamOptions returns load_failed on error, truncation, rejection and a missing board', async () => {
    const expected = { ok: false, error: 'load_failed' };
    const cases = [
      createFakeTablesClient({
        results: { 'exams:select': { data: null, error: DATABASE_ERROR } },
      }),
      createFakeTablesClient({
        results: { 'exams:select': { data: [], error: null, count: 1001 } },
      }),
      createFakeTablesClient({ throwOn: ['exams:select'] }),
      createFakeTablesClient({
        results: {
          'exams:select': {
            data: [{ id: 'x', court: 'X', year: 2025, exam_boards: null }],
            error: null,
          },
        },
      }),
    ];

    for (const { client: fake } of cases) {
      await expect(readActiveExamOptions(fake)).resolves.toEqual(expected);
    }
  });

  it('saveStudyTarget returns db_failure on error, on rejection and without technical detail', async () => {
    const failing = createFakeTablesClient({
      results: { 'settings:update': { data: null, error: DATABASE_ERROR } },
    });
    const rejecting = createFakeTablesClient({ throwOn: ['settings:update'] });
    const target = { targetExamId: 'trt2', targetNoticePublished: false };

    const first = await saveStudyTarget(failing.client, user.id, target);
    const second = await saveStudyTarget(rejecting.client, user.id, target);

    expect(first).toEqual({ ok: false, error: 'db_failure' });
    expect(second).toEqual({ ok: false, error: 'db_failure' });
    expect(JSON.stringify(first)).not.toContain('pg_hba');
  });
});
