import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('CA-2 — next.config.ts', () => {
  it('returns exactly the security headers for every path', async () => {
    const rules = await nextConfig.headers?.();

    expect(rules).toEqual([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]);
  });

  it('keeps the X-Powered-By header disabled', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
