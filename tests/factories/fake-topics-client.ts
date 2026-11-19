import type { DbClient } from '../../src/shared/supabase/types.ts';

type Result = { data: unknown; error: unknown; count?: number | null };

export type FakeTopicsClientOptions = {
  /** Table or view name to its result; missing names answer with an empty list. */
  results?: Record<string, Result>;
  /** Table or view name whose query rejects instead of resolving. */
  throwOn?: string;
};

/** Mirrors an untruncated exact count unless the test sets one explicitly. */
function withCount(result: Result): Result {
  if (result.count !== undefined || !Array.isArray(result.data)) return result;
  return { ...result, count: result.data.length };
}

/** Implements only the chain readTopicMapSource uses: from().select() with an optional eq(). */
export function createFakeTopicsClient(options: FakeTopicsClientOptions = {}): DbClient {
  const from = (table: string) => {
    const settle = (): Promise<Result> =>
      table === options.throwOn
        ? Promise.reject(new Error('connection reset'))
        : Promise.resolve(withCount(options.results?.[table] ?? { data: [], error: null }));
    const builder = {
      select: () => builder,
      eq: () => builder,
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
        settle().then(resolve, reject),
    };
    return builder;
  };
  // Only the query chain above is implemented; the full client type cannot be satisfied by a fake.
  return { from } as unknown as DbClient;
}
