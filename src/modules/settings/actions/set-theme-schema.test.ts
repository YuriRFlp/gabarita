import { describe, expect, it } from 'vitest';
import { setThemeSchema } from './set-theme-schema';

describe('setThemeSchema', () => {
  it.each(['system', 'light', 'dark'])('accepts %s', (theme) => {
    expect(setThemeSchema.safeParse({ theme }).success).toBe(true);
  });

  it.each([undefined, null, '', 'escuro', 'DARK'])('rejects %s', (theme) => {
    expect(setThemeSchema.safeParse({ theme }).success).toBe(false);
  });
});
