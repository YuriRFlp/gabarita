import { describe, expect, it, vi } from 'vitest';
import type { CommandRunner } from './command-runner.ts';
import { testRemote } from './test-remote.ts';

describe('CA-7 — db:test:remote', () => {
  it('refuses without SUPABASE_DB_PASSWORD and never runs the command', async () => {
    const run = vi.fn<CommandRunner>();
    const log = vi.fn();

    const code = await testRemote({ run, env: {}, log });

    expect(code).toBe(1);
    expect(run).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join('\n')).toContain('SUPABASE_DB_PASSWORD');
  });

  it('runs the remote database tests when the password is set', async () => {
    const run = vi.fn<CommandRunner>().mockResolvedValue({ code: 0, stdout: 'ok', stderr: '' });
    const env = { SUPABASE_DB_PASSWORD: 's3cret' };

    const code = await testRemote({ run, env, log: vi.fn() });

    expect(code).toBe(0);
    expect(run).toHaveBeenCalledWith('npx', ['supabase', 'test', 'db', '--remote'], { env });
  });

  it('returns a failure code and shows the output when the tests fail, without the password', async () => {
    const run = vi
      .fn<CommandRunner>()
      .mockResolvedValue({ code: 1, stdout: 'not ok 3', stderr: 'failed with s3cret' });
    const log = vi.fn();

    const code = await testRemote({ run, env: { SUPABASE_DB_PASSWORD: 's3cret' }, log });

    const output = log.mock.calls.flat().join('\n');
    expect(code).toBe(1);
    expect(output).toContain('not ok 3');
    expect(output).not.toContain('s3cret');
  });
});
