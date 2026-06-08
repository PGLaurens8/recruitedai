import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Eval tests call the real Gemini API (slow, costs tokens). They run via
    // their own config (`npm run test:evals`), never on the main suite.
    exclude: ['**/node_modules/**', '**/dist/**', 'src/ai/evals/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
