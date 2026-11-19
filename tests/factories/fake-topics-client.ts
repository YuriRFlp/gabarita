import type { DbClient } from '../../src/shared/supabase/types.ts';

type Result = { data: unknown; error: unknown };

export type FakeTopicsClientOptions = {
  /** Table or view name to its result; missing names answer with an empty list. */
  results?: Record<string, Result>;
  /** Table or view name whose query rejects instead of resolving. */
  throwOn?: string;
};

/** Implements only the chain readTopicMapSource uses: from().select() with an optional eq(). */
export function createFakeTopicsClient(options: FakeTopicsClientOptions = {}): DbClient {
  const from = (table: string) => {
    const settle = (): Promise<Result> =>
      table === options.throwOn
        ? Promise.reject(new Error('connection reset'))
        : Promise.resolve(options.results?.[table] ?? { data: [], error: null });
    const builder = {
      select: () => builder,
      eq: () => builder,
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
        settle().then(resolve, reject),
    };
    return builder;
  };
  return { from } as unknown as DbClient;
}
