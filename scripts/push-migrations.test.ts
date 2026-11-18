import { describe, expect, it, vi } from 'vitest';
import type { CommandResult, CommandRunner } from './command-runner';
import {
  checkMigrationPreflight,
  describePreflightError,
  MIGRATION_NAME,
  pushMigrations,
  readGitSnapshot,
  type GitSnapshot,
  type PreflightError,
} from './push-migrations';

const DIR = 'supabase/migrations/';
const MAIN = [`${DIR}20260101000000_init.sql`, `${DIR}20260102000000_rls.sql`];

function snapshot(overrides: Partial<GitSnapshot> = {}): GitSnapshot {
  return {
    porcelainStatus: '',
    head: 'abc123',
    upstream: 'abc123',
    changesSinceMain: [],
    mainMigrations: MAIN,
    ...overrides,
  };
}

function errorsOf(overrides: Partial<GitSnapshot>): PreflightError[] {
  const result = checkMigrationPreflight(snapshot(overrides));
  if (result.ok) throw new Error('expected the preflight to refuse');
  return result.errors;
}

describe('CA-5 — MIGRATION_NAME', () => {
  it.each(['20260103000000_add_notes.sql', '20260103000000_a1.sql'])('accepts %s', (name) => {
    expect(MIGRATION_NAME.test(name)).toBe(true);
  });

  it.each([
    '2026010300000_short.sql',
    '20260103000000_CamelCase.sql',
    '20260103000000-kebab.sql',
    '20260103000000_.sql',
    '20260103000000_notes.txt',
    '20260103000000notes.sql',
  ])('rejects %s', (name) => {
    expect(MIGRATION_NAME.test(name)).toBe(false);
  });
});

