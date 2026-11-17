import { describe, expect, it } from 'vitest';
import { HOME_PATH, safeReturnPath } from './return-path';

describe('safeReturnPath', () => {
  it.each(['/', '/review', '/questions/123?filter=wrong#top'])(
    'accepts the internal path %s',
    (path) => {
      expect(safeReturnPath(path)).toBe(path);
    },
  );

  it.each([
    ['an absolute URL', 'https://site.com'],
    ['a protocol-relative URL', '//site.com'],
    ['a backslash', '/\\site.com'],
    ['javascript:', 'javascript:alert(1)'],
    ['a relative path', 'review'],
    ['a control character', '/\t/site.com'],
    ['an empty string', ''],
  ])('replaces %s with the home path', (_case, value) => {
    expect(safeReturnPath(value)).toBe(HOME_PATH);
  });

  it.each([null, undefined])('replaces a missing value (%s) with the home path', (value) => {
    expect(safeReturnPath(value)).toBe(HOME_PATH);
  });
});
