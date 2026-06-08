/**
 * @fileOverview LLM evaluation harness for the assess-job-match AI flow.
 *
 * These are NOT deterministic unit tests. They call the real Gemini API and
 * assert that outputs fall within expected score ranges and have the correct
 * structure — they cannot assert exact outputs because the LLM is
 * non-deterministic. They are slow and cost AI tokens, so they run via a
 * dedicated config (`npm run test:evals`), not the main unit-test suite.
 *
 * Requires GOOGLE_GENAI_API_KEY (or GEMINI_API_KEY / GOOGLE_API_KEY) to be set;
 * otherwise every test is skipped with a clear message so CI does not fail when
 * the key is absent.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { assessJobMatch, type AssessJobMatchOutput } from '@/ai/flows/assess-job-match';
import {
  MEDIUM_MATCH,
  MISSING_SKILLS,
  MISSING_SKILLS_EXPECTED,
  SKILLS_FIRST_UPLIFT,
  STRONG_MATCH,
  WEAK_MATCH,
  textToDataUri,
  type GoldenPair,
} from './golden-pairs';

// Generous per-call timeout — real network round-trips to Gemini.
const EVAL_TIMEOUT_MS = 60_000;

const hasApiKey = Boolean(
  process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
);

beforeAll(() => {
  if (!hasApiKey) {
    console.warn(
      '\n[evals] Skipping LLM eval tests: no API key found. ' +
        'Set GOOGLE_GENAI_API_KEY (or GEMINI_API_KEY / GOOGLE_API_KEY) to run them.\n'
    );
  }
});

// Skip the whole suite (not fail) when the key is absent, so CI stays green.
const describeEvals = hasApiKey ? describe : describe.skip;

/** Run a golden pair through the flow. */
async function runPair(pair: GoldenPair, skillsFirstMode = false): Promise<AssessJobMatchOutput> {
  return assessJobMatch({
    masterResumeDataUri: textToDataUri(pair.cv),
    jobSpecText: pair.job,
    skillsFirstMode,
  });
}

/** Shared structural assertions every flow output must satisfy. */
function assertWellFormed(output: AssessJobMatchOutput) {
  expect(output.matchScore).toBeGreaterThanOrEqual(0);
  expect(output.matchScore).toBeLessThanOrEqual(100);
  expect(Array.isArray(output.matchedSkills)).toBe(true);
  expect(output.matchedSkills.length).toBeGreaterThan(0);
  expect(Array.isArray(output.missingSkills)).toBe(true);
  expect(typeof output.experienceAlignment).toBe('string');
  expect(output.experienceAlignment.trim().length).toBeGreaterThan(0);
}

describeEvals('assess-job-match eval harness', () => {
  it(
    'Pair 1 — strong match scores within range',
    async () => {
      const output = await runPair(STRONG_MATCH);
      assertWellFormed(output);
      expect(output.matchScore).toBeGreaterThanOrEqual(STRONG_MATCH.expectedScoreMin);
      expect(output.matchScore).toBeLessThanOrEqual(STRONG_MATCH.expectedScoreMax);
    },
    EVAL_TIMEOUT_MS
  );

  it(
    'Pair 2 — medium match scores within range',
    async () => {
      const output = await runPair(MEDIUM_MATCH);
      assertWellFormed(output);
      expect(output.matchScore).toBeGreaterThanOrEqual(MEDIUM_MATCH.expectedScoreMin);
      expect(output.matchScore).toBeLessThanOrEqual(MEDIUM_MATCH.expectedScoreMax);
    },
    EVAL_TIMEOUT_MS
  );

  it(
    'Pair 3 — skills-first mode does not lower the score for a degree-less candidate',
    async () => {
      const standard = await runPair(SKILLS_FIRST_UPLIFT, false);
      const skillsFirst = await runPair(SKILLS_FIRST_UPLIFT, true);

      assertWellFormed(standard);
      assertWellFormed(skillsFirst);

      // The core skills-first guarantee: enabling the mode must not penalize a
      // strong-skills, no-degree candidate relative to the standard scoring.
      expect(skillsFirst.matchScore).toBeGreaterThanOrEqual(standard.matchScore);
    },
    // Two sequential flow calls — double the budget.
    EVAL_TIMEOUT_MS * 2
  );

  it(
    'Pair 4 — weak match scores within range',
    async () => {
      const output = await runPair(WEAK_MATCH);
      assertWellFormed(output);
      expect(output.matchScore).toBeGreaterThanOrEqual(WEAK_MATCH.expectedScoreMin);
      expect(output.matchScore).toBeLessThanOrEqual(WEAK_MATCH.expectedScoreMax);
    },
    EVAL_TIMEOUT_MS
  );

  it(
    'Pair 5 — detects missing DevOps skills',
    async () => {
      const output = await runPair(MISSING_SKILLS);
      assertWellFormed(output);
      expect(output.matchScore).toBeGreaterThanOrEqual(MISSING_SKILLS.expectedScoreMin);
      expect(output.matchScore).toBeLessThanOrEqual(MISSING_SKILLS.expectedScoreMax);

      // The missingSkills array must surface at least one of the headline gaps.
      // Match case-insensitively and tolerate substrings (e.g. "CI/CD pipelines").
      const haystack = output.missingSkills.join(' | ').toLowerCase();
      const found = MISSING_SKILLS_EXPECTED.some((skill) =>
        haystack.includes(skill.toLowerCase())
      );
      expect(
        found,
        `Expected missingSkills ${JSON.stringify(output.missingSkills)} to include one of ${JSON.stringify(
          MISSING_SKILLS_EXPECTED
        )}`
      ).toBe(true);
    },
    EVAL_TIMEOUT_MS
  );
});
