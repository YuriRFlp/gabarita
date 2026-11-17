import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TEST_USER } from '../tests/e2e/data/test-user.ts';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The secret key grants full database access, so the script only accepts the local Supabase. */
export function isLocalUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

const statusSchema = z.object({
  API_URL: z.string(),
  SERVICE_ROLE_KEY: z.string().optional(),
  SECRET_KEY: z.string().optional(),
});

// The secret key is read from `supabase status` on every run and never written to a file.
export function readLocalSupabase(): { url: string; secretKey: string } {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' });
  const status = statusSchema.parse(JSON.parse(output.slice(output.indexOf('{'))));
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!secretKey) throw new Error('supabase status did not report the local secret key.');
  return { url: status.API_URL, secretKey };
}

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
