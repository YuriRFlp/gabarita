import { z } from 'zod';

/** weightsFingerprint is a 32-bit hash in base36: at most 7 lowercase alphanumerics. */
export const weightsFingerprintSchema = z.string().regex(/^[0-9a-z]{1,7}$/);
