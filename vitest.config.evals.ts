import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Dedicated config for the LLM eval harness (src/ai/evals/**).
 *
 * Kept separate from vitest.config.ts because these tests call the real Gemini
 * API — they are slow, cost tokens, and are non-deterministic — so they must
 * NOT run on every commit alongside the fast unit suite. Run them explicitly
 * with `npm run test:evals`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/ai/evals/**/*.test.ts'],
    // Each test makes a real network round-trip; don't kill them prematurely.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
