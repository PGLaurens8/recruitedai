# RecruitedAI — FAQ & Known Issues

> **Status:** Draft, compiled 2026-07-23 from a code/commit/docs review.
> There is no external issue tracker (no GitHub Issues, no `.github` issue templates) — this
> file is derived from the code, `PROJECT_STATE_ROADMAP.md`, `CLAUDE.md`, and the internal
> review docs (`docs/CODE_REVIEW_2026_05_27.md`, `docs/UX_TEST_REPORT_2026_06_07.md`).
>
> FAQ answers are **drafts** grounded in what the code actually does. Anything not fully
> confirmed in this pass is marked **[VERIFY]**. No features that don't exist in the code
> are described here.

---

## Known Issues

Each entry describes a real limitation found in the code, the condition under which it
manifests, and any workaround present in the code.

### 1. Billing / payments are not implemented (Stripe checkout is a stub)
- **What breaks:** No real payment is ever taken. `src/components/feature/payment-dialog.tsx:35-40`
  simulates a gateway call with `setTimeout(…, 2000)` and then toasts "Payment Successful!";
  the card number/CVC entered in the form are discarded, not sent anywhere.
- There are **no billing API routes** — `src/app/api/billing/*` does not exist. The
  `subscriptions` table is defined but never written to by any code.
- `isActivePaidPlan()` (`src/lib/plan-limits.ts:72`) is hardcoded to `return false`, so **every
  account stays on trial-grade quota caps** regardless of any "purchase".
- **Condition:** any attempt to upgrade or pay.
- **Workaround (in code):** `src/app/billing/page.tsx` shows "Self-serve billing is coming soon /
  Stripe checkout is being wired up" and directs users to `mailto:billing@recruitedai.com` for
  manual activation.
- **Payment processor:** **Paddle** (confirmed). The `plan-limits.ts:70` comment is correct
  ("Replaced by a Paddle subscription lookup in Phase 3"); the **Stripe** references in the
  billing UI (`src/app/billing/page.tsx`), `README.md`, `PROJECT_STATE_ROADMAP.md`, and
  `CLAUDE.md` are **stale/inaccurate** and should be updated to Paddle.

### 2. Documentation is stale about the Storage migration (P0)
- `PROJECT_STATE_ROADMAP.md:57` and `CLAUDE.md` list "Replace Base64 Data URIs with Supabase
  Storage" as the **outstanding P0**, but for **resume files this is already implemented**:
  migrations `supabase/migrations/202605260011_resume_storage_bucket.sql` (+ `…0012`, `…0014`),
  the signed-upload route `src/app/api/upload/resume/route.ts`, and `src/lib/storage-client.ts`.
- **Residual limitation:** **avatar images** are still persisted as Base64 data URIs
  (`src/app/targeted-resume/page.tsx`, `src/app/linktree-bio/page.tsx`).
- **Likely bug:** `src/app/api/master-resume/route.ts:14` validates `avatarUri: z.string().max(2048)`.
  A real Base64 image data URI is far larger than 2048 chars, so persisting an uploaded avatar
  through this route would fail Zod validation (`VALIDATION_ERROR`). The cap implies a URL was
  expected, but callers pass data URIs. Not reproduced at runtime in this pass. **[VERIFY]**

### 3. Smart Lead Finder returns AI-generated (simulated) data, not a real B2B source
- `src/ai/flows/find-smart-leads.ts:54` instructs the model it has "a vast, **simulated** B2B
  database." Company results, decision-maker names, and **email addresses are model-generated
  and realistic-looking, not verified real contacts.**
- The "LinkedIn" links the company finder emits are LinkedIn **search-query URLs**
  (`.../search/results/people/?keywords=…`), not real profile links
  (`src/app/company-finder/page.tsx`).
- **Condition:** always. Users must verify any lead/contact before outreach.

### 4. Several UI features are shown but inert ("coming soon")
- **Video-platform auto-join** (Zoom/Teams/Meet) on `src/app/interview-analysis/page.tsx`
  ("Auto-join coming soon") — the "Connect" badges are presentational with no click handlers.
- **Linktree/bio "Save Changes"** button is `disabled` and labelled "Save Changes (Coming Soon)"
  (`src/app/linktree-bio/page.tsx:261`) — bio/link edits are **not persisted**.
- **Online-resume PDF download** toasts "Coming Soon! PDF download functionality is under
  development" (`src/app/online-resume/page.tsx:123`). Note: the *other* resume surfaces
  (`targeted-resume`, `master-resume`, `reports`) **do** export PDF — only this page is stubbed.
- **Client activity logging** shows a "coming soon" placeholder (`src/app/clients/[id]/page.tsx`).

