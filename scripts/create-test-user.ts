import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { TEST_USER } from '../tests/e2e/data/test-user.ts';
import { isLocalUrl, readLocalSupabase } from './local-supabase.ts';

export async function createTestUser(url: string, secretKey: string): Promise<string> {
  if (!isLocalUrl(url)) {
    throw new Error(`Refused: ${url} is not the local Supabase.`);
  }
  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // A single large page avoids missing the user when the local database has many test users.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((user) => user.email === TEST_USER.email);
  if (existing) {
    const { error } = await admin.auth.admin.deleteUser(existing.id);
    if (error) throw error;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url, secretKey } = readLocalSupabase();
  const id = await createTestUser(url, secretKey);
  console.log(`Test user ready: ${TEST_USER.email} (${id})`);
}
