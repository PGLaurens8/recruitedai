# Project State & Execution Roadmap

Last updated: 2026-03-16
Owner: Product + Engineering
Status: In Progress

## 1) Goal

Ship a production-ready pilot of RecruitedAI where real users can test recruiting workflows safely, with:
- reliable auth
- tenant-safe CRUD
- stable AI-assisted operations
- deploy/test/rollback discipline

## 2) Current Baseline (Verified)

- Branch: `main`
- Build: passing (`npm run build`)
- Typecheck: passing (`npm run typecheck`)
- Tests: passing (`npm run test`) but low coverage (2 files / 9 tests)
- Lint: not yet configured (currently blocks `npm run lint`)

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
- [ ] Add password reset flow
- [ ] Add session-expiry UX handling

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
- [ ] Replace recruiter dashboard placeholder with live metrics
- [ ] Replace sales dashboard placeholder with live metrics
- [ ] Add production incident/error telemetry (request IDs + structured logs)
- [ ] Add route-level rate limiting for AI and write-heavy endpoints

### E) Security & Operations
- [ ] Rotate any exposed local/test API keys
- [x] Finalize `.env.example` with required vars only
- [ ] Confirm Supabase backups/PITR and recovery runbook
- [ ] Document staged rollout + rollback checklist

## 5) Command Checklist (Per Release Candidate)

Run and record outcomes:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`

## 6) Release Readiness Definition

Pilot-ready when all are true:
- Auth flows work on `/`, `/login`, `/signup`
- Supabase runtime is enforced in production
- Tenant isolation verified by tests
- No unguarded debug or seed behavior in production
- CI gates are green
- Demo path works in mock mode for non-production demos

## 7) Execution Log

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
