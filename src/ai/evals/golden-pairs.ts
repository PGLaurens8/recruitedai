/**
 * @fileOverview Golden CV/job pairs for evaluating the assess-job-match AI flow.
 *
 * Because the underlying LLM (Gemini 2.5 Flash) is non-deterministic, these
 * fixtures are not used to assert exact outputs. Instead the eval harness
 * (src/ai/evals/match-eval.test.ts) asserts that scores fall within expected
 * ranges, that the output structure is well-formed, and that specific
 * behavioral guarantees hold (skills-first uplift, missing-skills detection).
 *
 * Each CV is encoded as a base64 `text/plain` data URI because the flow
 * consumes the resume via `{{media url=masterResumeDataUri}}`. The job spec is
 * passed as plain text via `jobSpecText`.
 *
 * These cases were migrated from the HTTP-based harness (run-eval.js /
 * eval-test-cases.json) so they can run in-process via `npm run test:evals`
 * without a running server or auth cookie.
 */

/** Encode a plain-text CV as the `text/plain` base64 data URI the flow expects. */
export function textToDataUri(text: string): string {
  return `data:text/plain;base64,${Buffer.from(text, 'utf-8').toString('base64')}`;
}

export interface GoldenPair {
  /** Stable identifier for the scenario (used as the test name). */
  id: string;
  /** Grouping label, e.g. `strong-fit`, `weak-fit`, `moderate-fit`. */
  category: string;
  /** Raw CV text (encoded to a data URI before being passed to the flow). */
  cv: string;
  /** Raw job specification text (passed as `jobSpecText`). */
  job: string;
  /** Whether to run the flow with skillsFirstMode enabled. Defaults to false. */
  skillsFirstMode?: boolean;
  /**
   * Non-empty when this case is one half of a skillsFirstMode ON/OFF pair that
   * shares an identical CV + job. The harness asserts the ON score is >= the
   * OFF score for the same pair key.
   */
  pair?: string;
  /** Inclusive lower bound for the expected matchScore. */
  expectedScoreMin: number;
  /** Inclusive upper bound for the expected matchScore. */
  expectedScoreMax: number;
  /**
   * Job-spec skills the CV lacks. When set, the harness asserts the
   * `missingSkills` output surfaces at least one of them (case-insensitive
   * substring match).
   */
  missingSkillsExpected?: string[];
  /** Human-review note describing what a correct result looks like. */
  notes: string;
}

export const STRONG_FIT_FRONTEND: GoldenPair = {
  id: 'strong-fit-frontend',
  category: 'strong-fit',
  skillsFirstMode: false,
  cv: `Senior Frontend Engineer with 8 years of experience building production web apps. Deep expertise in React, TypeScript, Next.js, and Redux. Led the rebuild of a checkout flow that lifted conversion 18%. Strong on accessibility (WCAG AA), performance profiling, and component-library design. Mentors 3 junior engineers. Comfortable with REST and GraphQL APIs, Jest/React Testing Library, and CI/CD.`,
  job: `Senior Frontend Engineer. Required: 5+ years building complex React + TypeScript applications, experience with Next.js, state management, and a strong focus on performance and accessibility. Nice to have: mentoring experience, GraphQL, automated testing.`,
  expectedScoreMin: 78,
  expectedScoreMax: 100,
  notes:
    'Should be a clear strong fit. matchedSkills include React, TypeScript, Next.js; strengths reference the conversion win and mentoring; missingSkills should be minimal or empty.',
};