### 5. List pages can mask fetch failures as empty/"not found"
- The candidates/jobs/clients list pages and the candidate detail page destructure only
  `{ data, isLoading }` from the data hook and ignore its `error` field
  (`src/lib/data/hooks.ts`). A failed fetch renders as "0 records" or "Candidate Not Found"
  rather than an error state (code-review finding P1-1/P1-2). **[VERIFY]** — inferred from the
  destructuring pattern; not reproduced at runtime.

### 6. Voice features are Chromium-only
- Voice job-brief entry (`/jobs/new`) and mock-interview prep (`/interview-prep`) use the Web
  Speech API, which is Chromium-only. On Firefox/Safari they degrade gracefully with a message
  ("Please try Chrome or Edge") and a **type-instead fallback**
  (`src/hooks/useVoiceJobBrief.ts`, `src/app/interview-prep/page.tsx:56`).

### 7. AI always calls the real Gemini API, even in mock mode
- Mock runtime mode (`NEXT_PUBLIC_RUNTIME_MODE=mock`) only mocks the **data layer and auth**
  (`src/lib/data/mock-store.ts`). AI flows are **not** mocked — every AI feature hits the real
  Gemini API and requires a valid `GOOGLE_GENAI_API_KEY`, subject to that key's quota. With no
  key set locally, AI features cannot run.

### 8. Mock mode always signs you in as a Recruiter
- In mock mode, sign-in is faked with a hardcoded `companyId: "mock-company"` and
  `role: "Recruiter"` (`src/context/auth-context.tsx`). **Candidate / Admin / Sales flows cannot
  be exercised via mock sign-in** — only through real Supabase auth.

### 9. `/billing` and `/profile` are not role-scoped
- Neither path has an entry in `rolePathRules`, and `isRoleAllowedForPath` returns `true` for
  unmatched paths (`src/lib/rbac.ts`). Any authenticated role — **including Candidate** — can
  reach `/billing`. Flagged (code review P2-4) to scope to Admin before billing ships.

### 10. Rate-limiting gaps on some AI/write routes
- `POST /api/ai/voice-job-brief` has **no** `enforceRateLimit` (the only `/api/ai/*` route
  missing it), and several legacy write routes (`candidates`/`clients`/`jobs` POST,
  `company/invites` POST, `master-resume` PUT, `onboarding` PATCH, legacy candidate
  `analysis`/`interview` PATCH) lack rate limiting — inconsistent with the newer
  `companies/[companyId]/*` routes. This allows uncapped Gemini spend / writes by an
  authenticated tenant (code review P2-1/P2-2).

### 11. Testing caveats
- The LLM eval suite (`src/ai/evals/match-eval.test.ts`) **silently skips** its entire golden-pair
  set unless `GOOGLE_GENAI_API_KEY` is present, so those quality assertions don't run in CI or
  locally without the key.
- `src/lib/runtime-config.test.ts` has **known pre-existing failures** noted as unrelated to
  feature work (`CLAUDE.md`). (Note: this suite passed in a full run on 2026-07-23 — the caveat
  may itself be stale. **[VERIFY]**)

### 12. Data-model / API surface notes
- There are **two overlapping candidate/client API surfaces**: the top-level `/api/candidates`
  & `/api/clients` and the `[companyId]`-scoped `/api/companies/[companyId]/candidates|clients`.
  Which is canonical is ambiguous. **[VERIFY]**
- `company_invites` has only a **SELECT** RLS policy (no INSERT/UPDATE/DELETE); writes rely on
  the service-role admin client, so RLS is not the backstop here as it is on other tables
  (code review P2-3).

---

## Frequently Asked Questions

> Placeholder Q&A drafted from the actual feature set. Answers are drafts for review; **[VERIFY]**
> marks anything not fully confirmed.

### 1. How does RecruitedAI score a candidate against a job?
It runs the `assess-job-match` AI flow (Gemini 2.5 Flash via Genkit) over the candidate's resume
and the job spec, returning a **0–100 match score** plus an explanation: matched skills, missing
skills, strengths, gaps, and notes on experience and education alignment. The score is meant to be
**explainable** — the UI shows matched skills as green and missing skills as amber — rather than a
black-box number. (Source: `src/ai/flows/assess-job-match.ts`, `/api/ai/match-job`.)

### 2. What is "Skills-First Mode"?
A toggle that tells the scoring flow to weight **demonstrated skills and real-world experience
more heavily than formal education credentials.** With it on, a candidate is not penalised for
lacking a specific degree if they show the required skills, and the `educationNote` explains that
education was weighted lightly. It's a core product philosophy, not a cosmetic setting. (Source:
`skillsFirstMode` in `src/ai/flows/assess-job-match.ts`.)

