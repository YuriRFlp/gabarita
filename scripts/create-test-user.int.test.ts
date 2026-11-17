import { afterAll, describe, expect, inject, it } from 'vitest';
import { createAdminClient, createPublicClient, deleteSettings } from '#factories/users';
import { TEST_USER } from '../tests/e2e/data/test-user.ts';
import { createTestUser } from './create-test-user.ts';

const admin = createAdminClient();
const createdIds: string[] = [];

function localUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not loaded.');
  return url;
}

async function createThroughScript(): Promise<string> {
  const id = await createTestUser(localUrl(), inject('localSecretKey'));
  createdIds.push(id);
  return id;
}

async function idsWithTestEmail(): Promise<string[]> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.filter((user) => user.email === TEST_USER.email).map((user) => user.id);
}

afterAll(async () => {
  const current = new Set(await idsWithTestEmail());
  for (const id of createdIds) if (!current.has(id)) await deleteSettings(admin, id);
});

describe('CA-10 — test user script against the local Supabase', () => {
  it('creates the test user with a confirmed e-mail', async () => {
    const id = await createThroughScript();

    const { data, error } = await admin.auth.admin.getUserById(id);

    expect(error).toBeNull();
    expect(data.user?.email).toBe(TEST_USER.email);
    expect(data.user?.email_confirmed_at).toBeTruthy();
  });

  it('recreates the user when it already exists, leaving a single user with the test e-mail', async () => {
    const first = await createThroughScript();

    const second = await createThroughScript();

    expect(second).not.toBe(first);
    expect(await idsWithTestEmail()).toEqual([second]);
  });

  it('lets the created user sign in with the test password', async () => {
    await createThroughScript();

    const { data, error } = await createPublicClient().auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
  });
});
