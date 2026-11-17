import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from '@/shared/supabase';
import { decideAccess } from '@/modules/auth';
import {
  applyThemeCacheInProxy,
  readSavedTheme,
  readThemeCookieFromRequest,
  themeToSync,
} from '@/modules/settings';

// Only full page loads read the saved theme; client navigation, prefetch and actions
// skip the query (SPEC-001 § 5.4, item 4).
function isFullPageLoad(request: NextRequest): boolean {
  return request.method === 'GET' && request.headers.get('sec-fetch-dest') === 'document';
}

export async function proxy(request: NextRequest) {
  const { response, client, user } = await refreshSession(request);
  const decision = decideAccess({
    path: `${request.nextUrl.pathname}${request.nextUrl.search}`,
    authenticated: user !== null,
  });

  if (decision.type === 'redirect') {
    const redirectResponse = NextResponse.redirect(new URL(decision.destination, request.url));
    for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
    return redirectResponse;
  }

  if (user && isFullPageLoad(request)) {
    const saved = await readSavedTheme(client, user.id);
    const theme = themeToSync(saved, readThemeCookieFromRequest(request));
    if (theme) return applyThemeCacheInProxy(request, response, theme);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
