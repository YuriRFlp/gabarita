import { describe, expect, it, vi } from 'vitest';

const createClient = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient }));

const { createTestUser, isLocalUrl } = await import('./create-test-user');

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

describe('createTestUser', () => {
  it('fails without calling the API when the URL is not local', async () => {
    await expect(createTestUser('https://abc.supabase.co', 'key')).rejects.toThrow('Refused');
    expect(createClient).not.toHaveBeenCalled();
  });
});
