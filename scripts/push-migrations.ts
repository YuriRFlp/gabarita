import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { runCommand, type CommandRunner } from './command-runner.ts';
import { readLinkedProjectRef, requireDbPassword, scrubSecret } from './remote-env.ts';

export const MIGRATION_NAME = /^\d{14}_[a-z0-9_]+\.sql$/;

const MIGRATIONS_DIR = 'supabase/migrations/';
const TIMESTAMP = /^\d{14}/;

export type GitSnapshot = {
  porcelainStatus: string;
  head: string;
  upstream: string | null;
  changesSinceMain: ReadonlyArray<{
    status: 'A' | 'M' | 'D' | `R${string}` | string;
    path: string;
  }>;
  mainMigrations: readonly string[];
};

export type PreflightError =
  | { type: 'dirty_worktree' }
  | { type: 'not_pushed' }
  | { type: 'applied_migration_changed'; path: string }
  | { type: 'migration_out_of_order'; file: string; latestOnMain: string }
  | { type: 'invalid_migration_name'; file: string };

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

export function checkMigrationPreflight(
  snapshot: GitSnapshot,
): { ok: true; newMigrations: string[] } | { ok: false; errors: PreflightError[] } {
  const errors: PreflightError[] = [];

  if (snapshot.porcelainStatus.trim() !== '') errors.push({ type: 'dirty_worktree' });
  if (snapshot.upstream === null || snapshot.upstream !== snapshot.head) {
    errors.push({ type: 'not_pushed' });
  }

  const inMigrations = snapshot.changesSinceMain.filter((change) =>
    change.path.startsWith(MIGRATIONS_DIR),
  );

  // A rename is reported with its old path, which is the file origin/main already has.
  for (const change of inMigrations) {
    if (change.status !== 'A')
      errors.push({ type: 'applied_migration_changed', path: change.path });
  }

  const latestOnMain = snapshot.mainMigrations
    .map(baseName)
    .reduce<string | null>(
      (latest, name) => (latest === null || name > latest ? name : latest),
      null,
    );

  const newMigrations: string[] = [];
  for (const change of inMigrations) {
    if (change.status !== 'A') continue;
    const file = baseName(change.path);
    newMigrations.push(file);
    if (!MIGRATION_NAME.test(file)) errors.push({ type: 'invalid_migration_name', file });
    const timestamp = TIMESTAMP.exec(file)?.[0];
    if (
      latestOnMain !== null &&
      timestamp !== undefined &&
      timestamp <= latestOnMain.slice(0, 14)
    ) {
      errors.push({ type: 'migration_out_of_order', file, latestOnMain });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, newMigrations };
}

export function describePreflightError(error: PreflightError): string {
  switch (error.type) {
    case 'dirty_worktree':
      return 'A árvore de trabalho tem mudanças não commitadas. Faça commit ou descarte antes de aplicar.';
    case 'not_pushed':
      return 'O HEAD é diferente do upstream (branch não publicada ou desatualizada). Rode git push e confira o upstream.';
    case 'applied_migration_changed':
      return `A migração ${error.path} já existe em origin/main e foi modificada, renomeada ou apagada. Migração aplicada não se edita; crie uma nova.`;
    case 'migration_out_of_order':
      return `A migração ${error.file} tem timestamp menor ou igual ao da última de origin/main (${error.latestOnMain}). Renomeie com um timestamp mais novo.`;
    case 'invalid_migration_name':
      return `O nome ${error.file} está fora do padrão AAAAMMDDHHmmss_snake_case.sql.`;
  }
}

export async function pushMigrations(deps: {
  run: CommandRunner;
  confirm: (prompt: string) => Promise<string>;
  readSnapshot: () => Promise<GitSnapshot>;
  linkedRef: () => Promise<string | null>;
  env: Record<string, string | undefined>;
  log: (line: string) => void;
}): Promise<'pushed' | 'aborted' | 'refused'> {
  const { run, confirm, log, env } = deps;

  const preflight = checkMigrationPreflight(await deps.readSnapshot());
  if (!preflight.ok) {
    log('Não é seguro aplicar as migrações:');
    for (const error of preflight.errors) log(`- ${describePreflightError(error)}`);
    return 'refused';
  }

  const password = requireDbPassword(env);
  if (!password.ok) {
    log(password.message);
    return 'refused';
  }

  const ref = await deps.linkedRef();
  if (ref === null) {
    log(
      'Nenhum projeto Supabase está ligado. Rode `npm run db:link -- <identificador>` (supabase link) primeiro.',
    );
    return 'refused';
  }

  log(`Projeto ligado: ${ref}`);
  log(
    preflight.newMigrations.length > 0
      ? `Migrações novas: ${preflight.newMigrations.join(', ')}`
      : 'Nenhuma migração nova em relação a origin/main.',
  );

  const dryRun = await run(
    'npx',
    ['supabase', 'db', 'push', '--remote', '--dry-run', '--include-seed'],
    {
      env,
    },
  );
  if (dryRun.code !== 0) {
    log('O ensaio (dry-run) falhou; nada foi aplicado.');
    if (dryRun.stderr) log(scrubSecret(dryRun.stderr, env));
    return 'refused';
  }
  if (dryRun.stdout) log(scrubSecret(dryRun.stdout, env));
  if (dryRun.stderr) log(scrubSecret(dryRun.stderr, env));

  const answer = await confirm(
    `Para aplicar no remoto, digite o identificador do projeto (${ref}): `,
  );
  if (answer.trim() !== ref) {
    log('Confirmação diferente do identificador do projeto. Nada foi aplicado.');
    return 'aborted';
  }

  // The CLI cannot prompt (stdout is captured), and the typed ref above is the confirmation.
  const push = await run('npx', ['supabase', 'db', 'push', '--remote', '--include-seed', '--yes'], {
    env,
  });
  if (push.code !== 0) {
    throw new Error(
      `supabase db push falhou (código ${push.code}): ${scrubSecret(push.stderr.trim(), env)}`,
    );
  }
  if (push.stdout) log(scrubSecret(push.stdout, env));
  log('Migrações aplicadas. Rode `npm run db:test:remote` para conferir.');
  return 'pushed';
}

async function git(
  run: CommandRunner,
  args: string[],
  allowFailure = false,
): Promise<string | null> {
  const result = await run('git', args);
  if (result.code !== 0) {
    if (allowFailure) return null;
    throw new Error(`git ${args.join(' ')} falhou: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

export async function readGitSnapshot(run: CommandRunner): Promise<GitSnapshot> {
  await git(run, ['fetch', 'origin']);
  const porcelainStatus = (await git(run, ['status', '--porcelain'])) ?? '';
  const head = ((await git(run, ['rev-parse', 'HEAD'])) ?? '').trim();
  const upstreamOutput = await git(run, ['rev-parse', '@{u}'], true);
  const upstream = upstreamOutput?.trim() || null;

  const diff =
    (await git(run, [
      'diff',
      '--name-status',
      'origin/main...HEAD',
      '--',
      'supabase/migrations',
    ])) ?? '';
  const changesSinceMain: Array<{ status: string; path: string }> = [];
  for (const line of diff.split('\n').filter((l) => l.trim() !== '')) {
    const [status = '', first = '', second] = line.split('\t');
    // A copy leaves the source untouched and only adds the second path.
    if (!status.startsWith('C')) changesSinceMain.push({ status, path: first });
    // A rename frees the old path and adds the new one.
    if ((status.startsWith('R') || status.startsWith('C')) && second !== undefined) {
      changesSinceMain.push({ status: 'A', path: second });
    }
  }

  const tree = (await git(run, ['ls-tree', '--name-only', 'origin/main', MIGRATIONS_DIR])) ?? '';
  const mainMigrations = tree.split('\n').filter((l) => l.trim() !== '');

  return { porcelainStatus, head, upstream, changesSinceMain, mainMigrations };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = process.cwd();
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const outcome = await pushMigrations({
      run: runCommand,
      confirm: (prompt) => readline.question(prompt),
      readSnapshot: () => readGitSnapshot(runCommand),
      linkedRef: () => readLinkedProjectRef(repoRoot),
      env: process.env,
      log: (line) => console.log(line),
    });
    process.exitCode = outcome === 'pushed' ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    readline.close();
  }
}
