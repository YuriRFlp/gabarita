import type { DbClient } from '../../src/shared/supabase/types.ts';

type Result = { data: unknown; error: unknown; count?: number | null };
type Operation = 'select' | 'upsert' | 'update' | 'delete';

export type FakeTablesClientOptions = {
  /** Signed-in user answered by auth.getUser; null for no session. */
  user?: { id: string } | null;
  /** Result by "table:operation" (e.g. "exam_weights:upsert"); missing keys answer with an empty list. */
  results?: Record<string, Result>;
  /** "table:operation" keys whose query rejects instead of resolving. */
  throwOn?: ReadonlyArray<string>;
};

export type FakeTablesClient = {
  client: DbClient;
  /** Rows passed to upsert/update, by "table:operation", in call order. */
  writes: Record<string, unknown[]>;
};

/** Mirrors an untruncated exact count unless the test sets one explicitly. */
function withCount(result: Result): Result {
  if (result.count !== undefined || !Array.isArray(result.data)) return result;
  return { ...result, count: result.data.length };
}

/** Any chain of select/eq/upsert/update/delete/maybeSingle resolves to the configured result. */
export function createFakeTablesClient(options: FakeTablesClientOptions = {}): FakeTablesClient {
  const user = options.user === undefined ? { id: 'fake-user' } : options.user;
  const writes: Record<string, unknown[]> = {};

  const from = (table: string) => {
    let operation: Operation = 'select';
    const settle = (): Promise<Result> => {
      const key = `${table}:${operation}`;
      if (options.throwOn?.includes(key)) return Promise.reject(new Error('connection reset'));
      return Promise.resolve(withCount(options.results?.[key] ?? { data: [], error: null }));
    };
    const record = (name: Operation, payload: unknown) => {
      operation = name;
      (writes[`${table}:${name}`] ??= []).push(payload);
    };
    const builder = {
      select: () => builder,
      eq: () => builder,
      upsert: (payload: unknown) => {
        record('upsert', payload);
        return builder;
      },
      update: (payload: unknown) => {
        record('update', payload);
        return builder;
      },
      delete: () => {
        record('delete', null);
        return builder;
      },
      maybeSingle: async () => {
        const result = await settle();
        return {
          data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
          error: result.error,
        };
      },
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
        settle().then(resolve, reject),
    };
    return builder;
  };

  const auth = { getUser: async () => ({ data: { user }, error: null }) };
  // Only the chain above is implemented; the full client type cannot be satisfied by a fake.
  return { client: { from, auth } as unknown as DbClient, writes };
}
