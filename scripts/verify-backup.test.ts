import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { buildManifest } from './backup-db.ts';
import type { BackupFile } from './backup-manifest.ts';
import type { CommandResult, CommandRunner } from './command-runner.ts';
import { compareCounts, verifyBackup, type VerifyDeps } from './verify-backup.ts';

const DIR = '/backups/2026-11-17T183000Z';
const sha = (content: string) => createHash('sha256').update(content).digest('hex');

type Files = Record<string, string>;

function backupFiles(rowCounts: Record<string, number> = { 'public.exams': 2, 'auth.users': 1 }) {
  const contents: Record<BackupFile, string> = {
    'roles.sql': 'roles',
    'schema.sql': 'schema',
    'data.sql': 'data',
  };
  const info = (text: string) => ({ bytes: text.length, sha256: sha(text) });
  const manifest = buildManifest({
    now: new Date('2026-11-17T18:30:00Z'),
    gitCommit: 'c'.repeat(40),
    latestMigration: '20261117010000_essay_type_questions_and_case_study.sql',
    supabaseCliVersion: '3.2.0',
    files: {
      'roles.sql': info(contents['roles.sql']),
      'schema.sql': info(contents['schema.sql']),
      'data.sql': info(contents['data.sql']),
    },
    rowCounts,
  });
  const files: Files = {
    ...Object.fromEntries(Object.entries(contents).map(([file, text]) => [`${DIR}/${file}`, text])),
    [`${DIR}/manifest.json`]: JSON.stringify(manifest),
  };
  return files;
}

function setup(files: Files, options: { url?: string; counts?: string; failStep?: string } = {}) {
  const calls: Array<{ command: string; args: readonly string[] }> = [];
  const run: CommandRunner = async (command, args) => {
    calls.push({ command, args });
    const line = args.join(' ');
    const fail = options.failStep && line.includes(options.failStep);
    if (fail) return { code: 1, stdout: '', stderr: 'erro simulado' } satisfies CommandResult;
    const stdout = line.includes('count(*)')
      ? (options.counts ?? 'public.exams|2\nauth.users|1\n')
      : '';
    return { code: 0, stdout, stderr: '' };
  };
  const readFile = vi.fn(async (path: string) => {
    const content = files[path];
    if (content === undefined) throw new Error('ENOENT');
    return Buffer.from(content);
  });
  const deps: VerifyDeps = {
    supabaseUrl: options.url ?? 'http://127.0.0.1:54321',
    dbContainer: 'supabase_db_gabarita',
    run,
    readFile,
    log: vi.fn(),
  };
  return { deps, calls };
}

describe('compareCounts', () => {
  it('approves equal counts', () => {
    expect(
      compareCounts({ 'public.a': 1, 'auth.users': 0 }, { 'public.a': 1, 'auth.users': 0 }),
    ).toEqual({ ok: true });
  });

  it('ignores extra tables in the restored database', () => {
    expect(compareCounts({ 'public.a': 1 }, { 'public.a': 1, 'public.b': 9 })).toEqual({
      ok: true,
    });
  });

  it('lists the difference per table, with null for a missing table', () => {
    const result = compareCounts(
      { 'public.b': 5, 'public.a': 1, 'public.c': 0 },
      { 'public.a': 2, 'public.c': 0 },
    );

    expect(result).toEqual({
      ok: false,
      differences: [
        { table: 'public.a', expected: 1, actual: 2 },
        { table: 'public.b', expected: 5, actual: null },
      ],
    });
  });

  it('approves a manifest without tables', () => {
    expect(compareCounts({}, { 'public.a': 1 })).toEqual({ ok: true });
  });
});

