import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

const referenced = [
  ...new Set(
    listFiles('src').flatMap(
      (path) => readFileSync(path, 'utf8').match(/\/brand\/[\w.-]+\.(?:svg|png)/g) ?? [],
    ),
  ),
];

describe('brand assets', () => {
  it('finds at least one brand asset referenced in src/', () => {
    expect(referenced.length).toBeGreaterThan(0);
  });

  it.each(referenced)('serves %s from public/', (asset) => {
    expect(existsSync(join('public', asset))).toBe(true);
  });
});
