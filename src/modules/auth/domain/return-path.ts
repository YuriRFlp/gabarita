export const HOME_PATH = '/';

/**
 * Accepts only an absolute internal path ("/x"); anything else becomes HOME_PATH,
 * so the `next` parameter cannot redirect to another site.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/')) return HOME_PATH;
  // Browsers treat "//site" and "/\site" as a URL on another host.
  if (value.startsWith('//') || value.startsWith('/\\')) return HOME_PATH;
  // Control characters can bypass the check above ("/\t/site" becomes "//site").
  if (/[\u0000-\u001f\u007f]/.test(value)) return HOME_PATH;
  return value;
}
