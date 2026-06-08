# LLM Evaluation Harness

This harness evaluates RecruitedAI's AI matching flows against a fixed set of
"golden" CV/job pairs. Today it covers the **assess-job-match** flow
(`src/ai/flows/assess-job-match.ts`), which scores how well a CV matches a job
spec using Gemini 2.5 Flash via Genkit.

## What it tests

Because LLMs are non-deterministic, the harness does **not** assert exact
outputs. Instead, for each golden pair it asserts:

- **Score is within an expected range** — e.g. a strong match scores 80–95, a
  weak one 20–45. Bounds are deliberately wide to absorb run-to-run variance
  while still catching real regressions (a strong match that drops to 40, say).
- **Output structure is well-formed** — `matchedSkills` is a non-empty array,
  `missingSkills` is an array, and `experienceAlignment` is a non-empty string.
- **Behavioral guarantees** — for the skills-first pair, enabling
  `skillsFirstMode` must not lower the score for a strong-skills, no-degree
  candidate (skills-first score `>=` standard score). For the DevOps pair, the
  `missingSkills` array must surface at least one headline gap (Kubernetes,
  CI/CD, or Terraform).

The five golden pairs live in `src/ai/evals/golden-pairs.ts`; the assertions
live in `src/ai/evals/match-eval.test.ts`.

## How to run

```bash
npm run test:evals
```

This uses a dedicated config (`vitest.config.evals.ts`) that runs **only**
`src/ai/evals/**`.

### Requires an API key

The eval tests call the **real** Gemini API, so they need
`GOOGLE_GENAI_API_KEY` (or `GEMINI_API_KEY` / `GOOGLE_API_KEY`) set in the
environment. If no key is present, the entire suite **skips** with a clear
console message rather than failing — so CI stays green when the key is absent.

## Why evals are separate from unit tests

The main unit suite (`npm test`) is fast, deterministic, and offline. The evals
are the opposite, so they are intentionally excluded from it
(`src/ai/evals/**` is excluded in `vitest.config.ts`) and only run on demand:

- **Cost** — every test consumes AI tokens against a billed API.
- **Speed** — each assertion is a network round-trip taking seconds, not
  milliseconds.
- **Non-determinism** — outputs vary between runs, so they're validated by
  range and structure, not equality. They belong in a periodic/manual quality
  gate, not a per-commit gate.

The CI gate remains `lint + typecheck + test + build`. Run evals manually before
shipping changes to AI prompts, model config, or the output schema.

## How to add a new golden pair

1. Add a new `GoldenPair` constant in `src/ai/evals/golden-pairs.ts` with the
   CV text, job text, and an expected score range (`expectedScoreMin` /
   `expectedScoreMax`). Keep the range wide enough to tolerate LLM variance but
   tight enough to catch regressions.
2. Add it to the exported `GOLDEN_PAIRS` array.
3. Add a corresponding `it(...)` block in `src/ai/evals/match-eval.test.ts`.
   Reuse the `runPair` helper and the `assertWellFormed` structural checks, then
   add any range or behavioral assertions specific to the scenario.
4. Run `npm run test:evals` (with an API key set) to confirm the new pair lands
   in its expected range. If it doesn't, decide whether the prompt regressed or
   the expected range needs adjusting — and tune accordingly.
