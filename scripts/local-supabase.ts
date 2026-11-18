import { execFileSync } from 'node:child_process';
import { z } from 'zod';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The secret key grants full database access, so scripts only accept the local Supabase. */
export function isLocalUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

const statusSchema = z.object({
  API_URL: z.string(),
  SERVICE_ROLE_KEY: z.string().optional(),
  SECRET_KEY: z.string().optional(),
});

// The secret key is read from `supabase status` on every run and never written to a file.
export function readLocalSupabase(): { url: string; secretKey: string } {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' });
  const status = statusSchema.parse(JSON.parse(output.slice(output.indexOf('{'))));
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!secretKey) throw new Error('supabase status did not report the local secret key.');
  return { url: status.API_URL, secretKey };
}
