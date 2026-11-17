import { HOME_PATH } from './return-path';

export const LOGIN_ROUTE = '/login';
export const PUBLIC_ROUTES: readonly string[] = [LOGIN_ROUTE];

export type AccessDecision = { type: 'continue' } | { type: 'redirect'; destination: string };

function isPublicRoute(path: string): boolean {
  const route = path.split(/[?#]/, 1)[0] ?? '';
  return PUBLIC_ROUTES.some(
    (publicRoute) => route === publicRoute || route.startsWith(`${publicRoute}/`),
  );
}

/** `path` is the request pathname plus its query string. */
export function decideAccess(input: { path: string; authenticated: boolean }): AccessDecision {
  const isPublic = isPublicRoute(input.path);
  if (input.authenticated) {
    return isPublic ? { type: 'redirect', destination: HOME_PATH } : { type: 'continue' };
  }
  if (isPublic) return { type: 'continue' };
  return {
    type: 'redirect',
    destination: `${LOGIN_ROUTE}?next=${encodeURIComponent(input.path)}`,
  };
}
