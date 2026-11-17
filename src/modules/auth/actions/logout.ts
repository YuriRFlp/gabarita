'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/supabase';
import { LOGIN_ROUTE } from '../domain';

// The theme cookie stays: the login screen keeps the last chosen theme (CA-37).
// Local scope: logging out on one device keeps the other devices signed in (SPEC-001, D-16).
export async function logout(): Promise<never> {
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) console.error('logout: failed to end the session', error);
  redirect(LOGIN_ROUTE);
}
