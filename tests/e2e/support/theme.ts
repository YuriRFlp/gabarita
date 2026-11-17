import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BrowserContext } from '@playwright/test';
import type { Database } from '../../../src/shared/supabase/database.types.ts';
import { TEST_USER } from '../data/test-user.ts';
import { BASE_URL } from './session.ts';

export type ThemePreference = Database['public']['Enums']['theme_preference'];

export const THEME_COOKIE = 'gb-theme';

type Credentials = { email: string; password: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing: E2E tests read the app's .env.local.`);
  return value;
}

type UserClient = { client: SupabaseClient<Database>; userId: string };

const userClients = new Map<string, Promise<UserClient>>();

async function signIn(credentials: Credentials): Promise<UserClient> {
  const client = createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error) throw error;
  return { client, userId: data.user.id };
}

// Signs in with the publishable key as the user itself, so writes go through RLS. The client is
// reused because local Supabase allows only 30 sign-ins per 5 minutes per IP.
function userClient(credentials: Credentials): Promise<UserClient> {
  let pending = userClients.get(credentials.email);
  if (!pending) {
    pending = signIn(credentials);
    pending.catch(() => userClients.delete(credentials.email));
    userClients.set(credentials.email, pending);
  }
  return pending;
}

/** Writes the theme straight to the database, as if it had been changed on another device. */
export async function setThemeInDatabase(
  theme: ThemePreference,
  credentials: Credentials = TEST_USER,
): Promise<void> {
  const { client, userId } = await userClient(credentials);
  const { error } = await client
    .from('settings')
    .upsert({ user_id: userId, theme }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function readThemeFromDatabase(
  credentials: Credentials = TEST_USER,
): Promise<ThemePreference | null> {
  const { client, userId } = await userClient(credentials);
  const { data, error } = await client
    .from('settings')
    .select('theme')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.theme ?? null;
}

export async function readThemeCookie(context: BrowserContext): Promise<string | undefined> {
  const cookies = await context.cookies(BASE_URL);
  return cookies.find((cookie) => cookie.name === THEME_COOKIE)?.value;
}

export async function setThemeCookie(
  context: BrowserContext,
  theme: ThemePreference,
): Promise<void> {
  await context.addCookies([{ name: THEME_COOKIE, value: theme, url: BASE_URL, httpOnly: true }]);
}

/**
 * Reads data-theme from the <html> tag of the HTML the server sent, before any JavaScript
 * runs: this is what proves the theme does not flip while the page loads.
 * Returns null when the tag has no such attribute.
 */
export function themeInServerHtml(html: string): string | null {
  const tag = /<html\b[^>]*>/i.exec(html)?.[0];
  if (!tag) throw new Error('Response has no <html> tag.');
  return /\sdata-theme="([^"]*)"/.exec(tag)?.[1] ?? null;
}
