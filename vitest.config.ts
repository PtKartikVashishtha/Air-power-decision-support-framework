import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@air-power/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@air-power/optimizer': path.resolve(__dirname, 'packages/optimizer/src/index.ts'),
      '@air-power/sim': path.resolve(__dirname, 'packages/sim/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tools/**', 'dist/**', '.next/**'],
  },
});
