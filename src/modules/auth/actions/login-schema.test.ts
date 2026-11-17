import { describe, expect, it } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  it('accepts email and password, trimming the email', () => {
    const result = loginSchema.safeParse({ email: '  me@example.com ', password: 'x' });
    expect(result.success && result.data.email).toBe('me@example.com');
  });

  it('rejects a malformed email with a field message', () => {
    const result = loginSchema.safeParse({ email: 'me@', password: 'x' });
    expect(result.error?.issues[0]?.path).toEqual(['email']);
    expect(result.error?.issues[0]?.message).toBe('Informe um e-mail válido.');
  });

  it('rejects an empty password with a field message', () => {
    const result = loginSchema.safeParse({ email: 'me@example.com', password: '' });
    expect(result.error?.issues[0]?.path).toEqual(['password']);
    expect(result.error?.issues[0]?.message).toBe('Informe a senha.');
  });

  it('rejects an empty email', () => {
    expect(loginSchema.safeParse({ email: '', password: 'x' }).success).toBe(false);
  });
});
