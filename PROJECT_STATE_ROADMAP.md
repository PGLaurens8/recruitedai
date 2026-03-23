# Project State & Execution Roadmap

Last updated: 2026-03-23
Owner: Product + Engineering
Status: In Progress

## 1) Goal

Ship a production-ready pilot of RecruitedAI where real users can test recruiting workflows safely, with:
- reliable auth
- tenant-safe CRUD
- stable AI-assisted operations
- deploy/test/rollback discipline

## 2) Current Baseline (Verified)

- Branch: `main` (synced with `origin/main`)
- Latest commits:
  - `e4964c1` Expand membership and invite guardrail negative-path tests
  - `eeb43cb` Add role-guard denial tests for company member and invite routes
  - `5970f26` Add replay tests for idempotent candidate job and client creates
  - `b342390` Add restore-flow integration tests with audit log assertions
  - `98f5c73` Add tenant-safe restore, invites/members governance, and idempotency replay coverage
- Build: passing (`npm run build`)
- Typecheck: passing (`npm run typecheck`)
- Tests: passing (`npm run test`) (16 files / 86 tests)
- Lint: passing (`npm run lint`) with no warnings
- Secret scan: passing (`npm run security:secrets`)

## 3) Testing Access Plan

### 3.1 Real user testing path
- Supabase runtime (`NEXT_PUBLIC_RUNTIME_MODE=supabase`)
- Use your actual Supabase-authenticated user accounts

### 3.2 Demo testing path
- Mock runtime (`NEXT_PUBLIC_RUNTIME_MODE=mock`)
- Supported demo credentials:
  - email: `demo@dem.com`
  - password: `demo`
- This demo identity is only for mock-mode testing and does not create a real Supabase user.

## 4) Execution Tracker

Legend:
- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed
- `[-]` Deferred

### A) Access & Auth
- [x] Fix `/login` page to perform real auth submission via `AuthContext.login`
- [x] Add explicit mock demo credential support (`demo@dem.com` / `demo`)
- [x] Pass signup metadata (`account_type`, `company_name`) to Supabase
- [x] Add password reset flow
- [x] Add session-expiry UX handling

### B) Runtime Safety
- [x] Fail closed in production if runtime/env is invalid (no silent `mock` fallback)
- [x] Add startup/runtime config validation
- [x] Lock debug-only routes behind admin/developer in production

### C) Quality Gates & CI
- [x] Add ESLint config (non-interactive)
- [x] Make `lint + typecheck + test + build` mandatory in CI
- [x] Add API integration tests for auth + tenant isolation
- [x] Add one E2E smoke test (sign in -> create candidate -> parse/interview save)

### D) Product Readiness
- [x] Replace recruiter dashboard placeholder with live metrics
- [x] Replace sales dashboard placeholder with live metrics
- [x] Add production incident/error telemetry (request IDs + structured logs)
- [x] Add route-level rate limiting for AI and write-heavy endpoints
- [x] Add idempotency key dedupe on core create/update routes (candidates, jobs, clients, company, invites)
- [x] Add replay-safety tests for mutable candidate endpoints (analysis, interview)
- [x] Add replay-safety tests for company mutable endpoints (company settings, invites, company candidate patch)
- [x] Add restore-flow integration tests (candidate/job/client) plus audit-log verification tests
- [x] Add idempotency replay tests for remaining mutable create endpoints (candidate, job, client)

### E) Security & Operations
- [x] Rotate any exposed local/test API keys
- [x] Finalize `.env.example` with required vars only
- [x] Confirm Supabase backups/PITR and recovery runbook
- [x] Document staged rollout + rollback checklist

## 5) Command Checklist (Per Release Candidate)

Run and record outcomes:
1. `npm run lint`
2. `npm run security:secrets`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`

## 6) Release Readiness Definition

Pilot-ready when all are true:
- Auth flows work on `/`, `/login`, `/signup`
- Supabase runtime is enforced in production
- Tenant isolation verified by tests
- No unguarded debug or seed behavior in production
- CI gates are green
- Demo path works in mock mode for non-production demos

## 7) Execution Log

- 2026-03-23:
  - Published five backend hardening commits to `main` and synced with `origin/main` (HEAD `e4964c1`).
  - Added restore-flow integration coverage with audit-log assertions in `src/app/api/restore-flow.test.ts` (candidate/job/client restore routes).
  - Added replay-safety coverage for idempotent create endpoints in `src/app/api/create-idempotency-replay.test.ts` (candidate/job/client).
  - Added route-level role-guard denial tests for company members/invites in `src/app/api/company/role-guards.test.ts`.
  - Expanded service-level negative-path tests in `src/server/api/company-members.test.ts` and `src/server/api/company-invites.test.ts` (owner demotion lock, self-remove forbidden, expired invite rejection).
  - Revalidated with `npm run lint`, `npm run typecheck`, and `npm run test` (16 files / 86 tests passing).


- 2026-03-22:
  - Added replay integration tests for company mutable endpoints: src/app/api/company/idempotency-replay.test.ts and src/app/api/companies/idempotency-replay.test.ts.
  - Validated replay behavior for company settings updates, company invite create, and company candidate patch, including same-key replay and payload-mismatch rejection.
  - Revalidated with focused route replay tests and npm run typecheck (passing).

- 2026-03-22:
  - Wired idempotency into remaining mutable candidate endpoints: /api/candidates/[id]/analysis and /api/candidates/[id]/interview.
  - Added route-level replay integration tests in src/app/api/candidates/idempotency-replay.test.ts for same-key replay and key-reuse mismatch behavior.
  - Revalidated with focused idempotency/replay tests and npm run typecheck (passing).

- 2026-03-22:
  - Completed external key rotation tracker and provider-console rotation evidence in `docs/key-rotation-tracker.md`; roadmap security item moved to complete.

- 2026-03-22:
  - Added global API CORS headers in `next.config.ts` for reliable preflight responses (origin/methods/headers).
  - Kept middleware parser-safe matcher at `/:path*` and retained runtime static-asset short-circuit to avoid preview startup regressions.
  - Added missing auth form autocomplete attributes on login, signup, forgot-password, and reset-password pages.
  - Cleared remaining lint warnings by replacing `<img>` with `next/image` in branded templates/profile logo, and by switching Google Fonts to `next/font/google` in app layout.
  - Revalidated with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` (all passing).

