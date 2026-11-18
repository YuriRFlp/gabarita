import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { SECURITY_HEADERS } from '../next.config.ts';

export type ProductionCheck = { name: string; ok: boolean; detail: string };

export const EXPECTED_HEADERS: Readonly<Record<string, string>> = Object.fromEntries(
  SECURITY_HEADERS.map(({ key, value }) => [key.toLowerCase(), value]),
);

const authSettingsSchema = z.object({ disable_signup: z.boolean() });

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

type Input = {
  appUrl: string;
  supabaseUrl: string;
  publishableKey: string;
  tables: readonly string[];
};

function endpoint(base: string, path: string): string {
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}

// Failure details never carry the request headers or bodies, so the key cannot leak.
async function attempt(
  name: string,
  run: () => Promise<ProductionCheck[]>,
): Promise<ProductionCheck[]> {
  try {
    return await run();
  } catch {
    return [{ name, ok: false, detail: 'request failed (network error)' }];
  }
}

async function checkRootRedirect(appUrl: string, fetchFn: FetchFn): Promise<ProductionCheck[]> {
  const name = 'GET / redirects to /login?next=%2F';
  const response = await fetchFn(endpoint(appUrl, '/'), { redirect: 'manual' });
  const location = response.headers.get('location') ?? '';
  const target = location.startsWith('/') ? location : location.replace(/^https?:\/\/[^/]+/, '');
  const ok = response.status === 307 && target === '/login?next=%2F';
  return [
    {
      name,
      ok,
      detail: ok ? 'status 307' : `status ${response.status}, location "${location}"`,
    },
  ];
}

async function checkLogin(appUrl: string, fetchFn: FetchFn): Promise<ProductionCheck[]> {
  const response = await fetchFn(endpoint(appUrl, '/login'), { redirect: 'manual' });
  const checks: ProductionCheck[] = [
    {
      name: 'GET /login returns 200',
      ok: response.status === 200,
      detail: `status ${response.status}`,
    },
  ];
  const wrong = Object.entries(EXPECTED_HEADERS).filter(
    ([header, value]) => response.headers.get(header) !== value,
  );
  checks.push({
    name: 'security headers on /login',
    ok: wrong.length === 0,
    detail:
      wrong.length === 0 ? 'all present' : `wrong or missing: ${wrong.map(([h]) => h).join(', ')}`,
  });
  const hsts = response.headers.get('strict-transport-security');
  checks.push({
    name: 'Strict-Transport-Security on /login',
    ok: hsts !== null && hsts !== '',
    detail: hsts ? 'present' : 'missing',
  });
  const powered = response.headers.has('x-powered-by');
  checks.push({
    name: 'no X-Powered-By on /login',
    ok: !powered,
    detail: powered ? 'header present' : 'absent',
  });
  return checks;
}

async function checkSignupDisabled(input: Input, fetchFn: FetchFn): Promise<ProductionCheck[]> {
  const name = 'signup disabled (/auth/v1/settings)';
  const response = await fetchFn(endpoint(input.supabaseUrl, 'auth/v1/settings'), {
    headers: { apikey: input.publishableKey },
  });
  if (!response.ok) return [{ name, ok: false, detail: `status ${response.status}` }];
  const parsed = authSettingsSchema.safeParse(await response.json().catch(() => null));
  const disabled = parsed.success && parsed.data.disable_signup;
  return [
    {
      name,
      ok: disabled,
      detail: disabled ? 'disable_signup is true' : 'disable_signup is not true',
    },
  ];
}

async function checkTable(
  input: Input,
  table: string,
  fetchFn: FetchFn,
): Promise<ProductionCheck[]> {
  const name = `anonymous read of ${table}`;
  const url = endpoint(input.supabaseUrl, `rest/v1/${encodeURIComponent(table)}?select=*&limit=1`);
  const response = await fetchFn(url, { headers: { apikey: input.publishableKey } });
  if (response.status === 401 || response.status === 403) {
    return [{ name, ok: true, detail: `denied (${response.status})` }];
  }
  if (response.status !== 200)
    return [{ name, ok: false, detail: `unexpected status ${response.status}` }];
  const body: unknown = await response.json().catch(() => null);
  if (Array.isArray(body) && body.length === 0) return [{ name, ok: true, detail: 'empty list' }];
  return [{ name, ok: false, detail: 'returned data or an unexpected body' }];
}

export async function checkProduction(input: Input, fetchFn: FetchFn): Promise<ProductionCheck[]> {
  const results = [
    ...(await attempt('GET / redirects to /login?next=%2F', () =>
      checkRootRedirect(input.appUrl, fetchFn),
    )),
    ...(await attempt('GET /login', () => checkLogin(input.appUrl, fetchFn))),
    ...(await attempt('signup disabled (/auth/v1/settings)', () =>
      checkSignupDisabled(input, fetchFn),
    )),
  ];
  for (const table of input.tables) {
    results.push(
      ...(await attempt(`anonymous read of ${table}`, () => checkTable(input, table, fetchFn))),
    );
  }
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.loadEnvFile('.env.production.local');
  } catch {
    // The file is optional; values may come from the shell.
  }
  const appUrl = process.env.PRODUCTION_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing = [
    ['PRODUCTION_URL', appUrl],
    ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', publishableKey],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0 || !appUrl || !supabaseUrl || !publishableKey) {
    console.error(`Variáveis ausentes: ${missing.join(', ')}`);
    process.exit(1);
  }
  const { readPublicTables } = await import('./public-tables.ts');
  const results = await checkProduction(
    { appUrl, supabaseUrl, publishableKey, tables: readPublicTables() },
    fetch,
  );
  for (const check of results) {
    console.log(`${check.ok ? 'OK ' : 'FALHA'}  ${check.name}: ${check.detail}`);
  }
  const failed = results.filter((check) => !check.ok).length;
  console.log(
    failed === 0
      ? `\nTodas as ${results.length} checagens passaram.`
      : `\n${failed} de ${results.length} checagens falharam.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}
