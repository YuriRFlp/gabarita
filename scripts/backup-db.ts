import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  manifestSchema,
  type BackupFile,
  type BackupManifest,
  type TableCounts,
} from './backup-manifest.ts';
import type { CommandRunner } from './command-runner.ts';
import { MIGRATION_NAME } from './push-migrations.ts';
import { readPublicTables } from './public-tables.ts';
import { requireDbPassword, scrubSecret } from './remote-env.ts';

export const BACKUP_NAME = /^\d{4}-\d{2}-\d{2}T\d{6}Z$/;
const DEFAULT_KEEP = 8;
const USERS_TABLE = 'auth.users';

/** UTC, e.g. 2026-11-17T183000Z. */
export function backupDirectoryName(now: Date): string {
  const iso = now.toISOString();
  return `${iso.slice(0, 10)}T${iso.slice(11, 19).replaceAll(':', '')}Z`;
}

// Resolves symbolic links on the deepest existing ancestor, so a path that does not exist yet
// (the backup base on the first run) is still compared by where it would really land.
function realPathOf(path: string): string {
  const absolute = resolve(path);
  try {
    return realpathSync(absolute);
  } catch {
    const parent = dirname(absolute);
    if (parent === absolute) return absolute;
    return join(realPathOf(parent), basename(absolute));
  }
}

