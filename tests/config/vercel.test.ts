import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const vercelSchema = z.object({
  regions: z.array(z.string()),
  git: z.object({ deploymentEnabled: z.record(z.string(), z.boolean()) }),
});

const config = vercelSchema.parse(
  JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')),
);

describe('CA-1 — vercel.json', () => {
  it('runs the functions in a single region, gru1', () => {
    expect(config.regions).toEqual(['gru1']);
  });

  it('enables deployment only for the main branch', () => {
    const enabled = Object.entries(config.git.deploymentEnabled)
      .filter(([, value]) => value)
      .map(([branch]) => branch);
    expect(enabled).toEqual(['main']);
  });

  it('disables deployment for every other branch', () => {
    expect(config.git.deploymentEnabled['*']).toBe(false);
  });
});