- 2026-03-21:
  - Updated dev script defaults to non-Turbopack (`npm run dev`) and kept `dev:turbo` opt-in to reduce preview hard-restart churn.
  - Removed `next.config.ts` build-time ignore flags for TypeScript/ESLint to harden release safety.
  - Documented `NEXT_PUBLIC_*` env-change restart requirement in README runtime section.
  - Added missing `alt` text for company logo image on profile page to close accessibility warning.
  - Created two targeted commits (`9eb787e`, `da1e24c`) and verified branch is clean locally (ahead by 3 commits).
  - Push attempts from agent environment timed out; branch publish and PR creation are queued as next operator action.
  - Added key rotation completion tracker (`docs/key-rotation-tracker.md`) to evidence provider-console rotations and close remaining security item.
  - Added `security:secrets` npm script and CI secret-scan quality gate.
  - Added key-rotation and secret hygiene runbook (`docs/api-key-rotation-and-secret-hygiene.md`) and sanitized hardcoded key-like doc example(s).
  - Confirmed local `.env` values are git-ignored; provider-console key rotation remains an explicit owner action.
  - Removed temporary auth bypass controls from middleware and login surfaces.
  - Added full password reset flow (`/forgot-password` and `/reset-password`) and login status messaging.
  - Added session-expiry redirect UX (`reason=session-expired`) in auth state handling.
  - Replaced recruiter and sales dashboard placeholders with live workspace metrics.
  - Added structured API error telemetry with request context in `src/server/api/http.ts`.
  - Added operations docs: `docs/supabase-backup-recovery-runbook.md` and `docs/release-rollout-rollback-checklist.md`.
  - Revalidated with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- 2026-03-19:
  - Fixed Settings model discovery API contract to use GET on `/api/ai/list-models`.
  - Restored strict seed safeguards: production disabled + Admin/Developer-only access + explicit `{ "confirm": true }` intent.
  - Added distributed-capable API rate limiting (`@upstash/redis`) with safe in-memory fallback when env vars are unset/unavailable.
  - Migrated AI and write-heavy API routes to async `await enforceRateLimit(...)` usage.
  - Added/expanded tests: `requireUserAndCompanyRole` coverage and dedicated rate-limit unit tests.
  - Updated `.env.example` with optional Upstash env keys for multi-instance deployments.
  - Revalidated with `npm run lint`, `npm run typecheck`, and `npm run test`.
- 2026-03-18:
  - Fixed Supabase login post-auth redirect to role dashboard (users were previously left on login after successful auth).
  - Added temporary bottom-screen Enter App (Temporary) bypass button on / and /login.
  - Added middleware bypass cookie support (recruitedai-enter-bypass, 8h) for temporary access while auth hardening continues.
  - Revalidated with npm run typecheck.

- 2026-03-17:
  - Added Playwright E2E test infrastructure (`playwright.config.ts`, `e2e/smoke.spec.ts`).
  - Added npm scripts `test:e2e` and `test:e2e:smoke`.
  - Implemented a deterministic smoke flow in mock runtime:
    - sign in with demo credentials
    - create candidate record in mock store
    - save interview note from candidate profile
    - verify persistence after reload
- 2026-03-16:
  - Created roadmap/state file.
  - Fixed `/login` implementation path.
  - Added explicit mock demo credential support.
  - Wired signup metadata (`account_type`, `company_name`, `first_name`, `last_name`) to Supabase auth signup.
  - Restricted `/debug/*` routes to Admin/Developer in RBAC.
  - Added `.eslintrc.json` so `npm run lint` executes without setup prompts.
  - Installed ESLint dependencies (`eslint@8.57.1`, `eslint-config-next@15.3.8`) and unblocked lint execution.
  - Ran `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` successfully (lint currently has warnings only).
  - Enforced fail-closed production runtime behavior for invalid mode/env in runtime config and middleware.
  - Added GitHub Actions CI workflow to enforce lint/typecheck/test/build on push and pull requests.
  - Added `.env.example` template with runtime, Supabase, AI, and billing environment variables.
  - Added centralized runtime configuration validator and runtime-config test coverage.
  - Added auth/tenant-isolation tests for `requireUserAndCompany`.
  - Expanded automated test suite from 9 tests to 18 tests.
  - Revalidated lint/typecheck/test/build after runtime-validation refactor.

## 8) Priorities (Next Session)

Priority order for continuation:
1. **P0: Tenant governance completion (remaining)**
   - Implement owner-transfer policy and API guardrails (explicit transfer action, single-owner invariants, audit trail).
   - Add revoke/expire member-invite UX wiring and acceptance-state UX for pending/expired/revoked tokens.
2. **P1: Data integrity hardening (remaining)**
   - Add restore-flow tests for company-scoped restore routes under `/api/companies/[companyId]/*/restore`.
   - Add failure-path assertions for audit-log write failures (ensure non-blocking behavior is preserved).
3. **P1: Recruiter workflow completeness**
   - Consolidate candidate pipeline updates (stage, notes, scorecards, interview status) behind one stable API contract.
   - Add bulk-action APIs with tenant-safe limits and test coverage.

---
