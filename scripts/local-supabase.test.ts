import { describe, expect, it } from 'vitest';
import { isLocalUrl } from './local-supabase';

describe('isLocalUrl', () => {
  it.each(['http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321'])(
    'accepts %s',
    (url) => {
      expect(isLocalUrl(url)).toBe(true);
    },
  );

  it.each([
    'https://abc.supabase.co',
    'http://127.0.0.1.example.com',
    'http://localhost.example.com',
    'not a url',
  ])('refuses %s', (url) => {
    expect(isLocalUrl(url)).toBe(false);
  });
});
