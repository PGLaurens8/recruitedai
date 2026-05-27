# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Next.js dev server on http://localhost:9002
npm run genkit:dev       # Genkit dev UI for AI flows (separate terminal), runs src/ai/dev.ts
npm run genkit:watch     # Same, with file watching
npm run build            # Production build (also the CI gate for type/literal-injection issues)
npm run lint             # next lint (eslint)
npm run typecheck        # tsc --noEmit
npm test                 # Vitest unit tests (single run)
npm run test:e2e         # Playwright e2e (full suite)
npm run test:e2e:smoke   # Playwright smoke test, chromium only
npm run security:secrets # Scan tree for leaked API keys / secrets
```

Run a single unit test: `npx vitest run src/lib/rbac.test.ts` (or `npx vitest src/lib/rbac.test.ts` to watch).
Unit tests live next to source as `*.test.ts` (vitest, node environment). E2e tests live in `e2e/` (currently `smoke.spec.ts`) and run via Playwright against its own dev server on **port 9010** forced into **mock** mode — independent of the 9002 dev server. The CI gate is `lint + typecheck + test + build` — all four must pass.

## Runtime Modes

The app runs in one of two modes, selected by `NEXT_PUBLIC_RUNTIME_MODE` (`src/lib/runtime-config.ts`):
- **`mock`** — no backend; data served from `src/lib/data/mock-store.ts`. Default for local dev when unset.
- **`supabase`** — real Supabase Auth + Postgres. Required in production (build/middleware will hard-fail otherwise).

`NEXT_PUBLIC_*` vars must be read as full `process.env.NEXT_PUBLIC_X` literals so Next.js can statically inline them into the browser bundle — never destructure or index `process.env` dynamically for these. After changing them in Vercel, a **redeploy is required** (see `VERCEL_DEPLOYMENTS.md`). Data hooks in `src/lib/data/hooks.ts` branch on the mode and either hit the API or the mock store, so client components stay mode-agnostic.

## Architecture

**Stack:** Next.js 15 (App Router) · React 18 · Tailwind + ShadCN/Radix · Supabase (Postgres/Auth/RLS) · Genkit + Gemini · Upstash Redis (rate limiting) · Zod.

**Request flow:** Client component → `src/lib/data/hooks.ts` / `src/lib/api-client.ts` → API route in `src/app/api/**/route.ts` → helpers in `src/server/api/` → Supabase. AI features go through `src/app/api/ai/*` → flows in `src/ai/flows/`.

### Auth, RBAC, and tenancy (three enforcement layers)
1. **`middleware.ts`** — runs on every request. Validates runtime config, resolves the Supabase user, and for page routes checks `src/lib/rbac.ts` (`isPublicPath`, `isRoleAllowedForPath`, `getDefaultRouteForRole`). Roles come from `user.app_metadata.role` (tamper-proof, set server-side) with a `profiles` table fallback. API routes are skipped here — they self-enforce.
2. **API route guards** — every route calls `requireUserAndCompany()` or `requireUserAndCompanyRole([...])` from `src/server/api/auth.ts`, which resolves `companyId` from the `profiles` table and rejects tenant mismatches. All queries are scoped `.eq('company_id', companyId)`.
3. **Supabase RLS** — every tenant table has row-level security keyed on the `auth_company_id()` SQL function. This is the last line of defense even if app code forgets a filter.

Roles are the closed set in `src/lib/roles.ts`: `Admin | Recruiter | Sales | Candidate | Developer`.

### API route conventions
Routes follow a strict envelope pattern (`src/server/api/http.ts`):
- `getRequestId(request)` first; wrap the body in `try/catch`; return `jsonSuccess(requestId, data)` or `jsonError(requestId, error)`.
- Throw `ApiRouteError(status, code, message, details)` for expected failures — never return ad-hoc error shapes.
- Responses are `{ ok, requestId, data }` or `{ ok, requestId, error }`. The client unwraps this in `api-client.ts`.
- Validate input with Zod (`safeParse` → throw `VALIDATION_ERROR`, or `.parse`).
- Mutating routes use **idempotency** (`runIdempotent` / `readIdempotencyKey`, `src/server/api/idempotency.ts`) and AI/write-heavy routes use **rate limiting** (`enforceRateLimit`, `src/server/api/rate-limit.ts`).
- Deletes are **soft deletes** (`deleted_at`) with restore routes (`.../restore`).

### Database
Schema lives only in `supabase/migrations/` (timestamped SQL, applied in order). The DB uses `snake_case`; app types in `src/lib/data/types.ts` use `camelCase` — routes map between them explicitly on insert/select.

## Architecture Philosophy
- **Multi-tenant SaaS:** all data is scoped to `company_id`, enforced at both API middleware and Supabase RLS.
- **AI flows** live in `src/ai/flows/` and are called via API routes in `src/app/api/ai/`.
- **All AI uses Gemini 2.5 Flash via Genkit** — the model is locked in `src/ai/genkit.ts` (`googleai/gemini-2.5-flash`). Do not change it.
- **Skills-First Mode** is a core product philosophy — the platform explicitly supports hiring based on demonstrated skills over formal education credentials. This is intentional and meaningful to the product owner. See the `skillsFirstMode` flag threaded through `assess-job-match.ts`.

## Key Patterns
- **New AI flow:** define input/output schemas with Zod, write a `definePrompt`, wrap in `defineFlow`, export a typed async function, create an API route in `src/app/api/ai/`, and register the flow import in `src/ai/dev.ts`.
- **New database column:** always use a migration file in `supabase/migrations/` with `ADD COLUMN IF NOT EXISTS`.
- **Type changes:** update `src/lib/data/types.ts` to match — keep optional fields optional.
- **File storage:** never use Base64 Data URIs for file storage in production — Supabase Storage is the target (migration in progress). Data URIs are still used as the transport format into AI flows (`{{media url=...}}`), which is fine; the concern is persistence.

## Current P0/P1 Work
- **P0 — Storage Migration:** replace Base64 Data URIs with Supabase Storage bucket uploads for resume files.
- **P1 — Billing:** connect `payment-dialog.tsx` to real Stripe checkout sessions.
- **P1 — Tenant Governance:** owner-transfer policy and invite revoke/expiry UX.
- Pre-existing test failures in `src/lib/runtime-config.test.ts` are known and unrelated to feature work.

See `PROJECT_STATE_ROADMAP.md` for the full execution tracker.

## Operational Docs
Operational runbooks live in `docs/`: `HOW_TO_SEED.md` (seeding the DB via the `/api/seed` route), `supabase-backup-recovery-runbook.md`, `release-rollout-rollback-checklist.md`, and `api-key-rotation-and-secret-hygiene.md` (paired with `npm run security:secrets`). `VERCEL_DEPLOYMENTS.md` covers the redeploy-after-env-change requirement.

## Product Context
RecruitedAI solves CV screening for independent recruiters and small agencies. The target customer screens 50–300 CVs per role manually. The core differentiator is **explainable, skills-first AI scoring — not keyword matching**. See `README.md` for full positioning.
