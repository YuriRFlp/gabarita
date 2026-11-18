import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdminClient, createUser, setThemeInDb } from '#factories/users';
import { backupDirectoryName, buildManifest, summarizeDataDump } from './backup-db.ts';
import { BACKUP_FILES, manifestSchema, type BackupFile } from './backup-manifest.ts';
import { runCommand } from './command-runner.ts';
import { createVerifyDeps, verifyBackup } from './verify-backup.ts';

const SLOW = 240_000;
const DUMP_ARGS: Record<BackupFile, string[]> = {
  'roles.sql': ['--role-only'],
  'schema.sql': [],
  'data.sql': ['--data-only', '--use-copy'],
};

const fileInfo = (text: string) => ({
  bytes: Buffer.byteLength(text),
  sha256: createHash('sha256').update(text).digest('hex'),
});

let workDir: string;
let backupDir: string;

async function dumpLocal(file: BackupFile): Promise<string> {
  const result = await runCommand('npx', ['supabase', 'db', 'dump', ...DUMP_ARGS[file]]);
  if (result.code !== 0) throw new Error(`dump of ${file} failed: ${result.stderr}`);
  return result.stdout;
}

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'gabarita-verify-'));
  const admin = createAdminClient();
  const user = await createUser(admin);
  await setThemeInDb(admin, user.id, 'dark');

  const contents: Record<BackupFile, string> = {
    'roles.sql': await dumpLocal('roles.sql'),
    'schema.sql': await dumpLocal('schema.sql'),
    'data.sql': await dumpLocal('data.sql'),
  };
  const now = new Date('2026-11-17T18:30:00Z');
  backupDir = join(workDir, backupDirectoryName(now));
  const manifest = buildManifest({
    now,
    gitCommit: 'd'.repeat(40),
    latestMigration: '20261117010000_essay_type_questions_and_case_study.sql',
    supabaseCliVersion: '3.2.0',
    files: {
      'roles.sql': fileInfo(contents['roles.sql']),
      'schema.sql': fileInfo(contents['schema.sql']),
      'data.sql': fileInfo(contents['data.sql']),
    },
    rowCounts: summarizeDataDump(contents['data.sql']),
  });
  mkdirSync(backupDir);
  for (const file of BACKUP_FILES) writeFileSync(join(backupDir, file), contents[file]);
  writeFileSync(join(backupDir, 'manifest.json'), JSON.stringify(manifest));
}, SLOW);

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('CA-24 — backup:verify on the local Supabase', () => {
  it(
    'restores into an empty database and checks each table count against the manifest',
    async () => {
      const deps = await createVerifyDeps(() => {});

      const result = await verifyBackup(backupDir, deps);

      expect(result).toEqual({ ok: true });
    },
    SLOW,
  );

  it(
    'lists the difference per table when the manifest has a tampered count',
    async () => {
      const path = join(backupDir, 'manifest.json');
      const manifest = manifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
      const tampered = (manifest.rowCounts['auth.users'] ?? 0) + 1;
      manifest.rowCounts['auth.users'] = tampered;
      writeFileSync(path, JSON.stringify(manifest));
      const deps = await createVerifyDeps(() => {});

      const result = await verifyBackup(backupDir, deps);

      expect(result).toEqual({
        ok: false,
        reason: expect.stringContaining(`auth.users: esperado ${tampered}`),
      });
    },
    SLOW,
  );
});
