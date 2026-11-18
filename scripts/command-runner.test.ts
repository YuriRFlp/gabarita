import { describe, expect, it } from 'vitest';
import { runCommand } from './command-runner';

describe('runCommand', () => {
  it('captures stdout and returns code 0', async () => {
    const result = await runCommand('node', ['-e', 'process.stdout.write("ok")']);
    expect(result).toEqual({ code: 0, stdout: 'ok', stderr: '' });
  });

  it('returns the exit code and stderr of a failing command', async () => {
    const result = await runCommand('node', ['-e', 'console.error("bad"); process.exit(3)']);
    expect(result.code).toBe(3);
    expect(result.stderr).toContain('bad');
  });

  it('does not interpret shell metacharacters in arguments', async () => {
    const result = await runCommand('node', [
      '-e',
      'process.stdout.write(process.argv[1])',
      '$(echo hacked); echo x',
    ]);
    expect(result.stdout).toBe('$(echo hacked); echo x');
  });

  it('passes only the given environment to the command', async () => {
    const result = await runCommand(
      'node',
      ['-e', 'process.stdout.write(process.env.GABARITA_PROBE ?? "unset")'],
      { env: { PATH: process.env.PATH, GABARITA_PROBE: 'yes' } },
    );
    expect(result.stdout).toBe('yes');
  });

  it('returns a non-zero code when the command does not exist', async () => {
    const result = await runCommand('gabarita-no-such-command', []);
    expect(result.code).not.toBe(0);
  });
});
