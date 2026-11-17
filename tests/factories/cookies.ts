type Cookie = { name: string; value: string; options?: Record<string, unknown> };

export type CookieStore = {
  get(name: string): Cookie | undefined;
  getAll(): Cookie[];
  set(name: string, value: string, options?: object): void;
  has(name: string): boolean;
  delete(name: string): void;
};

export function createCookieStore(initial: Record<string, string> = {}): CookieStore {
  const cookies = new Map<string, Cookie>(
    Object.entries(initial).map(([name, value]) => [name, { name, value }]),
  );
  return {
    get: (name) => cookies.get(name),
    getAll: () => [...cookies.values()],
    set: (name, value, options) => {
      cookies.set(name, { name, value, options: { ...options } });
    },
    has: (name) => cookies.has(name),
    delete: (name) => {
      cookies.delete(name);
    },
  };
}

export function copyCookieStore(
  source: CookieStore,
  extra: Record<string, string> = {},
): CookieStore {
  const values = Object.fromEntries(source.getAll().map((cookie) => [cookie.name, cookie.value]));
  return createCookieStore({ ...values, ...extra });
}
