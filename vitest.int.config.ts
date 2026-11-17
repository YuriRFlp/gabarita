import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    include: ['src/**/*.int.test.ts', 'scripts/**/*.int.test.ts'],
    globalSetup: ['./tests/integration/setup.ts'],
    fileParallelism: false,
  },
});
