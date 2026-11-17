import { randomUUID } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { inject } from 'vitest';
import type { Database, DbClient } from '../../src/shared/supabase/types.ts';
import { isLocalUrl } from '../../scripts/create-test-user.ts';
import type { CookieStore } from './cookies.ts';

type DbThemePreference = Database['public']['Enums']['theme_preference'];

export type TestUser = { id: string; email: string; password: string };

const NO_PERSISTENCE = { auth: { persistSession: false, autoRefreshToken: false } } as const;

function localEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('Local Supabase environment not loaded.');
  if (!isLocalUrl(url)) throw new Error(`Refused: ${url} is not the local Supabase.`);
  return { url, publishableKey };
}

export function createAdminClient(): DbClient {
  return createClient<Database>(localEnv().url, inject('localSecretKey'), NO_PERSISTENCE);
}

export function createPublicClient(): DbClient {
  const { url, publishableKey } = localEnv();
  return createClient<Database>(url, publishableKey, NO_PERSISTENCE);
}

export async function createUser(admin: DbClient): Promise<TestUser> {
  const email = `int-${randomUUID()}@gabarita.local`;
  const password = `password-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

export async function deleteSettings(admin: DbClient, userId: string): Promise<void> {
  const { error } = await admin.from('settings').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function setThemeInDb(
  admin: DbClient,
  userId: string,
  theme: DbThemePreference,
): Promise<void> {
  const { error } = await admin.from('settings').upsert({ user_id: userId, theme });
  if (error) throw error;
}

export async function deleteUser(admin: DbClient, userId: string): Promise<void> {
  await deleteSettings(admin, userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function signInAs(user: TestUser): Promise<DbClient> {
  const client = createPublicClient();
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;
  return client;
}

export async function signInIntoStore(store: CookieStore, user: TestUser): Promise<void> {
  const { url, publishableKey } = localEnv();
  const client = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) store.set(name, value, options);
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;
}

export async function readThemeInDb(admin: DbClient, userId: string): Promise<string | null> {
  const { data, error } = await admin
    .from('settings')
    .select('theme')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.theme ?? null;
}

export async function countSettingsRows(admin: DbClient, userId: string): Promise<number> {
  const { count, error } = await admin
    .from('settings')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}
