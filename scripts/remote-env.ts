import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PASSWORD_VARIABLE = 'SUPABASE_DB_PASSWORD';

export function requireDbPassword(
  env: Record<string, string | undefined>,
): { ok: true } | { ok: false; message: string } {
  if (env[PASSWORD_VARIABLE]?.trim()) return { ok: true };
  return {
    ok: false,
    message: `A variável ${PASSWORD_VARIABLE} não está definida na sessão do terminal. Defina-a com a senha do banco remoto (ex.: read -s ${PASSWORD_VARIABLE}; export ${PASSWORD_VARIABLE}).`,
  };
}

export async function readLinkedProjectRef(repoRoot: string): Promise<string | null> {
  try {
    const ref = (await readFile(join(repoRoot, 'supabase', '.temp', 'project-ref'), 'utf8')).trim();
    return ref === '' ? null : ref;
  } catch {
    return null;
  }
}

/** Replaces the database password with *** so it never reaches the terminal or a log. */
export function scrubSecret(text: string, env: Record<string, string | undefined>): string {
  const secret = env[PASSWORD_VARIABLE];
  return secret ? text.replaceAll(secret, '***') : text;
}
