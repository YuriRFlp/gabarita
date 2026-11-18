import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKUP_FILES, manifestSchema, type TableCounts } from './backup-manifest.ts';
import type { CommandRunner } from './command-runner.ts';
import { isLocalUrl, readLocalSupabase } from './local-supabase.ts';

type Difference = { table: string; expected: number; actual: number | null };

export function compareCounts(
  expected: TableCounts,
  actual: TableCounts,
): { ok: true } | { ok: false; differences: Difference[] } {
  const differences: Difference[] = [];
  for (const table of Object.keys(expected).sort()) {
    const wanted = expected[table]!;
    const found = Object.hasOwn(actual, table) ? actual[table]! : null;
    if (found !== wanted) differences.push({ table, expected: wanted, actual: found });
  }
  return differences.length === 0 ? { ok: true } : { ok: false, differences };
}

export type VerifyDeps = {
  /** API URL of the Supabase that will be wiped and restored. */
  supabaseUrl: string;
  /** Docker container of the local database (`supabase_db_<project_id>`). */
  dbContainer: string;
  run: CommandRunner;
  readFile: (path: string) => Promise<Buffer>;
  log: (line: string) => void;
};

const TABLE_NAME = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/;
const REMOTE_SQL = '/tmp/gabarita-restore.sql';

type VerifyResult = { ok: true } | { ok: false; reason: string };

function describeDifferences(differences: Difference[]): string {
  const lines = differences.map(
    (d) => `  ${d.table}: esperado ${d.expected}, restaurado ${d.actual ?? 'tabela ausente'}`,
  );
  return `As contagens restauradas diferem do manifesto:\n${lines.join('\n')}`;
}

function psql(container: string, ...args: string[]): [string, string[]] {
  return [
    'docker',
    [
      'exec',
      container,
      'psql',
      '-U',
      'supabase_admin',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      ...args,
    ],
  ];
}

/** Refuses unless the local Supabase URL passes isLocalUrl; checks hashes before restoring. */
export async function verifyBackup(directory: string, deps: VerifyDeps): Promise<VerifyResult> {
  if (!isLocalUrl(deps.supabaseUrl)) {
    return {
      ok: false,
      reason: 'Recusado: a URL do Supabase não é a local. A verificação apaga o banco alvo.',
    };
  }

  let manifest;
  try {
    manifest = manifestSchema.parse(
      JSON.parse((await deps.readFile(join(directory, 'manifest.json'))).toString('utf8')),
    );
  } catch {
    return { ok: false, reason: 'manifest.json ausente ou inválido.' };
  }

  for (const file of BACKUP_FILES) {
    const expected = manifest.files[file];
    let actual: string;
    try {
      actual = createHash('sha256')
        .update(await deps.readFile(join(directory, file)))
        .digest('hex');
    } catch {
      return { ok: false, reason: `Arquivo ${file} ausente.` };
    }
    if (!expected || actual !== expected.sha256) {
      return {
        ok: false,
        reason: `O SHA-256 de ${file} não confere com o manifesto; nada foi restaurado.`,
      };
    }
  }

  const tables = Object.keys(manifest.rowCounts);
  const invalid = tables.find((table) => !TABLE_NAME.test(table));
  if (invalid) return { ok: false, reason: `Nome de tabela inválido no manifesto: ${invalid}` };

  const steps: Array<{ label: string; command: [string, string[]]; copiesDump?: true }> = [
    {
      label: 'Recriando o banco local sem seed',
      command: ['npx', ['supabase', 'db', 'reset', '--no-seed']],
    },
    {
      label: 'Copiando o dump para o contêiner',
      command: ['docker', ['cp', join(directory, 'data.sql'), `${deps.dbContainer}:${REMOTE_SQL}`]],
      copiesDump: true,
    },
    {
      label: 'Restaurando os dados',
      command: psql(
        deps.dbContainer,
        '--single-transaction',
        '-c',
        'set session_replication_role = replica',
        '-f',
        REMOTE_SQL,
      ),
    },
  ];
  let copied = false;
  try {
    for (const step of steps) {
      deps.log(`${step.label}...`);
      if (step.copiesDump) copied = true;
      const result = await deps.run(...step.command);
      if (result.code !== 0) {
        return {
          ok: false,
          reason: `${step.label} falhou (código ${result.code}): ${result.stderr.trim()}`,
        };
      }
    }
    return await compareRestored(tables, manifest.rowCounts, deps);
  } finally {
    if (copied) {
      await deps.run('docker', ['exec', deps.dbContainer, 'rm', '-f', REMOTE_SQL]);
    }
  }
}

async function compareRestored(
  tables: string[],
  expected: TableCounts,
  deps: VerifyDeps,
): Promise<VerifyResult> {
  const query = tables
    .map((table) => {
      const [schema, name] = table.split('.');
      return `select '${table}', count(*) from "${schema}"."${name}"`;
    })
    .join(' union all ');
  const counted = await deps.run(...psql(deps.dbContainer, '-At', '-F', '|', '-c', query));
  if (counted.code !== 0) {
    return { ok: false, reason: `A contagem das tabelas falhou: ${counted.stderr.trim()}` };
  }
  const actual: TableCounts = {};
  for (const line of counted.stdout.split('\n')) {
    const [table, count] = line.trim().split('|');
    if (table && count !== undefined) actual[table] = Number(count);
  }

  const comparison = compareCounts(expected, actual);
  if (!comparison.ok) return { ok: false, reason: describeDifferences(comparison.differences) };
  deps.log(`Restauração conferida: ${tables.length} tabelas com a contagem do manifesto.`);
  return { ok: true };
}

export async function createVerifyDeps(log: (line: string) => void): Promise<VerifyDeps> {
  const { runCommand } = await import('./command-runner.ts');
  const config = await readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  const projectId = /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1];
  if (!projectId) throw new Error('project_id not found in supabase/config.toml.');
  return {
    supabaseUrl: readLocalSupabase().url,
    dbContainer: `supabase_db_${projectId}`,
    run: runCommand,
    readFile: (path) => readFile(path),
    log,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2];
  if (!directory) {
    console.error('Uso: npm run backup:verify -- <diretório do backup>');
    process.exitCode = 2;
  } else {
    const result = await verifyBackup(directory, await createVerifyDeps(console.log));
    if (!result.ok) {
      console.error(`Verificação falhou: ${result.reason}`);
      process.exitCode = 1;
    }
  }
}
