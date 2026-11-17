import { vi } from 'vitest';
import type { DbClient } from '../../src/shared/supabase/types.ts';

type Result = { data: unknown; error: unknown };

export type FakeClientOptions = {
  signIn?: Result;
  user?: { id: string } | null;
  insertSettings?: Result;
  readSettings?: Result;
  updateSettings?: Result;
};

export const NETWORK_ERROR = {
  name: 'AuthRetryableFetchError',
  message: 'TypeError: fetch failed (connect ECONNREFUSED 127.0.0.1:54321)',
  status: 0,
};

export const DATABASE_ERROR = {
  code: '08006',
  message: 'connection failure: server closed the connection unexpectedly',
  details: 'pg_hba.conf',
  hint: null,
};

const FAKE_USER = { id: '00000000-0000-4000-8000-000000000001' };

export function createFakeSupabaseClient(options: FakeClientOptions = {}) {
  const user = options.user === undefined ? FAKE_USER : options.user;
  const signIn = options.signIn ?? { data: { user, session: {} }, error: null };
  const insert = options.insertSettings ?? { data: null, error: null };
  const read = options.readSettings ?? { data: { theme: 'system' }, error: null };
  const update = options.updateSettings ?? {
    data: user ? [{ user_id: user.id }] : [],
    error: null,
  };

  const calls = {
    signInWithPassword: vi.fn(async () => signIn),
    signOut: vi.fn(async () => ({ error: null })),
    getUser: vi.fn(async () => ({ data: { user }, error: null })),
    upsert: vi.fn(async () => insert),
    update: vi.fn(() => ({ eq: () => ({ select: async () => update }) })),
  };

  const client = {
    auth: {
      signInWithPassword: calls.signInWithPassword,
      signOut: calls.signOut,
      getUser: calls.getUser,
    },
    from: () => ({
      upsert: calls.upsert,
      select: () => ({ eq: () => ({ maybeSingle: async () => read }) }),
      update: calls.update,
    }),
  };
  // The fake implements only the calls the actions under test make, not the whole client.
  const typedClient = client as unknown as DbClient;

  return { client: typedClient, calls };
}
