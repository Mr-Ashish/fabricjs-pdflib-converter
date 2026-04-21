import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests-external/**/*.test.ts'],
    globals: true,
    environment: 'node',
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});
