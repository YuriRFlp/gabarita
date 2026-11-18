import { execFileSync } from 'node:child_process';
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

const SELF = 'tests/security/keys.test.ts';
const TRACKED = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter((path) => path !== '' && path !== SELF);

function readText(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    // Deleted in the working tree but still tracked.
    return null;
  }
}

function findMatches(pattern: RegExp, accept: (match: RegExpMatchArray) => boolean = () => true) {
  return TRACKED.filter((path) => {
    const text = readText(path);
    return text !== null && [...text.matchAll(pattern)].some(accept);
  });
}

function isServiceRoleJwt(match: RegExpMatchArray): boolean {
  try {
    const payload = Buffer.from(match[1]!, 'base64url').toString('utf8');
    return /"role"\s*:\s*"service_role"/.test(payload);
  } catch {
    return false;
  }
}

describe('CA-3 — scan of every tracked file', () => {
  it('finds tracked files to scan', () => {
    expect(TRACKED.length).toBeGreaterThan(50);
  });

  it('has no Postgres connection string with an embedded password', () => {
    expect(findMatches(/postgres(?:ql)?:\/\/[^:\s/@'"`]+:[^@\s'"`]+@/g)).toEqual([]);
  });

  it('has no sb_secret_ key', () => {
    expect(findMatches(/sb_secret_[A-Za-z0-9_-]{20,}/g)).toEqual([]);
  });

  it('has no literal "role":"service_role"', () => {
    expect(findMatches(/"role"\s*:\s*"service_role"/g)).toEqual([]);
  });

  it('has no JWT whose payload carries the service_role role', () => {
    expect(findMatches(/eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g, isServiceRoleJwt)).toEqual([]);
  });
});