export const STRONG_FIT_SRE: GoldenPair = {
  id: 'strong-fit-sre',
  category: 'strong-fit',
  skillsFirstMode: false,
  cv: `Site Reliability Engineer, 7 years. Runs production Kubernetes clusters on AWS (EKS), infrastructure-as-code with Terraform, observability with Prometheus/Grafana, and incident response on-call. Cut mean-time-to-recovery by 40% and automated CI/CD pipelines with GitHub Actions and ArgoCD. Comfortable scripting in Go and Python.`,
  job: `SRE / DevOps Engineer. Required: hands-on Kubernetes in production, AWS, Terraform, and monitoring/observability tooling. Must have incident-response experience and strong automation instincts. Bonus: Go or Python scripting.`,
  expectedScoreMin: 75,
  expectedScoreMax: 100,
  notes:
    'Strong fit. matchedSkills include Kubernetes, AWS, Terraform, Prometheus/Grafana; experienceAlignment should say seniority matches well.',
};

export const WEAK_FIT_DESIGNER_TO_BACKEND: GoldenPair = {
  id: 'weak-fit-designer-to-backend',
  category: 'weak-fit',
  skillsFirstMode: false,
  cv: `Graphic Designer with 6 years in brand identity, print, and social media assets. Expert in Adobe Photoshop, Illustrator, and Figma. Manages a small design team and client relationships. No programming background beyond basic HTML tweaks to marketing pages.`,
  job: `Senior Backend Engineer (Go). Required: 6+ years building distributed backend services in Go, designing REST/gRPC APIs, working with PostgreSQL, message queues, and high-throughput systems. Strong CS fundamentals expected.`,
  expectedScoreMin: 0,
  expectedScoreMax: 30,
  missingSkillsExpected: ['Go'],
  notes:
    'Clear weak fit. missingSkills dominated by Go, distributed systems, databases; summary should state the candidate is not aligned with a backend engineering role.',
};

export const WEAK_FIT_HOSPITALITY_TO_DATASCIENCE: GoldenPair = {
  id: 'weak-fit-hospitality-to-datascience',
  category: 'weak-fit',
  skillsFirstMode: false,
  cv: `Hospitality Operations Manager, 10 years running hotels and restaurants. Skilled in staff scheduling, budgeting, vendor negotiation, and customer experience. Comfortable with Excel and standard POS/booking systems. Recently completed an online intro-to-data course covering basic spreadsheet analysis.`,
  job: `Senior Data Scientist. Required: 5+ years applied machine learning, strong Python (pandas, scikit-learn, PyTorch or TensorFlow), statistics, experiment design, and productionizing models. Must communicate findings to stakeholders.`,
  expectedScoreMin: 0,
  expectedScoreMax: 28,
  notes:
    'Weak fit. Reasoning should note the absence of ML, Python, and statistics experience; transferable soft skills alone should not push the score up.',
};

/**
 * Non-traditional strong-signal pair (skillsFirstMode ON). Shares CV + job with
 * NONTRADITIONAL_STRONG_SIGNAL_NORMAL_MODE. The role says "degree not required",
 * so the paired delta here tends to be small — the skills-first flag has little
 * to discount. The ON variant must still not score below the OFF variant.
 */
export const NONTRADITIONAL_STRONG_SIGNAL_SKILLS_FIRST: GoldenPair = {
  id: 'nontraditional-strong-signal-shipped-project',
  category: 'non-traditional-strong-signal',
  pair: 'nontraditional-degree',
  skillsFirstMode: true,
  cv: `Self-taught software developer, no university degree and no formal full-time job history. Over the last 3 years single-handedly built, shipped, and still maintains an open-source invoicing SaaS used by 4,000+ small businesses (12k GitHub stars). Full stack: React + TypeScript frontend, Node.js/Express backend, PostgreSQL, Stripe billing, deployed on AWS with Docker and GitHub Actions CI. Handles ~200 paying customers and their support. Wrote the payments, auth, and multi-tenant data layers from scratch.`,
  job: `Full-Stack Engineer. Required: solid React + TypeScript, a backend language (Node.js preferred), relational databases, and experience shipping and operating a real product. Degree not required — we hire on demonstrated ability.`,
  expectedScoreMin: 65,
  expectedScoreMax: 100,
  notes:
    'Must score reasonably well and MUST NOT be penalized for lacking a degree or formal employment. strengths should credit the shipped/maintained SaaS, paying customers, and full-stack scope. educationNote should acknowledge the missing degree was weighted lightly (skills-first). matchedSkills include React, TypeScript, Node.js, PostgreSQL.',
};

