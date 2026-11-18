import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../next.config.ts';
import { checkProduction, EXPECTED_HEADERS } from './check-production.ts';

const KEY = 'sb_publishable_SEGREDO_DE_TESTE';
const TABLES = ['subjects', 'settings'] as const;
const input = {
  appUrl: 'https://gabarita.example.app',
  supabaseUrl: 'https://abc.supabase.co',
  publishableKey: KEY,
  tables: TABLES,
};

type Overrides = {
  root?: Response;
  login?: Response;
  settings?: Response | Error;
  table?: (table: string) => Response | Error;
};

const goodHeaders = (): Record<string, string> => ({
  ...EXPECTED_HEADERS,
  'strict-transport-security': 'max-age=63072000',
});

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

function fakeFetch(overrides: Overrides = {}): FetchFn {
  return async (url) => {
    const { pathname } = new URL(String(url));
    let result: Response | Error;
    if (pathname === '/') {
      result =
        overrides.root ??
        new Response(null, { status: 307, headers: { location: '/login?next=%2F' } });
    } else if (pathname === '/login') {
      result = overrides.login ?? new Response('ok', { status: 200, headers: goodHeaders() });
    } else if (pathname === '/auth/v1/settings') {
      result = overrides.settings ?? Response.json({ disable_signup: true });
    } else {
      const table = pathname.split('/').pop() ?? '';
      result = overrides.table?.(table) ?? Response.json([]);
    }
    if (result instanceof Error) throw result;
    return result;
  };
}

const failing = async (overrides: Overrides) =>
  (await checkProduction(input, fakeFetch(overrides))).filter((check) => !check.ok);

describe('CA-10 — redirect and login page', () => {
  it('passes everything when production is correct', async () => {
    const results = await checkProduction(input, fakeFetch());
    expect(results.every((check) => check.ok)).toBe(true);
    expect(results).toHaveLength(1 + 4 + 1 + TABLES.length);
  });

  it('accepts an absolute Location', async () => {
    const root = new Response(null, {
      status: 307,
      headers: { location: 'https://gabarita.example.app/login?next=%2F' },
    });
    expect(await failing({ root })).toEqual([]);
  });

  it.each([
    [200, '/login?next=%2F'],
    [308, '/login?next=%2F'],
    [307, '/login'],
    [307, '/login?next=%2Fcards'],
  ])('fails when / answers %i for %s', async (status, location) => {
    const root = new Response(null, { status, headers: { location } });
    const result = await failing({ root });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toContain('redirects');
  });

  it('fails when /login does not answer 200', async () => {
    const login = new Response('x', { status: 500, headers: goodHeaders() });
    const result = await failing({ login });
    expect(result.map((check) => check.name)).toEqual(['GET /login returns 200']);
  });
});

describe('CA-11 — /login headers', () => {
  it('expects exactly the headers that next.config.ts sends, in lowercase', () => {
    expect(Object.keys(EXPECTED_HEADERS).sort()).toEqual(
      SECURITY_HEADERS.map(({ key }) => key.toLowerCase()).sort(),
    );
  });

  it.each(Object.keys(EXPECTED_HEADERS))('fails when %s is missing', async (header) => {
    const headers = goodHeaders();
    delete headers[header];
    const result = await failing({ login: new Response('ok', { headers }) });
    expect(result).toHaveLength(1);
    expect(result[0]?.detail).toContain(header);
  });

  it('fails when a header has a different value', async () => {
    const headers = { ...goodHeaders(), 'x-frame-options': 'SAMEORIGIN' };
    expect(await failing({ login: new Response('ok', { headers }) })).toHaveLength(1);
  });

  it('fails without Strict-Transport-Security', async () => {
    const headers = goodHeaders();
    delete headers['strict-transport-security'];
    const result = await failing({ login: new Response('ok', { headers }) });
    expect(result.map((check) => check.name)).toEqual(['Strict-Transport-Security on /login']);
  });

  it('fails when X-Powered-By is present', async () => {
    const headers = { ...goodHeaders(), 'x-powered-by': 'Next.js' };
    const result = await failing({ login: new Response('ok', { headers }) });
    expect(result.map((check) => check.name)).toEqual(['no X-Powered-By on /login']);
  });
});

describe('CA-12 — Supabase without a session', () => {
  it('fails when signup is open', async () => {
    const result = await failing({ settings: Response.json({ disable_signup: false }) });
    expect(result.map((check) => check.name)).toEqual(['signup disabled (/auth/v1/settings)']);
  });

  it('fails when disable_signup is not in the response', async () => {
    expect(await failing({ settings: Response.json({}) })).toHaveLength(1);
  });

  it('fails when the settings answer with an error', async () => {
    expect(await failing({ settings: new Response('', { status: 500 }) })).toHaveLength(1);
  });

  it.each([401, 403])('accepts %i as a permission error', async (status) => {
    expect(await failing({ table: () => new Response('', { status }) })).toEqual([]);
  });

  it('fails when a table returns a row', async () => {
    const result = await failing({
      table: (table) => (table === 'settings' ? Response.json([{ id: 1 }]) : Response.json([])),
    });
    expect(result.map((check) => check.name)).toEqual(['anonymous read of settings']);
  });

  it('fails on an unexpected table status', async () => {
    expect(await failing({ table: () => new Response('', { status: 500 }) })).toHaveLength(
      TABLES.length,
    );
  });

  it('queries each table with select=*&limit=1 and the key in the apikey header', async () => {
    const calls: Array<{ url: string; headers: HeadersInit | undefined }> = [];
    const base = fakeFetch();
    const spy: FetchFn = (url, init) => {
      calls.push({ url: String(url), headers: init?.headers });
      return base(url, init);
    };
    await checkProduction(input, spy);
    const rest = calls.filter((call) => call.url.includes('/rest/v1/'));
    expect(rest.map((call) => call.url)).toEqual(
      TABLES.map((table) => `https://abc.supabase.co/rest/v1/${table}?select=*&limit=1`),
    );
    expect(rest.every((call) => new Headers(call.headers).get('apikey') === KEY)).toBe(true);
  });
});

describe('network failures and key secrecy', () => {
  it('treats a network error as a failed check, without throwing', async () => {
    const result = await failing({ settings: new Error(`boom ${KEY}`) });
    expect(result).toHaveLength(1);
    expect(result[0]?.ok).toBe(false);
  });

  it('never includes the key in results, not even in failures', async () => {
    const results = await checkProduction(
      input,
      fakeFetch({
        settings: new Error(`falha com ${KEY}`),
        table: () => Response.json([{ leaked: KEY }]),
      }),
    );
    expect(JSON.stringify(results)).not.toContain(KEY);
  });
});
