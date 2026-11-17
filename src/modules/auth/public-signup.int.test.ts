import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createAdminClient, createPublicClient } from '#factories/users';

describe('CA-7 — public sign-up disabled', () => {
  it('signUp with the publishable key fails and creates no user', async () => {
    const email = `signup-${randomUUID()}@gabarita.local`;

    const { data, error } = await createPublicClient().auth.signUp({
      email,
      password: `password-${randomUUID()}`,
    });

    expect(error?.code).toBe('signup_disabled');
    expect(data.user).toBeNull();
    const list = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    expect(list.data.users.some((existing) => existing.email === email)).toBe(false);
  });
});
