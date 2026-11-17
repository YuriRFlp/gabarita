import { describe, expect, it } from 'vitest';
import { decideAccess } from './decide-access';

describe('decideAccess', () => {
  it('redirects a visitor without a session to /login with the requested route', () => {
    expect(decideAccess({ path: '/review?day=today', authenticated: false })).toEqual({
      type: 'redirect',
      destination: '/login?next=%2Freview%3Fday%3Dtoday',
    });
  });

  it('redirects a visitor without a session who requests the home page', () => {
    expect(decideAccess({ path: '/', authenticated: false })).toEqual({
      type: 'redirect',
      destination: '/login?next=%2F',
    });
  });

  it('lets a visitor without a session open /login, with or without a query string', () => {
    expect(decideAccess({ path: '/login', authenticated: false })).toEqual({ type: 'continue' });
    expect(decideAccess({ path: '/login?next=%2Fx', authenticated: false })).toEqual({
      type: 'continue',
    });
  });

  it('does not treat a route that only starts with "login" as public', () => {
    expect(decideAccess({ path: '/loginx', authenticated: false }).type).toBe('redirect');
  });

  it('sends a logged-in user who opens /login to the home page', () => {
    expect(decideAccess({ path: '/login?next=%2Fx', authenticated: true })).toEqual({
      type: 'redirect',
      destination: '/',
    });
  });

  it('lets a logged-in user continue to a protected route', () => {
    expect(decideAccess({ path: '/review', authenticated: true })).toEqual({ type: 'continue' });
  });
});
