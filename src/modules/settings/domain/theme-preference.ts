export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

function isThemePreference(value: string | undefined): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value);
}

export function parseThemePreference(value: string | undefined): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

/** Value of the data-theme attribute on <html>; undefined = follow prefers-color-scheme. */
export function themeAttribute(preference: ThemePreference): 'light' | 'dark' | undefined {
  return preference === 'system' ? undefined : preference;
}

/**
 * Decides whether the cookie cache must be rewritten: returns the saved value unless the cookie
 * already holds exactly that value, so a missing or tampered cookie is repaired; null when the
 * read failed.
 */
export function themeToSync(
  saved: ThemePreference | null,
  cookie: string | undefined,
): ThemePreference | null {
  if (saved === null) return null;
  if (isThemePreference(cookie) && cookie === saved) return null;
  return saved;
}
