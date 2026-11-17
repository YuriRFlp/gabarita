import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { readEnv } from '@/shared/utils/env';
import type { DbClient } from './types';

export type ProxySession = {
  response: NextResponse;
  client: DbClient;
  user: { id: string } | null;
};

/** Refreshes the session in the proxy; the returned response carries the updated session cookies. */
export async function refreshSession(request: NextRequest): Promise<ProxySession> {
  const env = readEnv();
  let response = NextResponse.next({ request });
  const client = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    },
  );
  // getUser validates the token with the auth server; getSession only reads the cookie and must not gate access.
  const { data } = await client.auth.getUser();
  return { response, client, user: data.user ? { id: data.user.id } : null };
}
