import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readLinkedProjectRef, requireDbPassword, scrubSecret } from './remote-env';

describe('CA-7 — requireDbPassword', () => {
  it('accepts when the variable is set', () => {
    expect(requireDbPassword({ SUPABASE_DB_PASSWORD: 's3cret' })).toEqual({ ok: true });
  });

  it.each([{}, { SUPABASE_DB_PASSWORD: '' }, { SUPABASE_DB_PASSWORD: '   ' }])(
    'refuses and names the variable when it is missing or blank (%j)',
    (env) => {
      const result = requireDbPassword(env);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain('SUPABASE_DB_PASSWORD');
    },
  );

  it('never includes a value in the message', () => {
    const result = requireDbPassword({ SUPABASE_DB_PASSWORD: '', OTHER: 'leaked-value' });
    if (!result.ok) expect(result.message).not.toContain('leaked-value');
  });
});

describe('readLinkedProjectRef', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'gabarita-ref-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns the trimmed reference of the linked project', async () => {
    await mkdir(join(root, 'supabase', '.temp'), { recursive: true });
    await writeFile(join(root, 'supabase', '.temp', 'project-ref'), 'abcdefghij\n');
    expect(await readLinkedProjectRef(root)).toBe('abcdefghij');
  });

  it('returns null when the project is not linked', async () => {
    expect(await readLinkedProjectRef(root)).toBeNull();
  });

  it('returns null when the file is empty', async () => {
    await mkdir(join(root, 'supabase', '.temp'), { recursive: true });
    await writeFile(join(root, 'supabase', '.temp', 'project-ref'), '\n');
    expect(await readLinkedProjectRef(root)).toBeNull();
  });
});

describe('scrubSecret', () => {
  it('replaces every occurrence of the password', () => {
    expect(scrubSecret('a s3cret b s3cret', { SUPABASE_DB_PASSWORD: 's3cret' })).toBe(
      'a *** b ***',
    );
  });

  it('keeps the text when there is no password', () => {
    expect(scrubSecret('text', {})).toBe('text');
  });
});
