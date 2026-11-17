import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
};

describe('validateEnv', () => {
  it('accepts both valid public variables', () => {
    expect(validateEnv(VALID)).toEqual(VALID);
  });

  it('names the missing variable', () => {
    expect(() =>
      validateEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined }),
    ).toThrow('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });

  it('names the invalid URL without revealing its value', () => {
    const call = () => validateEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: 'secret-value' });
    expect(call).toThrow('NEXT_PUBLIC_SUPABASE_URL');
    expect(call).not.toThrow('secret-value');
  });
});
