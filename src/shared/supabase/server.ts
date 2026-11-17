import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { readEnv } from '@/shared/utils/env';
import type { DbClient } from './types';

export async function createSupabaseServerClient(): Promise<DbClient> {
  const env = readEnv();
  const store = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) store.set(name, value, options);
          } catch {
            // Server Components cannot write cookies; the proxy refreshes the session instead.
          }
        },
      },
    },
  );
}
