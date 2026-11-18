import { execFile } from 'node:child_process';

export type CommandResult = { code: number; stdout: string; stderr: string };

/** Runs without a shell; arguments are never interpolated into a string. */
export type CommandRunner = (
  command: string,
  args: readonly string[],
  options?: { env?: Record<string, string | undefined>; cwd?: string },
) => Promise<CommandResult>;

// pg_dump output can be large; the default 1 MiB buffer would kill the process.
const MAX_BUFFER = 512 * 1024 * 1024;

export const runCommand: CommandRunner = (command, args, options) =>
  new Promise((resolve) => {
    execFile(
      command,
      [...args],
      {
        // When env is given it replaces process.env; NODE_ENV is re-added because the ProcessEnv typings require it.
        env: options?.env && {
          ...options.env,
          NODE_ENV: process.env.NODE_ENV,
        },
        cwd: options?.cwd,
        encoding: 'utf8',
        maxBuffer: MAX_BUFFER,
      },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
        resolve({ code, stdout, stderr: error && !stderr ? error.message : stderr });
      },
    );
  });