### 3. Which AI model powers RecruitedAI, and do I need my own key?
All AI features use **Google Gemini 2.5 Flash** through Genkit; the model is locked in
`src/ai/genkit.ts`. The server authenticates with `GOOGLE_GENAI_API_KEY` (Gemini Developer API).
AI runs against the real API **even in mock mode**, so a valid, quota-healthy key must be
configured. (Source: `src/ai/genkit.ts`, `CLAUDE.md`.)

### 4. Can I bulk-import CVs or sync with my ATS (Greenhouse, Lever, Workday, etc.)?
Not currently. RecruitedAI is **intentionally standalone** — you export CVs from your existing ATS,
screen them here, and take the ranked results back. ATS-agnostic bulk CSV import is a **roadmap
item, not yet built** (`README.md` roadmap, `PROJECT_STATE_ROADMAP.md`). CVs are uploaded one at a
time via a Supabase Storage signed-upload ticket and parsed by the CV-screening flow. **[VERIFY]**
(exact per-upload UX / whether multi-file selection exists.)

### 5. How do I pay for or upgrade my plan?
Right now you **can't self-serve.** The payment dialog is a stub (no real charge is taken) and
there is no billing backend, so the billing page directs you to email the team for **manual
activation**, and every account effectively stays on trial-grade quota caps. Real checkout is
planned but not wired up. The payment processor is **Paddle** (confirmed) — note the billing UI
and roadmap docs still say "Stripe", which is stale. (Source: `src/app/billing/page.tsx`,
`src/components/feature/payment-dialog.tsx`, `src/lib/plan-limits.ts`.)

### 6. What can each user role do?
- **Admin / Developer** — full access: all dashboards, candidate/CV screening, interview tools,
  jobs, clients, lead finder, reports, team management, settings.
- **Recruiter** — screening suite: candidates, CV screening, interview notes, jobs, clients,
  interview prep. (No lead finder, reports, team, or settings.)
- **Sales** — jobs, clients, company/lead finder, reports.
- **Candidate** — personal career tools: master resume, targeted-resume matching, online resume,
  linktree bio, interview prep.
(Source: `rolePathRules` in `src/lib/rbac.ts`, `src/lib/roles.ts`, nav in `src/lib/nav-utils.ts`.)

### 7. How does interview analysis / prep work?
Two sides: **Recruiters** paste a raw interview transcript into `/interview-analysis` and the
`analyze-interview` flow returns structured Q&A plus an overall assessment, which can be saved to
the candidate. **Candidates** use `/interview-prep` for a mock interview — the app generates 5
questions from a job spec and scores each spoken/typed answer (1–10) with feedback. (Source:
`src/ai/flows/analyze-interview.ts`, `generate-interview-questions.ts`, `analyze-interview-response.ts`.)

### 8. Does the Lead Finder give me real companies and contact emails?
**No — treat its output as leads to verify, not verified data.** The Smart Lead Finder generates
companies, decision-maker names, and email addresses with the AI model against a *simulated*
database; emails are realistic-looking but fabricated, and "LinkedIn" links are search queries,
not real profiles. Always confirm a contact before reaching out. (Source:
`src/ai/flows/find-smart-leads.ts`, `src/app/company-finder/page.tsx`.)

### 9. Which browsers do the voice features need?
The voice job-brief and voice interview-prep features rely on the Web Speech API, which is
**Chromium-only (Chrome / Edge).** On Firefox and Safari they fall back to typing, with a message
explaining the limitation. Everything else in the app is browser-agnostic. (Source:
`src/hooks/useVoiceJobBrief.ts`, `src/app/interview-prep/page.tsx`.)

### 10. Is my agency's data isolated from other tenants?
Yes — RecruitedAI is **multi-tenant with `company_id` scoping enforced at three layers**: route
middleware/RBAC, API guards (`requireUserAndCompany`), and Supabase row-level security keyed on
the `auth_company_id()` SQL function. Every tenant query is scoped to the company. (Source:
`middleware.ts`, `src/server/api/auth.ts`, `supabase/migrations/`, `CLAUDE.md`.) **[VERIFY]** —
note the `company_invites` table's RLS is SELECT-only (see Known Issue #12).

### 11. What happens when the AI is unavailable or rate-limited?
The app detects provider failures and surfaces an "AI temporarily unavailable" message rather than
crashing; on CV screening it notes the file was still uploaded so you can retry. AI and write-heavy
routes are rate-limited via Upstash Redis (with some known gaps — see Known Issue #10). (Source:
`src/server/api/ai-errors.ts`, `src/components/feature/provider-outage-listener.tsx`.)
