import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@/shared/supabase';
import { DATABASE_ERROR } from '#factories/fake-supabase-client';
import { createFakeTablesClient } from '#factories/fake-tables-client';
import {
  createAdminClient,
  createUser,
  deleteSettings,
  deleteUser,
  signInAs,
  type TestUser,
} from '#factories/users';
import { getStudyTarget } from './get-study-target';

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
  await admin.from('settings').insert({ user_id: user.id });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getStudyTarget', () => {
  it('returns the saved target and the 14 active exam options', async () => {
    await admin
      .from('settings')
      .update({ target_exam_id: 'trt2', target_notice_published: true })
      .eq('user_id', user.id);

    const result = await getStudyTarget(client, user.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.target).toEqual({ targetExamId: 'trt2', targetNoticePublished: true });
    expect(result.value.examOptions).toHaveLength(14);
  });

  it.each(['settings:select', 'exams:select'])('returns load_failed when %s fails', async (key) => {
    const { client: fake } = createFakeTablesClient({
      results: { [key]: { data: null, error: DATABASE_ERROR } },
    });

    await expect(getStudyTarget(fake, user.id)).resolves.toEqual({
      ok: false,
      error: 'load_failed',
    });
  });
});
