import { cookies } from 'next/headers';

export const WEIGHTS_NOTICE_COOKIE = 'gb-weights-notice';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: ONE_YEAR_IN_SECONDS,
} as const;

/** The fingerprint of the weight set whose notice was closed in this browser, if any. */
export async function readDismissedWeightsFingerprint(): Promise<string | null> {
  const store = await cookies();
  return store.get(WEIGHTS_NOTICE_COOKIE)?.value ?? null;
}

export async function writeDismissedWeightsFingerprint(fingerprint: string): Promise<void> {
  const store = await cookies();
  store.set(WEIGHTS_NOTICE_COOKIE, fingerprint, COOKIE_OPTIONS);
}