export const NONTRADITIONAL_STRONG_SIGNAL_NORMAL_MODE: GoldenPair = {
  id: 'nontraditional-strong-signal-normal-mode',
  category: 'non-traditional-strong-signal',
  pair: 'nontraditional-degree',
  skillsFirstMode: false,
  cv: `Self-taught software developer, no university degree and no formal full-time job history. Over the last 3 years single-handedly built, shipped, and still maintains an open-source invoicing SaaS used by 4,000+ small businesses (12k GitHub stars). Full stack: React + TypeScript frontend, Node.js/Express backend, PostgreSQL, Stripe billing, deployed on AWS with Docker and GitHub Actions CI. Handles ~200 paying customers and their support. Wrote the payments, auth, and multi-tenant data layers from scratch.`,
  job: `Full-Stack Engineer. Required: solid React + TypeScript, a backend language (Node.js preferred), relational databases, and experience shipping and operating a real product. Degree not required — we hire on demonstrated ability.`,
  expectedScoreMin: 55,
  expectedScoreMax: 100,
  notes:
    'Identical CV and role to nontraditional-strong-signal-shipped-project, but skillsFirstMode is OFF. This measures the flag\'s effect: the demonstrated-skill evidence is unchanged, so the score should still be respectable. A large drop vs the skills-first variant (or educationNote/summary penalizing the missing degree) is the signal to watch. The paired delta is asserted (ON >= OFF).',
};

export const MODERATE_FIT_PYTHON_TO_DATA_ENG: GoldenPair = {
  id: 'moderate-fit-python-to-data-eng',
  category: 'moderate-fit',
  skillsFirstMode: false,
  cv: `Backend Developer, 4 years. Builds Python/Django web services backed by PostgreSQL, writes complex SQL, and integrates third-party APIs. Some exposure to Redis caching and writing batch cron jobs. Has not used distributed data-processing frameworks or workflow orchestrators.`,
  job: `Data Engineer. Required: strong Python and SQL, plus hands-on experience with distributed processing (Spark), a workflow orchestrator (Airflow), streaming (Kafka), and building data warehouses. Cloud data platform experience (BigQuery/Snowflake/Redshift) expected.`,
  expectedScoreMin: 25,
  expectedScoreMax: 55,
  missingSkillsExpected: ['Spark', 'Airflow', 'Kafka'],
  notes:
    'Partial/moderate fit. matchedSkills include Python and SQL; missingSkills include Spark, Airflow, Kafka, warehousing. areasForImprovement should point at pipeline/orchestration tooling. NOTE: Python/SQL are prerequisites, not the core of the role — the four distinguishing tools (Spark/Airflow/Kafka/warehousing) are all absent, so a score in the low 30s is correct, not a bug. Range widened down after a real run scored 30.',
};

export const SENIORITY_GAP_JUNIOR_FOR_LEAD: GoldenPair = {
  id: 'seniority-gap-junior-for-lead',
  category: 'seniority-gap',
  skillsFirstMode: false,
  cv: `Frontend Developer with 1 year of professional experience since a bootcamp. Solid, current React and TypeScript skills; shipped several features on a small team. Has never led a project, mentored others, or owned architecture decisions.`,
  job: `Lead Frontend Engineer. Required: 8+ years frontend experience with deep React expertise, a track record of leading teams, owning architecture, and mentoring engineers. This is a hands-on leadership role.`,
  expectedScoreMin: 10,
  expectedScoreMax: 42,
  notes:
    'Skills match the tech stack but experienceAlignment should clearly flag the seniority and leadership gap (1 year vs 8+ and no leadership). Score should be pulled down by the experience/leadership mismatch, not the React skills. NOTE: for a Lead role, seniority + leadership ARE the requirement (not modifiers), so a low-teens score is the faithful quantification of a correct diagnosis, not a double-penalty. Range lowered after a real run scored 15.',
};

