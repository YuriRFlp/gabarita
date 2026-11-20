'use server';

import { writeDismissedWeightsFingerprint } from '../data/weights-notice-cookie';
import { weightsFingerprintSchema } from './dismiss-weights-notice-schema';

/**
 * Remembers, in this browser only, that the notice for this set of weights was closed. It stores
 * nothing about the user and revalidates nothing: the notice is a convenience, not data.
 */
export async function dismissWeightsNotice(fingerprint: string): Promise<void> {
  const parsed = weightsFingerprintSchema.safeParse(fingerprint);
  if (!parsed.success) return;
  await writeDismissedWeightsFingerprint(parsed.data);
}
