import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_NAME,
  backupDirectoryName,
  buildManifest,
  encryptionCommands,
  isInsideDirectory,
  resolveBackupBase,
  runBackup,
  selectBackupsToPrune,
  summarizeDataDump,
  validateDump,
  type BackupFs,
} from './backup-db.ts';
import { manifestSchema } from './backup-manifest.ts';
import type { CommandResult, CommandRunner } from './command-runner.ts';

const fixture = (name: string) =>
  readFileSync(new URL(`../tests/fixtures/backup/${name}`, import.meta.url), 'utf8');

const HASH = 'a'.repeat(64);
const COMMIT = 'b'.repeat(40);
const MIGRATION = '20261117010000_essay_type_questions_and_case_study.sql';
const NOW = new Date('2026-11-17T18:30:00.000Z');
const NAME = '2026-11-17T183000Z';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gabarita-backup-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('CA-17 — backup destination', () => {
  const repoRoot = () => join(root, 'repo');
  const home = () => join(root, 'home');

  beforeEach(() => {
    mkdirSync(join(root, 'repo', 'sub'), { recursive: true });
    mkdirSync(join(root, 'home'));
    mkdirSync(join(root, 'outside'));
  });

  it('uses ~/gabarita-backups when the variable is not set', () => {
    const result = resolveBackupBase({ env: {}, home: home(), repoRoot: repoRoot() });

    expect(result).toEqual({ ok: true, path: join(home(), 'gabarita-backups') });
  });

  it('treats an empty variable as unset', () => {
    const result = resolveBackupBase({
      env: { GABARITA_BACKUP_DIR: '  ' },
      home: home(),
      repoRoot: repoRoot(),
    });

    expect(result).toEqual({ ok: true, path: join(home(), 'gabarita-backups') });
  });

  it('accepts an absolute path outside the repository, even if it does not exist yet', () => {
    const path = join(root, 'outside', 'novo');

    const result = resolveBackupBase({
      env: { GABARITA_BACKUP_DIR: path },
      home: home(),
      repoRoot: repoRoot(),
    });

    expect(result).toEqual({ ok: true, path });
  });

  it.each(['backups', './backups', '../backups', '~/backups'])(
    'refuses relative path %s',
    (value) => {
      const result = resolveBackupBase({
        env: { GABARITA_BACKUP_DIR: value },
        home: home(),
        repoRoot: repoRoot(),
      });

      expect(result).toEqual({ ok: false, error: 'not_absolute' });
    },
  );

  it('refuses the repository itself', () => {
    const result = resolveBackupBase({
      env: { GABARITA_BACKUP_DIR: repoRoot() },
      home: home(),
      repoRoot: repoRoot(),
    });

    expect(result).toEqual({ ok: false, error: 'inside_repository' });
  });

  it('refuses a repository subfolder, existing or not', () => {
    for (const path of [join(repoRoot(), 'sub'), join(repoRoot(), 'nova', 'pasta')]) {
      const result = resolveBackupBase({
        env: { GABARITA_BACKUP_DIR: path },
        home: home(),
        repoRoot: repoRoot(),
      });

      expect(result).toEqual({ ok: false, error: 'inside_repository' });
    }
  });

  it('refuses a path with .. that goes back into the repository', () => {
    const result = resolveBackupBase({
      env: { GABARITA_BACKUP_DIR: join(root, 'outside', '..', 'repo', 'sub') },
      home: home(),
      repoRoot: repoRoot(),
    });

    expect(result).toEqual({ ok: false, error: 'inside_repository' });
  });

  it('refuses a symbolic link that points into the repository', () => {
    const link = join(root, 'outside', 'atalho');
    symlinkSync(join(root, 'repo', 'sub'), link);

    const result = resolveBackupBase({
      env: { GABARITA_BACKUP_DIR: join(link, 'dados') },
      home: home(),
      repoRoot: repoRoot(),
    });

    expect(result).toEqual({ ok: false, error: 'inside_repository' });
  });

  it('refuses the default when the home contains the repository as target', () => {
    const result = resolveBackupBase({
      env: {},
      home: join(root, 'repo'),
      repoRoot: repoRoot(),
    });

    expect(result).toEqual({ ok: false, error: 'inside_repository' });
  });

  describe('isInsideDirectory', () => {
    it('does not mistake sibling folders with the same prefix', () => {
      expect(isInsideDirectory(join(root, 'repo-outro'), join(root, 'repo'))).toBe(false);
    });

    it('keeps the full name of a nonexistent path right below the root', () => {
      expect(isInsideDirectory('/xhome', '/home')).toBe(false);
      expect(isInsideDirectory('/xhome/sub', '/xhome')).toBe(true);
    });

    it('considers the directory itself as inside', () => {
      expect(isInsideDirectory(repoRoot(), repoRoot())).toBe(true);
    });
  });
});

