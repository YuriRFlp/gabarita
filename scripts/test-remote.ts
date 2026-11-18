import { fileURLToPath } from 'node:url';
import { runCommand, type CommandRunner } from './command-runner.ts';
import { requireDbPassword, scrubSecret } from './remote-env.ts';

export async function testRemote(deps: {
  run: CommandRunner;
  env: Record<string, string | undefined>;
  log: (line: string) => void;
}): Promise<number> {
  const password = requireDbPassword(deps.env);
  if (!password.ok) {
    deps.log(password.message);
    return 1;
  }
  const result = await deps.run('npx', ['supabase', 'test', 'db', '--remote'], { env: deps.env });
  if (result.stdout) deps.log(scrubSecret(result.stdout, deps.env));
  if (result.stderr) deps.log(scrubSecret(result.stderr, deps.env));
  return result.code === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await testRemote({
    run: runCommand,
    env: process.env,
    log: (line) => console.log(line),
  });
}