describe('CA-5 — checkMigrationPreflight', () => {
  it('approves a clean, pushed tree with no new migrations', () => {
    expect(checkMigrationPreflight(snapshot())).toEqual({ ok: true, newMigrations: [] });
  });

  it('lists the valid new migrations by file name', () => {
    const result = checkMigrationPreflight(
      snapshot({
        changesSinceMain: [
          { status: 'A', path: `${DIR}20260103000000_add_notes.sql` },
          { status: 'A', path: `${DIR}20260104000000_add_tags.sql` },
        ],
      }),
    );
    expect(result).toEqual({
      ok: true,
      newMigrations: ['20260103000000_add_notes.sql', '20260104000000_add_tags.sql'],
    });
  });

  it('refuses a working tree with changes', () => {
    expect(errorsOf({ porcelainStatus: ' M src/app.ts\n' })).toEqual([{ type: 'dirty_worktree' }]);
  });

  it('refuses when there is no upstream (unpublished branch)', () => {
    expect(errorsOf({ upstream: null })).toEqual([{ type: 'not_pushed' }]);
  });

  it('refuses when HEAD differs from upstream', () => {
    expect(errorsOf({ upstream: 'def456' })).toEqual([{ type: 'not_pushed' }]);
  });

  it.each(['M', 'D', 'R100'])('refuses an origin/main migration with status %s', (status) => {
    expect(errorsOf({ changesSinceMain: [{ status, path: MAIN[0]! }] })).toEqual([
      { type: 'applied_migration_changed', path: MAIN[0] },
    ]);
  });

  it('refuses a new migration with a timestamp lower than the latest on origin/main', () => {
    const file = '20260101120000_late.sql';
    expect(errorsOf({ changesSinceMain: [{ status: 'A', path: DIR + file }] })).toEqual([
      { type: 'migration_out_of_order', file, latestOnMain: '20260102000000_rls.sql' },
    ]);
  });

  it('refuses a new migration with a timestamp equal to the latest on origin/main', () => {
    const file = '20260102000000_other.sql';
    expect(errorsOf({ changesSinceMain: [{ status: 'A', path: DIR + file }] })).toEqual([
      { type: 'migration_out_of_order', file, latestOnMain: '20260102000000_rls.sql' },
    ]);
  });

  it('accepts a new migration with a timestamp one second above the latest', () => {
    const file = '20260102000001_next.sql';
    expect(
      checkMigrationPreflight(snapshot({ changesSinceMain: [{ status: 'A', path: DIR + file }] })),
    ).toEqual({ ok: true, newMigrations: [file] });
  });

  it('uses the latest on origin/main even when the list is out of order', () => {
    const file = '20260101120000_late.sql';
    const errors = errorsOf({
      mainMigrations: [MAIN[1]!, MAIN[0]!],
      changesSinceMain: [{ status: 'A', path: DIR + file }],
    });
    expect(errors[0]).toMatchObject({ latestOnMain: '20260102000000_rls.sql' });
  });

  it('refuses a name outside the pattern', () => {
    const file = '20260103_bad-name.sql';
    expect(errorsOf({ changesSinceMain: [{ status: 'A', path: DIR + file }] })).toEqual([
      { type: 'invalid_migration_name', file },
    ]);
  });

  it('with an invalid name but a readable timestamp, also reports the order', () => {
    const file = '20260101000001_Bad.sql';
    expect(errorsOf({ changesSinceMain: [{ status: 'A', path: DIR + file }] })).toEqual([
      { type: 'invalid_migration_name', file },
      { type: 'migration_out_of_order', file, latestOnMain: '20260102000000_rls.sql' },
    ]);
  });

  it('lists all reasons at once', () => {
    const errors = errorsOf({
      porcelainStatus: '?? x',
      upstream: null,
      changesSinceMain: [
        { status: 'M', path: MAIN[0]! },
        { status: 'A', path: `${DIR}bad.sql` },
        { status: 'A', path: `${DIR}20260101000000_old.sql` },
      ],
    });
    expect(errors.map((e) => e.type)).toEqual([
      'dirty_worktree',
      'not_pushed',
      'applied_migration_changed',
      'invalid_migration_name',
      'migration_out_of_order',
    ]);
  });

  it('ignores changes outside supabase/migrations', () => {
    expect(
      checkMigrationPreflight(
        snapshot({ changesSinceMain: [{ status: 'M', path: 'supabase/seed.sql' }] }),
      ),
    ).toEqual({ ok: true, newMigrations: [] });
  });

  it('accepts the first migration when origin/main has none', () => {
    const file = '20260101000000_init.sql';
    expect(
      checkMigrationPreflight(
        snapshot({ mainMigrations: [], changesSinceMain: [{ status: 'A', path: DIR + file }] }),
      ),
    ).toEqual({ ok: true, newMigrations: [file] });
  });
});

describe('CA-5 — describePreflightError', () => {
  it.each<[PreflightError, string]>([
    [{ type: 'dirty_worktree' }, 'mudanças'],
    [{ type: 'not_pushed' }, 'upstream'],
    [{ type: 'applied_migration_changed', path: 'supabase/migrations/a.sql' }, 'a.sql'],
    [{ type: 'migration_out_of_order', file: 'n.sql', latestOnMain: 'l.sql' }, 'l.sql'],
    [{ type: 'invalid_migration_name', file: 'x.sql' }, 'AAAAMMDDHHmmss'],
  ])('describes %j in Portuguese', (error, fragment) => {
    expect(describePreflightError(error)).toContain(fragment);
  });
});

