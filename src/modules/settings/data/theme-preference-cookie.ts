import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { parseThemePreference, type ThemePreference } from '../domain';

export const THEME_COOKIE = 'gb-theme';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: ONE_YEAR_IN_SECONDS,
} as const;

export async function readThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  return parseThemePreference(store.get(THEME_COOKIE)?.value);
}

export async function writeThemePreference(preference: ThemePreference): Promise<void> {
  const store = await cookies();
  store.set(THEME_COOKIE, preference, COOKIE_OPTIONS);
}

export function readThemeCookieFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(THEME_COOKIE)?.value;
}

/**
 * Rewrites the cookie on the request, so this same request's layout reads the new value,
 * and on the response. NextResponse.next copies the request headers when it is created,
 * so the response is rebuilt, carrying over the session cookies already set on the old one.
 */
export function applyThemeCacheInProxy(
  request: NextRequest,
  response: NextResponse,
  theme: ThemePreference,
): NextResponse {
  request.cookies.set(THEME_COOKIE, theme);
  const rebuilt = NextResponse.next({ request });
  for (const cookie of response.cookies.getAll()) rebuilt.cookies.set(cookie);
  rebuilt.cookies.set(THEME_COOKIE, theme, COOKIE_OPTIONS);
  return rebuilt;
}
