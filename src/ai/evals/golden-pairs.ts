/**
 * @fileOverview Golden CV/job pairs for evaluating the assess-job-match AI flow.
 *
 * Because the underlying LLM (Gemini 2.5 Flash) is non-deterministic, these
 * fixtures are not used to assert exact outputs. Instead the eval harness
 * (src/ai/evals/match-eval.test.ts) asserts that scores fall within expected
 * ranges and that the output structure is well-formed.
 *
 * Each CV is encoded as a base64 `text/plain` data URI because the flow
 * consumes the resume via `{{media url=masterResumeDataUri}}`. The job spec is
 * passed as plain text via `jobSpecText`.
 */

/** Encode a plain-text CV as the `text/plain` base64 data URI the flow expects. */
export function textToDataUri(text: string): string {
  return `data:text/plain;base64,${Buffer.from(text, 'utf-8').toString('base64')}`;
}

export interface GoldenPair {
  /** Human-readable name of the scenario under test. */
  name: string;
  /** Raw CV text (encoded to a data URI before being passed to the flow). */
  cv: string;
  /** Raw job specification text (passed as `jobSpecText`). */
  job: string;
  /** Inclusive lower bound for the expected matchScore. */
  expectedScoreMin: number;
  /** Inclusive upper bound for the expected matchScore. */
  expectedScoreMax: number;
}

export const STRONG_MATCH: GoldenPair = {
  name: 'Strong match — senior full stack engineer',
  cv: `Senior Software Engineer with 10 years of professional experience.
Skills: React, TypeScript, Node.js, PostgreSQL, AWS.
Led a team of 6 engineers as a technical team lead, owning architecture and delivery.
Education: BSc in Computer Science.`,
  job: `Senior Full Stack Engineer
We are looking for a senior engineer experienced with React, Node.js, TypeScript, PostgreSQL, and AWS.
5+ years of experience required. Team leadership experience is a plus.`,
  expectedScoreMin: 80,
  expectedScoreMax: 95,
};

export const MEDIUM_MATCH: GoldenPair = {
  name: 'Medium match — junior developer for mid-level role',
  cv: `Junior Developer with 2 years of professional experience.
Skills: React, JavaScript, basic Node.js.
No formal degree.`,
  job: `Mid-level Full Stack Engineer
Required skills: React, TypeScript, Node.js, PostgreSQL.
3+ years of experience required. A degree is preferred.`,
  expectedScoreMin: 55,
  expectedScoreMax: 75,
};

/**
 * Skills-first uplift pair. This is run twice by the harness — once with
 * skillsFirstMode=false and once with true — and the skills-first score must
 * be greater than or equal to the standard score, because the candidate has
 * strong demonstrated skills but lacks the required formal degree.
 */
export const SKILLS_FIRST_UPLIFT: GoldenPair = {
  name: 'Skills-first uplift — self-taught backend developer',
  cv: `Self-taught Developer with 8 years of freelance experience.
Skills: Python, Django, PostgreSQL, Docker.
No formal degree — entirely self-taught and project-driven.`,
  job: `Backend Python Developer
Required skills: Python, Django, PostgreSQL, Docker.
A degree is required.`,
  // Range applies to the standard (skillsFirstMode=false) run.
  expectedScoreMin: 50,
  expectedScoreMax: 85,
};

export const WEAK_MATCH: GoldenPair = {
  name: 'Weak match — marketing manager for data engineer role',
  cv: `Marketing Manager with 5 years of experience.
Skills: Google Ads, Facebook Ads, copywriting, SEO, Excel.`,
  job: `Senior Data Engineer
Required skills: Python, Spark, Databricks, SQL.
Data pipeline experience required.`,
  expectedScoreMin: 20,
  expectedScoreMax: 45,
};

/**
 * Missing-skills detection pair. The harness asserts the missingSkills array
 * includes at least one of: Kubernetes, CI/CD, or Terraform.
 */
export const MISSING_SKILLS: GoldenPair = {
  name: 'Missing skills detection — backend developer for DevOps role',
  cv: `Backend Developer with 4 years of experience.
Skills: Python, FastAPI, PostgreSQL, Docker, basic AWS.`,
  job: `DevOps Engineer
Required skills: Kubernetes, Terraform, CI/CD, Docker, AWS, Python scripting.`,
  expectedScoreMin: 25,
  expectedScoreMax: 60,
};

/** Skills the MISSING_SKILLS job spec requires but the CV lacks. */
export const MISSING_SKILLS_EXPECTED = ['Kubernetes', 'CI/CD', 'Terraform'];

export const GOLDEN_PAIRS: GoldenPair[] = [
  STRONG_MATCH,
  MEDIUM_MATCH,
  SKILLS_FIRST_UPLIFT,
  WEAK_MATCH,
  MISSING_SKILLS,
];
