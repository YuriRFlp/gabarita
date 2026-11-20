import { describe, expect, it } from 'vitest';
import { weightsFingerprintSchema } from './dismiss-weights-notice-schema';

describe('weightsFingerprintSchema', () => {
  it.each(['0', 'a1b2c3', 'zzzzzzz'])('accepts %s', (value) => {
    expect(weightsFingerprintSchema.safeParse(value).success).toBe(true);
  });

  it.each(['', 'ABC', 'a-b', 'a b', 'abcdefgh', '1;path=/'])('rejects %j', (value) => {
    expect(weightsFingerprintSchema.safeParse(value).success).toBe(false);
  });

  it('rejects a value that is not a string', () => {
    expect(weightsFingerprintSchema.safeParse(42).success).toBe(false);
  });
});
