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
 *
 * The suite is data-driven off GOLDEN_PAIRS in ./golden-pairs. For every pair
 * it asserts a well-formed structure, an in-range matchScore, and (when the
 * fixture declares them) missing-skills detection. Pairs that share a `pair`
 * key are additionally checked for the skills-first guarantee: the ON variant
 * must not score below the OFF variant for the same CV + job.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { assessJobMatch, type AssessJobMatchOutput } from '@/ai/flows/assess-job-match';
import { GOLDEN_PAIRS, textToDataUri, type GoldenPair } from './golden-pairs';

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

/** Run a golden pair through the flow using its declared skillsFirstMode. */
async function runPair(pair: GoldenPair): Promise<AssessJobMatchOutput> {
  return assessJobMatch({
    masterResumeDataUri: textToDataUri(pair.cv),
    jobSpecText: pair.job,
    skillsFirstMode: pair.skillsFirstMode ?? false,
  });
}

/**
 * Shared structural assertions every flow output must satisfy.
 *
 * `matchedSkills` must always be an array, but is only required to be non-empty
 * when the scenario expects some overlap. A genuinely weak-fit case (e.g. a
 * graphic designer scored against a backend engineering role) can correctly
 * surface zero matched skills, so requiring a match there would flag a correct
 * result as malformed.
 */
function assertWellFormed(output: AssessJobMatchOutput, pair: GoldenPair) {
  expect(output.matchScore).toBeGreaterThanOrEqual(0);
  expect(output.matchScore).toBeLessThanOrEqual(100);
  expect(Array.isArray(output.matchedSkills)).toBe(true);
  if (pair.category !== 'weak-fit') {
    expect(output.matchedSkills.length).toBeGreaterThan(0);
  }
  expect(Array.isArray(output.missingSkills)).toBe(true);
  expect(typeof output.experienceAlignment).toBe('string');
  expect(output.experienceAlignment.trim().length).toBeGreaterThan(0);
}

describeEvals('assess-job-match eval harness', () => {
  // Cache each pair's output so paired-delta assertions reuse the same runs
  // rather than paying for a second call per case.
  const outputs = new Map<string, AssessJobMatchOutput>();

  it.each(GOLDEN_PAIRS.map((pair) => [pair.id, pair] as const))(
    '%s — well-formed, in range, and detects declared gaps',
    async (_id, pair) => {
      const output = await runPair(pair);
      outputs.set(pair.id, output);

      assertWellFormed(output, pair);

      expect(output.matchScore).toBeGreaterThanOrEqual(pair.expectedScoreMin);
      expect(output.matchScore).toBeLessThanOrEqual(pair.expectedScoreMax);

      if (pair.missingSkillsExpected?.length) {
        const haystack = output.missingSkills.join(' | ').toLowerCase();
        const found = pair.missingSkillsExpected.some((skill) =>
          haystack.includes(skill.toLowerCase())
        );
        expect(
          found,
          `Expected missingSkills ${JSON.stringify(
            output.missingSkills
          )} to include one of ${JSON.stringify(pair.missingSkillsExpected)}`
        ).toBe(true);
      }
    },
    EVAL_TIMEOUT_MS
  );

  // Behavioral guarantee: for each ON/OFF pair sharing a CV + job, enabling
  // skillsFirstMode must not lower the score. Reuses the cached outputs above,
  // so this depends on the per-case tests having run first (they enumerate in
  // GOLDEN_PAIRS order, and both halves of every pair precede this block).
  const pairKeys = [...new Set(GOLDEN_PAIRS.map((p) => p.pair).filter(Boolean))] as string[];

  it.each(pairKeys)(
    'skills-first guarantee — "%s": ON score >= OFF score',
    (pairKey) => {
      const on = GOLDEN_PAIRS.find((p) => p.pair === pairKey && p.skillsFirstMode === true);
      const off = GOLDEN_PAIRS.find((p) => p.pair === pairKey && p.skillsFirstMode !== true);
      expect(on, `pair "${pairKey}" is missing its skillsFirstMode=ON case`).toBeDefined();
      expect(off, `pair "${pairKey}" is missing its skillsFirstMode=OFF case`).toBeDefined();

      const onOutput = outputs.get(on!.id);
      const offOutput = outputs.get(off!.id);
      expect(onOutput, `no cached output for ${on!.id} — did its case test run?`).toBeDefined();
      expect(offOutput, `no cached output for ${off!.id} — did its case test run?`).toBeDefined();

      expect(onOutput!.matchScore).toBeGreaterThanOrEqual(offOutput!.matchScore);
    }
  );
});