describe('CA-23 — URL guard and hash check', () => {
  it.each(['https://abc.supabase.co', 'http://10.0.0.5:54321', 'não é url'])(
    'recusa a URL %s sem ler arquivo nem executar comando',
    async (url) => {
      const { deps, calls } = setup(backupFiles(), { url });

      const result = await verifyBackup(DIR, deps);

      expect(result.ok).toBe(false);
      expect(calls).toEqual([]);
      expect(deps.readFile).not.toHaveBeenCalled();
    },
  );

  it('refuses before restoring when a file SHA-256 does not match', async () => {
    const files = backupFiles();
    files[`${DIR}/data.sql`] = 'data adulterado';
    const { deps, calls } = setup(files);

    const result = await verifyBackup(DIR, deps);

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('data.sql') });
    expect(calls).toEqual([]);
  });

  it('refuses when a backup file is missing', async () => {
    const files = backupFiles();
    delete files[`${DIR}/roles.sql`];
    const { deps, calls } = setup(files);

    const result = await verifyBackup(DIR, deps);

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('roles.sql') });
    expect(calls).toEqual([]);
  });

  it.each([
    ['missing', undefined],
    ['with invalid JSON', '{'],
    ['outside the schema', '{"createdAt":"x"}'],
  ])('refuses manifest %s', async (_label, content) => {
    const files = backupFiles();
    if (content === undefined) delete files[`${DIR}/manifest.json`];
    else files[`${DIR}/manifest.json`] = content;
    const { deps, calls } = setup(files);

    const result = await verifyBackup(DIR, deps);

    expect(result).toEqual({ ok: false, reason: expect.stringContaining('manifest.json') });
    expect(calls).toEqual([]);
  });

  it('refuses a suspicious table name in the manifest before running SQL', async () => {
    const files = backupFiles({ 'public.a"; drop table x; --': 1 });
    const { deps, calls } = setup(files);

    const result = await verifyBackup(DIR, deps);

    expect(result.ok).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('verifyBackup — restore', () => {
  it('resets the local database, restores with session_replication_role and checks the counts', async () => {
    const { deps, calls } = setup(backupFiles());

    const result = await verifyBackup(DIR, deps);

    expect(result).toEqual({ ok: true });
    expect(calls[0]).toEqual({ command: 'npx', args: ['supabase', 'db', 'reset', '--no-seed'] });
    expect(calls[1]).toEqual({
      command: 'docker',
      args: ['cp', `${DIR}/data.sql`, 'supabase_db_gabarita:/tmp/gabarita-restore.sql'],
    });
    const restore = calls[2]!.args.join(' ');
    expect(restore).toContain('--single-transaction');
    expect(restore).toContain('session_replication_role = replica');
    expect(restore).toContain('ON_ERROR_STOP=1');
  });

  it('removes the temporary dump from the container at the end', async () => {
    const { deps, calls } = setup(backupFiles());

    await verifyBackup(DIR, deps);

    expect(calls.at(-1)).toEqual({
      command: 'docker',
      args: ['exec', 'supabase_db_gabarita', 'rm', '-f', '/tmp/gabarita-restore.sql'],
    });
  });

  it('removes the temporary dump from the container even when the restore fails', async () => {
    const { deps, calls } = setup(backupFiles(), { failStep: 'single-transaction' });

    await verifyBackup(DIR, deps);

    expect(calls.at(-1)?.args).toContain('rm');
  });

  it('does not touch the container when the reset fails before the copy', async () => {
    const { deps, calls } = setup(backupFiles(), { failStep: 'db reset' });

    await verifyBackup(DIR, deps);

    expect(calls.some((call) => call.args.includes('rm'))).toBe(false);
  });

  it('lists the difference per table when the restored count differs', async () => {
    const { deps } = setup(backupFiles(), { counts: 'public.exams|1\nauth.users|1\n' });

    const result = await verifyBackup(DIR, deps);

    expect(result).toEqual({
      ok: false,
      reason: expect.stringMatching(/public\.exams: esperado 2, restaurado 1/),
    });
  });

  it('reports a table missing from the restored database', async () => {
    const { deps } = setup(backupFiles(), { counts: 'auth.users|1\n' });

    const result = await verifyBackup(DIR, deps);

    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining('public.exams: esperado 2, restaurado tabela ausente'),
    });
  });

  it.each(['db reset', 'cp', 'single-transaction', 'count(*)'])(
    'returns an error when the "%s" step fails',
    async (failStep) => {
      const { deps } = setup(backupFiles(), { failStep });

      const result = await verifyBackup(DIR, deps);

      expect(result).toEqual({ ok: false, reason: expect.stringContaining('erro simulado') });
    },
  );
});
