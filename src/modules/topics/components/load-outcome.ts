/** Structurally the same as the module's `LoadResult`, so the components never import `data/`. */
export type LoadOutcome<T> = { ok: true; value: T } | { ok: false; error: 'load_failed' };