describe('CA-18 — directory name and manifest', () => {
  it('generates the name in UTC as YYYY-MM-DDTHHmmssZ', () => {
    expect(backupDirectoryName(NOW)).toBe(NAME);
    expect(BACKUP_NAME.test(NAME)).toBe(true);
  });

  it('uses UTC even when the local time zone differs', () => {
    expect(backupDirectoryName(new Date('2026-01-02T00:05:09-03:00'))).toBe('2026-01-02T030509Z');
  });

  const input = () => ({
    now: NOW,
    gitCommit: COMMIT,
    latestMigration: MIGRATION,
    supabaseCliVersion: '3.2.0',
    files: {
      'roles.sql': { bytes: 10, sha256: HASH },
      'schema.sql': { bytes: 20, sha256: HASH },
      'data.sql': { bytes: 30, sha256: HASH },
    },
    rowCounts: { 'public.exams': 14, 'auth.users': 1 },
  });

  it('builds a manifest that passes the schema', () => {
    const manifest = buildManifest(input());

    expect(manifestSchema.safeParse(manifest).success).toBe(true);
    expect(manifest.createdAt).toBe('2026-11-17T18:30:00.000Z');
    expect(manifest.rowCounts).toEqual({ 'public.exams': 14, 'auth.users': 1 });
  });

  it.each([
    ['short commit', { gitCommit: 'abc123' }],
    ['migration with an invalid name', { latestMigration: 'qualquer.sql' }],
    ['empty CLI version', { supabaseCliVersion: '' }],
    ['negative rowCounts', { rowCounts: { 'public.exams': -1 } }],
  ])('rejects %s', (_label, override) => {
    expect(() => buildManifest({ ...input(), ...override })).toThrow();
  });

  it('rejects a file with an invalid SHA-256 or zero size', () => {
    const bad = input();
    bad.files['data.sql'] = { bytes: 0, sha256: 'xyz' };

    expect(() => buildManifest(bad)).toThrow();
  });

  it('rejects a manifest missing one of the three files', () => {
    const manifest = JSON.parse(JSON.stringify(buildManifest(input())));
    delete manifest.files['roles.sql'];

    expect(manifestSchema.safeParse(manifest).success).toBe(false);
  });
});

describe('CA-19 — summarizeDataDump', () => {
  it('counts the rows of each COPY block, including an empty table', () => {
    const counts = summarizeDataDump(fixture('data-with-empty-table.sql'));

    expect(counts).toEqual({ 'public.exams': 2, 'public.answers': 0, 'auth.users': 1 });
  });

  it('counts rows with escaped tab, backslash and accents', () => {
    const counts = summarizeDataDump(fixture('data-with-escapes.sql'));

    expect(counts['public.notes']).toBe(5);
  });

  it('does not mistake a "\\\\." line (escaped value) for the terminator', () => {
    const counts = summarizeDataDump(fixture('data-with-escapes.sql'));

    expect(counts['public.tags']).toBe(2);
  });

  it('accepts unquoted names', () => {
    expect(summarizeDataDump(fixture('data-with-escapes.sql'))).toHaveProperty('public.notes');
  });

  it('returns an empty object for a dump without COPY blocks', () => {
    expect(summarizeDataDump('SET x = 1;\n')).toEqual({});
  });

  it('fails when the COPY block has no terminator', () => {
    expect(() => summarizeDataDump(fixture('data-unterminated.sql'))).toThrow(/public\.exams/);
  });

  it('fails when the dump is in INSERT format', () => {
    expect(() => summarizeDataDump(fixture('data-insert-format.sql'))).toThrow(/INSERT/);
  });

  it('does not mistake "INSERT INTO" text inside a COPY block for INSERT format', () => {
    const sql = 'COPY public.notes (id, body) FROM stdin;\n1\tINSERT INTO x\n\\.\n';

    expect(summarizeDataDump(sql)).toEqual({ 'public.notes': 1 });
  });
});

