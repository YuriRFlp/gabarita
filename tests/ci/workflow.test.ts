import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';

const workflowSchema = z.object({
  on: z.record(z.string(), z.unknown().nullable()),
  permissions: z.record(z.string(), z.string()),
  jobs: z.record(
    z.string(),
    z.object({
      env: z.record(z.string(), z.string()).optional(),
      steps: z.array(
        z.object({
          uses: z.string().optional(),
          run: z.string().optional(),
          with: z.record(z.string(), z.unknown()).optional(),
        }),
      ),
    }),
  ),
});

const text = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const workflow = workflowSchema.parse(parse(text));
const jobs = Object.values(workflow.jobs);
const steps = jobs.flatMap((job) => job.steps);

describe('CI workflow', () => {
  it('runs on push and pull request, never on pull_request_target', () => {
    expect(Object.keys(workflow.on).sort()).toEqual(['pull_request', 'push']);
    expect(text).not.toContain('pull_request_target');
  });

  it('only has read permission on contents', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
  });

  it('does not use repository secrets', () => {
    expect(text).not.toMatch(/secrets\./);
  });

  it('uses the Node version from .nvmrc', () => {
    const setupNode = steps.find((step) => step.uses?.startsWith('actions/setup-node@'));
    expect(setupNode?.with?.['node-version-file']).toBe('.nvmrc');
  });

  it('pins actions by commit SHA', () => {
    const actions = steps.flatMap((step) => (step.uses ? [step.uses] : []));
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) expect(action).toMatch(/@[0-9a-f]{40}$/);
  });

  it('runs the checks in the agreed order', () => {
    const commands = steps.flatMap((step) => (step.run ? [step.run] : []));
    expect(commands).toEqual([
      'npm ci',
      'npm run lint',
      'npm run typecheck',
      'npm run format:check',
      'npm test',
      'npm run build',
    ]);
  });

  it('sets only the two public variables, with fake local values', () => {
    for (const job of jobs) {
      expect(Object.keys(job.env ?? {}).sort()).toEqual([
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
        'NEXT_PUBLIC_SUPABASE_URL',
      ]);
      expect(job.env?.NEXT_PUBLIC_SUPABASE_URL).toMatch(/^http:\/\/127\.0\.0\.1/);
    }
  });
});