describe('CA-6 and CA-7 — pushMigrations', () => {
  const REF = 'abcdefghijklmnop';

  function setup(
    options: {
      snap?: GitSnapshot;
      answer?: string;
      ref?: string | null;
      env?: Record<string, string | undefined>;
      dryRun?: CommandResult;
      push?: CommandResult;
    } = {},
  ) {
    const lines: string[] = [];
    const ok = { code: 0, stdout: '', stderr: '' };
    const run = vi.fn<CommandRunner>(async (_command, args) => {
      if (args.includes('--dry-run')) return options.dryRun ?? { ...ok, stdout: 'DRY RUN OUTPUT' };
      return options.push ?? ok;
    });
    const confirm = vi.fn<(prompt: string) => Promise<string>>(async () => options.answer ?? REF);
    const deps = {
      run,
      confirm,
      readSnapshot: vi.fn(async () => options.snap ?? snapshot()),
      linkedRef: vi.fn(async () => (options.ref === undefined ? REF : options.ref)),
      env: options.env ?? { SUPABASE_DB_PASSWORD: 'secret-value' },
      log: (line: string) => lines.push(line),
    };
    return { deps, run, confirm, lines };
  }

  const pushCalls = (run: ReturnType<typeof setup>['run']) =>
    run.mock.calls.filter(([, args]) => args.includes('push') && !args.includes('--dry-run'));

  it('applies when the typed identifier equals the linked project', async () => {
    const { deps, run, lines } = setup();
    await expect(pushMigrations(deps)).resolves.toBe('pushed');
    expect(run.mock.calls.map(([, args]) => args)).toEqual([
      ['supabase', 'db', 'push', '--remote', '--dry-run', '--include-seed'],
      ['supabase', 'db', 'push', '--remote', '--include-seed'],
    ]);
    expect(lines.join('\n')).toContain(REF);
    expect(lines.join('\n')).toContain('DRY RUN OUTPUT');
  });

  it('asks for the identifier to be typed, quoting it in the prompt', async () => {
    const { deps, confirm } = setup();
    await pushMigrations(deps);
    expect(confirm.mock.calls[0]![0]).toContain(REF);
  });

  it('passes the environment to the runner and never shows the password', async () => {
    const { deps, run, lines } = setup();
    await pushMigrations(deps);
    for (const [, , options] of run.mock.calls) expect(options?.env).toBe(deps.env);
    expect(lines.join('\n')).not.toContain('secret-value');
  });

  it.each(['', 'wrong', 'ABCDEFGHIJKLMNOP', 'y', 'sim'])(
    'aborts without applying when the answer is %j',
    async (answer) => {
      const { deps, run } = setup({ answer });
      await expect(pushMigrations(deps)).resolves.toBe('aborted');
      expect(pushCalls(run)).toHaveLength(0);
    },
  );

  it('ignores spaces and line breaks around the answer', async () => {
    const { deps } = setup({ answer: `  ${REF}\n` });
    await expect(pushMigrations(deps)).resolves.toBe('pushed');
  });

  it('refuses without touching the remote when the preflight fails, listing all reasons', async () => {
    const { deps, run, lines } = setup({
      snap: snapshot({ porcelainStatus: ' M a', upstream: null }),
    });
    await expect(pushMigrations(deps)).resolves.toBe('refused');
    expect(run).not.toHaveBeenCalled();
    expect(lines.join('\n')).toContain(describePreflightError({ type: 'dirty_worktree' }));
    expect(lines.join('\n')).toContain(describePreflightError({ type: 'not_pushed' }));
    expect(deps.linkedRef).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   '])(
    'CA-7 — refuses without SUPABASE_DB_PASSWORD (%j), naming the variable, without connecting',
    async (value) => {
      const { deps, run, lines } = setup({ env: { SUPABASE_DB_PASSWORD: value } });
      await expect(pushMigrations(deps)).resolves.toBe('refused');
      expect(run).not.toHaveBeenCalled();
      expect(lines.join('\n')).toContain('SUPABASE_DB_PASSWORD');
    },
  );

  it('refuses without a linked project, pointing to supabase link', async () => {
    const { deps, run, lines } = setup({ ref: null });
    await expect(pushMigrations(deps)).resolves.toBe('refused');
    expect(run).not.toHaveBeenCalled();
    expect(lines.join('\n')).toContain('supabase link');
  });

  it('neither asks for confirmation nor applies when the dry-run fails', async () => {
    const { deps, confirm, run, lines } = setup({
      dryRun: { code: 1, stdout: '', stderr: 'connection refused' },
    });
    await expect(pushMigrations(deps)).resolves.toBe('refused');
    expect(confirm).not.toHaveBeenCalled();
    expect(pushCalls(run)).toHaveLength(0);
    expect(lines.join('\n')).toContain('connection refused');
  });

  it('does not show the password in the dry-run output or in the apply error', async () => {
    const leaking = { code: 0, stdout: 'out secret-value', stderr: 'err secret-value' };
    const first = setup({ dryRun: leaking });
    await pushMigrations(first.deps);
    expect(first.lines.join('\n')).not.toContain('secret-value');

    const second = setup({ push: { code: 1, stdout: '', stderr: 'boom secret-value' } });
    await expect(pushMigrations(second.deps)).rejects.toThrow(/boom \*\*\*/);
  });

  it('throws when the real apply fails', async () => {
    const { deps } = setup({ push: { code: 1, stdout: '', stderr: 'boom' } });
    await expect(pushMigrations(deps)).rejects.toThrow('boom');
  });
});

describe('readGitSnapshot', () => {
  function fakeGit(responses: Record<string, CommandResult>) {
    const calls: string[][] = [];
    const run: CommandRunner = async (command, args) => {
      expect(command).toBe('git');
      calls.push([...args]);
      const key = args.join(' ');
      const found = Object.entries(responses).find(([prefix]) => key.startsWith(prefix));
      return found?.[1] ?? { code: 0, stdout: '', stderr: '' };
    };
    return { run, calls };
  }
  const out = (stdout: string): CommandResult => ({ code: 0, stdout, stderr: '' });

  it('builds the snapshot from the git outputs', async () => {
    const { run, calls } = fakeGit({
      'status --porcelain': out(' M a.ts\n'),
      'rev-parse HEAD': out('abc\n'),
      'rev-parse @{u}': out('def\n'),
      'diff --name-status': out(
        `A\t${DIR}20260103000000_new.sql\nM\t${DIR}20260101000000_init.sql\nR100\t${DIR}20260102000000_rls.sql\t${DIR}20260102000000_policies.sql\n`,
      ),
      'ls-tree': out(`${MAIN.join('\n')}\n`),
    });
    await expect(readGitSnapshot(run)).resolves.toEqual({
      porcelainStatus: ' M a.ts\n',
      head: 'abc',
      upstream: 'def',
      changesSinceMain: [
        { status: 'A', path: `${DIR}20260103000000_new.sql` },
        { status: 'M', path: `${DIR}20260101000000_init.sql` },
        { status: 'R100', path: `${DIR}20260102000000_rls.sql` },
        { status: 'A', path: `${DIR}20260102000000_policies.sql` },
      ],
      mainMigrations: MAIN,
    });
    expect(calls[0]).toEqual(['fetch', 'origin']);
  });

  it('treats a copy as only adding the second path', async () => {
    const { run } = fakeGit({
      'diff --name-status': out(
        `C100\t${DIR}20260101000000_init.sql\t${DIR}20260105000000_copy.sql\n`,
      ),
    });
    const snapshot = await readGitSnapshot(run);
    expect(snapshot.changesSinceMain).toEqual([
      { status: 'A', path: `${DIR}20260105000000_copy.sql` },
    ]);
  });

  it('uses a null upstream when git cannot find it', async () => {
    const { run } = fakeGit({
      'rev-parse @{u}': { code: 128, stdout: '', stderr: 'no upstream' },
    });
    await expect(readGitSnapshot(run)).resolves.toMatchObject({ upstream: null });
  });

  it('fails when git cannot update origin', async () => {
    const { run } = fakeGit({ fetch: { code: 128, stdout: '', stderr: 'offline' } });
    await expect(readGitSnapshot(run)).rejects.toThrow('offline');
  });
});