/** True when `child` is `parent` itself or lies below it, comparing real paths. */
export function isInsideDirectory(child: string, parent: string): boolean {
  const path = relative(realPathOf(parent), realPathOf(child));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

export function resolveBackupBase(input: {
  env: Record<string, string | undefined>;
  home: string;
  repoRoot: string;
}): { ok: true; path: string } | { ok: false; error: 'not_absolute' | 'inside_repository' } {
  const configured = input.env.GABARITA_BACKUP_DIR?.trim();
  const path = configured ? configured : join(input.home, 'gabarita-backups');
  if (!isAbsolute(path)) return { ok: false, error: 'not_absolute' };
  if (isInsideDirectory(path, input.repoRoot)) return { ok: false, error: 'inside_repository' };
  return { ok: true, path: resolve(path) };
}

const COPY_START = /^COPY (?:"([^"]+)"|(\w+))\.(?:"([^"]+)"|(\w+)) .*FROM stdin;$/;

/** Counts rows per `COPY schema.table ... FROM stdin;` block. Throws on `INSERT` dumps and unterminated blocks. */
export function summarizeDataDump(sql: string): TableCounts {
  const counts: TableCounts = {};
  let current: string | null = null;
  for (const line of sql.split('\n')) {
    if (current === null) {
      const start = COPY_START.exec(line);
      if (start) {
        current = `${start[1] ?? start[2]}.${start[3] ?? start[4]}`;
        counts[current] = 0;
      } else if (line.startsWith('INSERT INTO')) {
        throw new Error(
          'The data dump uses INSERT statements; it must be generated with --use-copy.',
        );
      }
    } else if (line === '\\.') {
      current = null;
    } else {
      counts[current] = (counts[current] ?? 0) + 1;
    }
  }
  if (current !== null) throw new Error(`The COPY block of ${current} has no terminator.`);
  return counts;
}

export function validateDump(
  counts: TableCounts,
  requiredTables: readonly string[],
): { ok: true } | { ok: false; missing: string[]; emptyUsers: boolean } {
  const missing = requiredTables.filter((table) => !Object.hasOwn(counts, table));
  const emptyUsers = counts[USERS_TABLE] === 0;
  if (missing.length === 0 && !emptyUsers) return { ok: true };
  return { ok: false, missing, emptyUsers };
}

export function buildManifest(input: {
  now: Date;
  gitCommit: string;
  latestMigration: string;
  supabaseCliVersion: string;
  files: Record<BackupFile, { bytes: number; sha256: string }>;
  rowCounts: TableCounts;
}): BackupManifest {
  return manifestSchema.parse({
    createdAt: input.now.toISOString(),
    gitCommit: input.gitCommit,
    latestMigration: input.latestMigration,
    supabaseCliVersion: input.supabaseCliVersion,
    files: input.files,
    rowCounts: input.rowCounts,
  });
}

/** Only complete backups (exact name pattern) are candidates; `.incomplete` and other names never are. */
export function selectBackupsToPrune(entries: readonly string[], keep: number): string[] {
  if (!Number.isInteger(keep) || keep < 1) throw new RangeError('keep must be a positive integer.');
  const backups = entries.filter((entry) => BACKUP_NAME.test(entry)).sort();
  return backups.slice(0, Math.max(0, backups.length - keep));
}

/** The password is requested by gpg itself: it never goes through arguments or the environment. */
export function encryptionCommands(
  base: string,
  name: string,
): {
  archive: string;
  encrypted: string;
  tar: { command: string; args: string[] };
  gpg: { command: string; args: string[] };
} {
  const archive = join(base, `${name}.tar.gz`);
  const encrypted = `${archive}.gpg`;
  return {
    archive,
    encrypted,
    tar: { command: 'tar', args: ['-czf', archive, '-C', base, name] },
    gpg: {
      command: 'gpg',
      args: [
        '--pinentry-mode',
        'loopback',
        '--symmetric',
        '--cipher-algo',
        'AES256',
        '--output',
        encrypted,
        archive,
      ],
    },
  };
}

export type BackupFs = {
  mkdir(path: string): Promise<void>;
  writeFile(path: string, content: string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  rename(from: string, to: string): Promise<void>;
  rm(path: string): Promise<void>;
};

export const nodeBackupFs: BackupFs = {
  mkdir: async (path) => {
    await mkdir(path, { recursive: true, mode: 0o700 });
  },
  writeFile: (path, content) => writeFile(path, content, { mode: 0o600 }),
  readdir: (path) => readdir(path),
  rename: (from, to) => rename(from, to),
  rm: (path) => rm(path, { recursive: true, force: true }),
};

const DUMPS: ReadonlyArray<{ file: BackupFile; args: readonly string[] }> = [
  { file: 'roles.sql', args: ['--role-only'] },
  { file: 'schema.sql', args: [] },
  { file: 'data.sql', args: ['--data-only', '--use-copy'] },
];

type BackupResult =
  { ok: true; directory: string } | { ok: false; directory?: string; reason: string };

const BASE_ERRORS = {
  not_absolute: 'GABARITA_BACKUP_DIR precisa ser um caminho absoluto.',
  inside_repository: 'GABARITA_BACKUP_DIR não pode ficar dentro do repositório.',
} as const;

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function fileInfo(content: string): { bytes: number; sha256: string } {
  return { bytes: Buffer.byteLength(content), sha256: sha256(content) };
}

function parseKeep(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return DEFAULT_KEEP;
  const keep = Number(raw);
  return Number.isInteger(keep) && keep >= 1 ? keep : null;
}

/**
 * Runs `supabase db dump --remote` three times (--role-only; schema; --data-only --use-copy),
 * validates, writes the manifest, encrypts the copy for the cloud and only then prunes.
 */
export async function runBackup(deps: {
  run: CommandRunner;
  now: Date;
  env: Record<string, string | undefined>;
  fs: BackupFs;
  log: (line: string) => void;
  home: string;
  repoRoot: string;
  publicTables: readonly string[];
}): Promise<BackupResult> {
  const { run, now, env, fs, log, repoRoot } = deps;

  const base = resolveBackupBase({ env, home: deps.home, repoRoot });
  if (!base.ok) return { ok: false, reason: BASE_ERRORS[base.error] };
  const keep = parseKeep(env.GABARITA_BACKUP_KEEP);
  if (keep === null) {
    return { ok: false, reason: 'GABARITA_BACKUP_KEEP precisa ser um inteiro maior que 0.' };
  }
  const password = requireDbPassword(env);
  if (!password.ok) return { ok: false, reason: password.message };

  const name = backupDirectoryName(now);
  const directory = join(base.path, name);
  await fs.mkdir(directory);

  const fail = async (reason: string): Promise<BackupResult> => {
    const incomplete = `${directory}.incomplete`;
    await fs.rename(directory, incomplete);
    return { ok: false, directory: incomplete, reason };
  };

  const contents: Record<BackupFile, string> = {
    'roles.sql': '',
    'schema.sql': '',
    'data.sql': '',
  };
  for (const dump of DUMPS) {
    log(`Exportando ${dump.file}...`);
    const result = await run('npx', ['supabase', 'db', 'dump', '--remote', ...dump.args], {
      cwd: repoRoot,
      env,
    });
    if (result.code !== 0) {
      return fail(
        `supabase db dump falhou ao gerar ${dump.file} (código ${result.code}): ${scrubSecret(result.stderr.trim(), env)}`,
      );
    }
    contents[dump.file] = result.stdout;
    await fs.writeFile(join(directory, dump.file), result.stdout);
  }

  let rowCounts: TableCounts;
  try {
    rowCounts = summarizeDataDump(contents['data.sql']);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  const required = [...deps.publicTables.map((table) => `public.${table}`), USERS_TABLE];
  const validation = validateDump(rowCounts, required);
  if (!validation.ok) {
    const parts = [];
    if (validation.missing.length > 0)
      parts.push(`tabelas ausentes: ${validation.missing.join(', ')}`);
    if (validation.emptyUsers) parts.push('auth.users sem nenhuma linha');
    return fail(`Dump incompleto (${parts.join('; ')}).`);
  }

  let manifest: BackupManifest;
  try {
    const [commit, cli, migrations] = await Promise.all([
      run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, env }),
      run('npx', ['supabase', '--version'], { cwd: repoRoot, env }),
      fs.readdir(join(repoRoot, 'supabase', 'migrations')),
    ]);
    const latestMigration = migrations
      .filter((file) => MIGRATION_NAME.test(file))
      .sort()
      .at(-1);
    manifest = buildManifest({
      now,
      gitCommit: commit.stdout.trim(),
      latestMigration: latestMigration ?? '',
      supabaseCliVersion: cli.stdout.trim(),
      files: {
        'roles.sql': fileInfo(contents['roles.sql']),
        'schema.sql': fileInfo(contents['schema.sql']),
        'data.sql': fileInfo(contents['data.sql']),
      },
      rowCounts,
    });
  } catch (error) {
    return fail(
      `Não foi possível montar o manifesto: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await fs.writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const encryption = encryptionCommands(base.path, name);
  log('Criptografando a cópia para a nuvem (o gpg pedirá a senha)...');
  const tar = await run(encryption.tar.command, encryption.tar.args, { cwd: repoRoot, env });
  const gpg =
    tar.code === 0
      ? await run(encryption.gpg.command, encryption.gpg.args, {
          cwd: repoRoot,
          env,
          interactive: true,
        })
      : null;
  await fs.rm(encryption.archive);
  if (tar.code !== 0 || gpg === null || gpg.code !== 0) {
    await fs.rm(encryption.encrypted);
    return {
      ok: false,
      directory,
      reason: `O backup está completo, mas a cópia criptografada (.tar.gz.gpg) não foi criada.${tar.stderr ? ` tar: ${scrubSecret(tar.stderr.trim(), env)}` : ''}`,
    };
  }

  const toPrune = selectBackupsToPrune(await fs.readdir(base.path), keep);
  for (const old of toPrune) {
    await fs.rm(join(base.path, old));
    await fs.rm(join(base.path, `${old}.tar.gz.gpg`));
  }
  if (toPrune.length > 0) log(`Retenção: ${toPrune.length} backup(s) antigo(s) apagado(s).`);

  log(`Backup concluído: ${directory}`);
  log(`Envie ${encryption.encrypted} para o Google Drive (passo manual do runbook).`);
  return { ok: true, directory };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { runCommand } = await import('./command-runner.ts');
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));
  const result = await runBackup({
    run: runCommand,
    now: new Date(),
    env: process.env,
    fs: nodeBackupFs,
    log: console.log,
    home: homedir(),
    repoRoot,
    publicTables: readPublicTables(),
  });
  if (!result.ok) {
    console.error(`Backup falhou: ${result.reason}`);
    if (result.directory) console.error(`Diretório mantido para investigação: ${result.directory}`);
    process.exitCode = 1;
  }
}
