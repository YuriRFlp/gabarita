import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

const SOURCES = listFiles('src').filter((path) => !path.endsWith('database.types.ts'));
const ALLOWED_PUBLIC = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
]);

describe('key scan', () => {
  it.each(['service_role', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'sb_secret_'])(
    'has no %s in src/',
    (term) => {
      const matches = SOURCES.filter((path) => readFileSync(path, 'utf8').includes(term));
      expect(matches).toEqual([]);
    },
  );

  it('uses only the two allowed NEXT_PUBLIC_ variables in src/, .env.example and CI', () => {
    const texts = [...SOURCES, '.env.example', '.github/workflows/ci.yml'].map((path) =>
      readFileSync(path, 'utf8'),
    );
    const used = new Set(texts.flatMap((text) => text.match(/NEXT_PUBLIC_[A-Z0-9_]+/g) ?? []));
    expect([...used].filter((name) => !ALLOWED_PUBLIC.has(name))).toEqual([]);
  });
});
