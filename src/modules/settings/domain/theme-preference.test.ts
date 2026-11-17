import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_PREFERENCE,
  parseThemePreference,
  themeAttribute,
  themeToSync,
} from './theme-preference';

describe('parseThemePreference', () => {
  it.each(['system', 'light', 'dark'] as const)('accepts %s', (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  it.each([undefined, '', 'DARK', 'escuro', 'dark;'])(
    'falls back to the default for a missing or tampered value (%s)',
    (value) => {
      expect(parseThemePreference(value)).toBe(DEFAULT_THEME_PREFERENCE);
    },
  );

  it('defaults to "system"', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('system');
  });
});

describe('themeAttribute', () => {
  it('sets no attribute when following the system', () => {
    expect(themeAttribute('system')).toBeUndefined();
  });

  it.each(['light', 'dark'] as const)('forces the %s theme', (theme) => {
    expect(themeAttribute(theme)).toBe(theme);
  });
});

describe('themeToSync', () => {
  it('does not rewrite when the database read failed', () => {
    expect(themeToSync(null, 'light')).toBeNull();
  });

  it('does not rewrite when the cookie already holds the saved value', () => {
    expect(themeToSync('dark', 'dark')).toBeNull();
  });

  it('rewrites with the saved value when the cookie differs', () => {
    expect(themeToSync('dark', 'light')).toBe('dark');
  });

  it('rewrites when there is no cookie', () => {
    expect(themeToSync('system', undefined)).toBe('system');
  });

  it('rewrites when the cookie was tampered with, even if the saved value is the default', () => {
    expect(themeToSync('system', 'xyz')).toBe('system');
  });
});