describe('CA-20 — validateDump', () => {
  const required = ['public.exams', 'public.answers', 'auth.users'];

  it('approves when all tables exist and there are users', () => {
    const counts = { 'public.exams': 0, 'public.answers': 0, 'auth.users': 1 };

    expect(validateDump(counts, required)).toEqual({ ok: true });
  });

  it('lists the missing tables', () => {
    const result = validateDump({ 'auth.users': 1 }, required);

    expect(result).toEqual({
      ok: false,
      missing: ['public.exams', 'public.answers'],
      emptyUsers: false,
    });
  });

  it('rejects auth.users with 0 rows', () => {
    const counts = { 'public.exams': 1, 'public.answers': 1, 'auth.users': 0 };

    expect(validateDump(counts, required)).toEqual({ ok: false, missing: [], emptyUsers: true });
  });

  it('rejects a missing auth.users as a missing table', () => {
    const counts = { 'public.exams': 1, 'public.answers': 1 };

    expect(validateDump(counts, required)).toEqual({
      ok: false,
      missing: ['auth.users'],
      emptyUsers: false,
    });
  });
});

describe('CA-21 — selectBackupsToPrune', () => {
  const names = (count: number) =>
    Array.from({ length: count }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}T120000Z`);

  it('deletes nothing with up to 8 copies', () => {
    expect(selectBackupsToPrune(names(8), 8)).toEqual([]);
    expect(selectBackupsToPrune([], 8)).toEqual([]);
  });

  it('deletes only the oldest beyond the limit, regardless of input order', () => {
    const entries = names(10).reverse();

    expect(selectBackupsToPrune(entries, 8)).toEqual(['2026-11-01T120000Z', '2026-11-02T120000Z']);
  });

  it('ignores .incomplete, encrypted files and other names', () => {
    const entries = [
      ...names(9),
      '2026-10-01T120000Z.incomplete',
      '2026-10-02T120000Z.tar.gz.gpg',
      'notas.txt',
      '2026-10-03T12:00:00Z',
    ];

    expect(selectBackupsToPrune(entries, 8)).toEqual(['2026-11-01T120000Z']);
  });

  it('respects a limit different from the default', () => {
    expect(selectBackupsToPrune(names(5), 2)).toEqual(names(3));
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid limit %s', (keep) => {
    expect(() => selectBackupsToPrune(names(3), keep)).toThrow(RangeError);
  });
});

describe('CA-22 — gpg arguments', () => {
  it('creates tar.gz and uses gpg --symmetric with no password in the arguments', () => {
    const { tar, gpg, archive, encrypted } = encryptionCommands('/backups', NAME);

    expect(archive).toBe(`/backups/${NAME}.tar.gz`);
    expect(encrypted).toBe(`/backups/${NAME}.tar.gz.gpg`);
    expect(tar).toEqual({ command: 'tar', args: ['-czf', archive, '-C', '/backups', NAME] });
    expect(gpg.command).toBe('gpg');
    expect(gpg.args).toContain('--symmetric');
    expect(gpg.args).toEqual(expect.arrayContaining(['--output', encrypted, archive]));
    expect(gpg.args.join(' ')).not.toMatch(/passphrase|--batch/i);
    expect(gpg.args).toEqual(expect.arrayContaining(['--pinentry-mode', 'loopback']));
  });
});

function memoryFs(initial: Record<string, string[]> = {}) {
  const dirs = new Map<string, string[]>(Object.entries(initial));
  const files = new Map<string, string>();
  const removed: string[] = [];
  const fs: BackupFs = {
    mkdir: async (path) => {
      dirs.set(path, dirs.get(path) ?? []);
    },
    writeFile: async (path, content) => {
      files.set(path, content);
    },
    readdir: async (path) => {
      if (path.endsWith('/supabase/migrations')) {
        return ['20261116000000_initial_schema.sql', MIGRATION, 'README.md'];
      }
      return [
        ...(dirs.get(path) ?? []),
        ...[...dirs.keys()]
          .filter((key) => key.startsWith(`${path}/`))
          .map((key) => key.slice(path.length + 1)),
      ];
    },
    rename: async (from, to) => {
      dirs.set(to, dirs.get(from) ?? []);
      dirs.delete(from);
    },
    rm: async (path) => {
      removed.push(path);
      dirs.delete(path);
    },
  };
  return { fs, dirs, files, removed };
}

const REQUIRED_PUBLIC = ['exams', 'answers'];
const GOOD_DATA = [
  'COPY "public"."exams" ("id") FROM stdin;',
  '1',
  '\\.',
  'COPY "public"."answers" ("id") FROM stdin;',
  '\\.',
  'COPY "auth"."users" ("id") FROM stdin;',
  'u1',
  '\\.',
  '',
].join('\n');

type Overrides = {
  failOn?: 'roles.sql' | 'schema.sql' | 'data.sql';
  data?: string;
  gpgFails?: boolean;
  tarStderr?: string;
};

function fakeRun(overrides: Overrides = {}) {
  const calls: Array<{ command: string; args: readonly string[]; interactive?: boolean }> = [];
  const run: CommandRunner = async (command, args, options) => {
    calls.push({ command, args, interactive: options?.interactive });
    const ok = (stdout: string): CommandResult => ({ code: 0, stdout, stderr: '' });
    const line = args.join(' ');
    const dump = !args.includes('dump')
      ? null
      : args.includes('--role-only')
        ? 'roles.sql'
        : args.includes('--data-only')
          ? 'data.sql'
          : 'schema.sql';
    if (dump !== null && dump === overrides.failOn) {
      return { code: 1, stdout: '', stderr: 'connection refused' };
    }
    if (command === 'git') return ok(`${COMMIT}\n`);
    if (command === 'gpg' && overrides.gpgFails) return { code: 2, stdout: '', stderr: 'no tty' };
    if (command === 'tar' && overrides.tarStderr !== undefined) {
      return { code: 2, stdout: '', stderr: overrides.tarStderr };
    }
    if (command === 'tar' || command === 'gpg') return ok('');
    if (line.includes('--version')) return ok('3.2.0\n');
    if (line.includes('--role-only')) return ok('CREATE ROLE x;\n');
    if (line.includes('--data-only')) return ok(overrides.data ?? GOOD_DATA);
    return ok('CREATE TABLE t();\n');
  };
  return { run, calls };
}

describe('CA-18, CA-20, CA-21 and CA-22 — runBackup', () => {
  const base = '/backups';
  const env = { GABARITA_BACKUP_DIR: base, SUPABASE_DB_PASSWORD: 'segredo-123' };
  const repoRoot = '/repo-inexistente';

  function deps(
    memory: ReturnType<typeof memoryFs>,
    runner: ReturnType<typeof fakeRun>,
    extraEnv: Record<string, string | undefined> = {},
  ) {
    return {
      run: runner.run,
      now: NOW,
      env: { ...env, ...extraEnv },
      fs: memory.fs,
      log: vi.fn(),
      home: '/home/x',
      repoRoot,
      publicTables: REQUIRED_PUBLIC,
    };
  }

  it('writes the three files and a valid manifest, and creates the encrypted copy', async () => {
    const memory = memoryFs();
    const runner = fakeRun();

    const result = await runBackup(deps(memory, runner));

    expect(result).toEqual({ ok: true, directory: `${base}/${NAME}` });
    for (const file of ['roles.sql', 'schema.sql', 'data.sql', 'manifest.json']) {
      expect(memory.files.has(`${base}/${NAME}/${file}`)).toBe(true);
    }
    const manifest = manifestSchema.parse(
      JSON.parse(memory.files.get(`${base}/${NAME}/manifest.json`)!),
    );
    expect(manifest.rowCounts).toEqual({ 'public.exams': 1, 'public.answers': 0, 'auth.users': 1 });
    expect(manifest.gitCommit).toBe(COMMIT);
    expect(manifest.latestMigration).toBe(MIGRATION);
    expect(manifest.supabaseCliVersion).toBe('3.2.0');
    expect(manifest.files['data.sql'].bytes).toBe(Buffer.byteLength(GOOD_DATA));
    const commands = runner.calls.map((call) => call.command);
    expect(commands).toContain('tar');
    expect(commands).toContain('gpg');
    expect(runner.calls.find((call) => call.command === 'gpg')?.interactive).toBe(true);
    expect(memory.removed).toContain(`${base}/${NAME}.tar.gz`);
  });

  it('runs the three dumps with the contract arguments', async () => {
    const runner = fakeRun();

    await runBackup(deps(memoryFs(), runner));

    const dumps = runner.calls.filter((call) => call.args.includes('dump'));
    expect(dumps.map((call) => call.args)).toEqual([
      ['supabase', 'db', 'dump', '--remote', '--role-only'],
      ['supabase', 'db', 'dump', '--remote'],
      ['supabase', 'db', 'dump', '--remote', '--data-only', '--use-copy'],
    ]);
  });

  it('refuses an invalid destination before any command', async () => {
    const runner = fakeRun();

    const result = await runBackup(deps(memoryFs(), runner, { GABARITA_BACKUP_DIR: 'relativo' }));

    expect(result.ok).toBe(false);
    expect(runner.calls).toEqual([]);
  });

  it('CA-7 — refuses without SUPABASE_DB_PASSWORD, before connecting', async () => {
    const memory = memoryFs();
    const runner = fakeRun();

    const result = await runBackup(deps(memory, runner, { SUPABASE_DB_PASSWORD: undefined }));

    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining('SUPABASE_DB_PASSWORD'),
    });
    expect(runner.calls).toEqual([]);
    expect(memory.dirs.size).toBe(0);
  });

  it('refuses an invalid GABARITA_BACKUP_KEEP before connecting', async () => {
    const runner = fakeRun();

    const result = await runBackup(deps(memoryFs(), runner, { GABARITA_BACKUP_KEEP: '0' }));

    expect(result.ok).toBe(false);
    expect(runner.calls).toEqual([]);
  });

  it.each(['roles.sql', 'schema.sql', 'data.sql'] as const)(
    'renames to .incomplete and skips retention when the dump of %s fails',
    async (file) => {
      const old = Array.from({ length: 9 }, (_, i) => `2026-10-0${i + 1}T120000Z`);
      const memory = memoryFs({ [base]: old });

      const result = await runBackup(deps(memory, fakeRun({ failOn: file })));

      expect(result).toEqual({
        ok: false,
        directory: `${base}/${NAME}.incomplete`,
        reason: expect.stringContaining(file),
      });
      expect(memory.dirs.has(`${base}/${NAME}.incomplete`)).toBe(true);
      expect(memory.dirs.has(`${base}/${NAME}`)).toBe(false);
      expect(memory.removed).toEqual([]);
    },
  );

  it('does not leak the database password in the failure reason', async () => {
    const run: CommandRunner = async () => ({
      code: 1,
      stdout: '',
      stderr: 'password authentication failed for segredo-123',
    });

    const result = await runBackup({ ...deps(memoryFs(), fakeRun()), run });

    expect(JSON.stringify(result)).not.toContain('segredo-123');
  });

  it('marks as incomplete when a public table is missing', async () => {
    const memory = memoryFs();
    const data = 'COPY "auth"."users" ("id") FROM stdin;\nu1\n\\.\n';

    const result = await runBackup(deps(memory, fakeRun({ data })));

    expect(result).toMatchObject({
      ok: false,
      directory: `${base}/${NAME}.incomplete`,
      reason: expect.stringContaining('public.exams'),
    });
    expect(memory.removed).toEqual([]);
  });

  it('marks as incomplete when auth.users has 0 rows', async () => {
    const data = GOOD_DATA.replace('u1\n', '');

    const result = await runBackup(deps(memoryFs(), fakeRun({ data })));

    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('auth.users') });
  });

  it('marks as incomplete when the dump is in INSERT format', async () => {
    const data = 'INSERT INTO "public"."exams" VALUES (1);\n';

    const result = await runBackup(deps(memoryFs(), fakeRun({ data })));

    expect(result).toMatchObject({ ok: false, directory: `${base}/${NAME}.incomplete` });
  });

  it('deletes only backups older than the newest 8, after encrypting', async () => {
    const old = [
      ...Array.from({ length: 9 }, (_, i) => `2026-10-0${i + 1}T120000Z`),
      '2026-09-01T120000Z.incomplete',
      'notas.txt',
    ];
    const memory = memoryFs({ [base]: old });

    const result = await runBackup(deps(memory, fakeRun()));

    expect(result.ok).toBe(true);
    expect(memory.removed.filter((path) => !path.endsWith(`${NAME}.tar.gz`))).toEqual([
      `${base}/2026-10-01T120000Z`,
      `${base}/2026-10-01T120000Z.tar.gz.gpg`,
      `${base}/2026-10-02T120000Z`,
      `${base}/2026-10-02T120000Z.tar.gz.gpg`,
    ]);
  });

  it('respects GABARITA_BACKUP_KEEP', async () => {
    const old = ['2026-10-01T120000Z', '2026-10-02T120000Z', '2026-10-03T120000Z'];
    const memory = memoryFs({ [base]: old });

    await runBackup(deps(memory, fakeRun(), { GABARITA_BACKUP_KEEP: '2' }));

    expect(memory.removed.filter((path) => !path.endsWith(`${NAME}.tar.gz`))).toEqual([
      `${base}/2026-10-01T120000Z`,
      `${base}/2026-10-01T120000Z.tar.gz.gpg`,
      `${base}/2026-10-02T120000Z`,
      `${base}/2026-10-02T120000Z.tar.gz.gpg`,
    ]);
  });

  it('fails without deleting old backups when gpg does not create the encrypted copy', async () => {
    const memory = memoryFs({
      [base]: Array.from({ length: 9 }, (_, i) => `2026-10-0${i + 1}T120000Z`),
    });

    const result = await runBackup(deps(memory, fakeRun({ gpgFails: true })));

    expect(result).toMatchObject({ ok: false, directory: `${base}/${NAME}` });
    expect(memory.removed.some((path) => /T120000Z$/.test(path))).toBe(false);
    expect(memory.removed).toContain(`${base}/${NAME}.tar.gz`);
  });

  it('shows the tar error without the database password and does not call gpg', async () => {
    const memory = memoryFs();
    const runner = fakeRun({ tarStderr: `tar: cannot write with ${env.SUPABASE_DB_PASSWORD}` });

    const result = await runBackup(deps(memory, runner));

    expect(result).toMatchObject({ ok: false, directory: `${base}/${NAME}` });
    const reason = result.ok ? '' : result.reason;
    expect(reason).toContain('tar: tar: cannot write with ***');
    expect(reason).not.toContain(env.SUPABASE_DB_PASSWORD);
    expect(runner.calls.some((call) => call.command === 'gpg')).toBe(false);
    expect([...memory.dirs.keys()].some((key) => key.endsWith('.incomplete'))).toBe(false);
  });
});
