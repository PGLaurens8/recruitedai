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
- **Behavioral guarantees** — for each skills-first ON/OFF pair (two CVs that
  share an identical CV + job, one run with `skillsFirstMode` on and one off),
  enabling the mode must not lower the score (`ON >= OFF`). Where a fixture
  declares `missingSkillsExpected`, the `missingSkills` output must surface at
  least one of those gaps (e.g. the data-engineer case expects Spark, Airflow,
  or Kafka).

The ten golden pairs live in `src/ai/evals/golden-pairs.ts` as the
`GOLDEN_PAIRS` array; the assertions live in `src/ai/evals/match-eval.test.ts`,
which is **data-driven** — it iterates `GOLDEN_PAIRS` with `it.each`, so adding
a pair to the array adds a test automatically. They were migrated from the
earlier HTTP-based harness (`run-eval.js` / `eval-test-cases.json`) so they run
in-process, without a running server or auth cookie.

The pairs cover strong / medium / weak / moderate fits, a seniority gap, and two
skills-first ON/OFF pairs — one where the role says "degree not required" (small
expected delta) and one that explicitly requires a CS degree (the case designed
to expose the flag's effect).

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

1. Add a new `GoldenPair` constant in `src/ai/evals/golden-pairs.ts` with a
   stable `id`, a `category`, the CV/job text, an expected score range
   (`expectedScoreMin` / `expectedScoreMax`), and a `notes` string describing
   what a correct result looks like. Keep the range wide enough to tolerate LLM
   variance but tight enough to catch regressions.
2. Add it to the exported `GOLDEN_PAIRS` array. The test is data-driven, so this
   alone gives you a well-formed + in-range test — no new `it(...)` block needed.
3. For extra guarantees, set optional fields on the fixture:
   - `missingSkillsExpected: string[]` — asserts `missingSkills` surfaces at
     least one of them.
   - `pair: string` + a second fixture with the same `pair` key and the opposite
     `skillsFirstMode` — asserts the ON variant scores `>=` the OFF variant.
4. Run `npm run test:evals` (with an API key set) to confirm the new pair lands
   in its expected range. If it doesn't, decide whether the prompt regressed or
   the expected range needs adjusting — and tune accordingly.