/**
 * Borderline degree-required pair (skillsFirstMode ON). Shares CV + job with
 * BORDERLINE_DEGREE_REQUIRED_NORMAL. Unlike the shipped-SaaS pair, this role
 * EXPLICITLY requires a CS degree the candidate lacks — so there is a real
 * credential gap for normal mode to penalize and skills-first mode to discount,
 * which is what makes the paired delta meaningful here.
 */
export const BORDERLINE_DEGREE_REQUIRED_SKILLS_FIRST: GoldenPair = {
  id: 'borderline-degree-required-skillsfirst',
  category: 'non-traditional-borderline',
  pair: 'borderline-degree',
  skillsFirstMode: true,
  cv: `Bootcamp-trained developer, 2 years at a small web agency. No university degree. Comfortable with JavaScript, React, and building basic Node.js REST APIs; shipped one internal analytics dashboard end to end and contributed small fixes across team projects. Currently learning TypeScript. Limited exposure to automated testing and CI/CD.`,
  job: `Mid-level Software Engineer. Required: a Bachelor's degree in Computer Science or a related field, 2+ years building web applications, solid JavaScript and React, and familiarity with REST APIs. Nice to have: TypeScript, automated testing, CI/CD.`,
  expectedScoreMin: 55,
  expectedScoreMax: 85,
  notes:
    'Borderline (not ceiling) skills match: meets most technical requirements but not overwhelmingly. The role EXPLICITLY requires a CS degree, which the candidate lacks — so unlike the shipped-SaaS pair, there IS a credential gap for normal mode to penalize. With skillsFirstMode ON the missing required degree should be discounted, keeping the score respectable. Compare against the OFF variant via the asserted paired delta (ON >= OFF).',
};

export const BORDERLINE_DEGREE_REQUIRED_NORMAL: GoldenPair = {
  id: 'borderline-degree-required-normal',
  category: 'non-traditional-borderline',
  pair: 'borderline-degree',
  skillsFirstMode: false,
  cv: `Bootcamp-trained developer, 2 years at a small web agency. No university degree. Comfortable with JavaScript, React, and building basic Node.js REST APIs; shipped one internal analytics dashboard end to end and contributed small fixes across team projects. Currently learning TypeScript. Limited exposure to automated testing and CI/CD.`,
  job: `Mid-level Software Engineer. Required: a Bachelor's degree in Computer Science or a related field, 2+ years building web applications, solid JavaScript and React, and familiarity with REST APIs. Nice to have: TypeScript, automated testing, CI/CD.`,
  expectedScoreMin: 30,
  expectedScoreMax: 65,
  notes:
    'Identical CV and role to borderline-degree-required-skillsfirst, but skillsFirstMode is OFF. The role requires a CS degree the candidate does not have, so normal mode should let the missing REQUIRED credential drag the score down. A meaningful positive delta (ON minus OFF) here is the flag actually working — this is the case designed to expose the effect the shipped-SaaS pair could not, because that role said "degree not required".',
};

export const GOLDEN_PAIRS: GoldenPair[] = [
  STRONG_FIT_FRONTEND,
  STRONG_FIT_SRE,
  WEAK_FIT_DESIGNER_TO_BACKEND,
  WEAK_FIT_HOSPITALITY_TO_DATASCIENCE,
  NONTRADITIONAL_STRONG_SIGNAL_SKILLS_FIRST,
  NONTRADITIONAL_STRONG_SIGNAL_NORMAL_MODE,
  MODERATE_FIT_PYTHON_TO_DATA_ENG,
  SENIORITY_GAP_JUNIOR_FOR_LEAD,
  BORDERLINE_DEGREE_REQUIRED_SKILLS_FIRST,
  BORDERLINE_DEGREE_REQUIRED_NORMAL,
];
