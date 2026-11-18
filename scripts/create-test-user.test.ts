import { describe, expect, it, vi } from 'vitest';

const createClient = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient }));

const { createTestUser } = await import('./create-test-user');

describe('createTestUser', () => {
  it('fails without calling the API when the URL is not local', async () => {
    await expect(createTestUser('https://abc.supabase.co', 'key')).rejects.toThrow('Refused');
    expect(createClient).not.toHaveBeenCalled();
  });
});
