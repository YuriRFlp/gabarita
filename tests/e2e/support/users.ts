import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { isLocalUrl, readLocalSupabase } from '../../../scripts/create-test-user.ts';

export type DisposableUser = { id: string; email: string; password: string };

let localSupabase: ReturnType<typeof readLocalSupabase> | undefined;

function adminClient() {
  localSupabase ??= readLocalSupabase();
  const { url, secretKey } = localSupabase;
  if (!isLocalUrl(url)) throw new Error(`Refused: ${url} is not the local Supabase.`);
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Tests that log out or change state use their own user so other tests never depend on it. */
export async function createDisposableUser(): Promise<DisposableUser> {
  const email = `disposable-${randomUUID()}@gabarita.local`;
  const password = `password-${randomUUID()}`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

export async function deleteDisposableUser(user: DisposableUser): Promise<void> {
  const admin = adminClient();
  // settings has no foreign key to auth.users, so its row is deleted separately.
  const { error: settingsError } = await admin.from('settings').delete().eq('user_id', user.id);
  if (settingsError) throw settingsError;
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
}
