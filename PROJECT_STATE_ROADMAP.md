# Project State & Execution Roadmap

Last updated: 2026-03-24
Owner: Product + Engineering
Status: In Progress

## 1) Goal

Ship a production-ready pilot of RecruitedAI where real users can test recruiting workflows safely, with:
- reliable auth
- tenant-safe CRUD
- stable AI-assisted operations
- deploy/test/rollback discipline

## 2) Current Baseline (Verified)

- **Branch**: `main`
- **AI Model**: Strictly locked to `gemini-2.5-flash`.
- **Infrastructure**: Supabase Auth + Postgres fully wired.
- **BFF Layer**: API Routes with rate limiting and idempotency active.
- **Build**: Fixed middleware type errors and literal-safe environment variable injection.

## 3) Execution Tracker

Legend:
- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed
- `[-]` Deferred

### A) Access & Auth
- [x] Fix `/login` page to perform real auth submission via `AuthContext.login`
- [x] Pass signup metadata (`account_type`, `company_name`) to Supabase
- [x] Add password reset flow (`/forgot-password` and `/reset-password`)
- [x] Implement RBAC-aware modular navigation (Talent Engine, Business Hub, Candidate Portal)

### B) Runtime Safety & Quality
- [x] Refactor `src/lib/runtime-config.ts` for literal-safe Next.js static replacement
- [x] Hardened `middleware.ts` for strict type safety during Vercel builds
- [x] Mandatory `lint + typecheck + test + build` in CI pipeline
- [x] API integration tests for auth + tenant isolation

### C) AI & Product Features
- [x] **Smart Parser**: Extract core metrics (notice, salary, hardware) and reformat CVs
- [x] **Live Note Taker**: Browser-based speech capture with Zoom/Teams/Meet integration UI
- [x] **Branded Candidate Packs**: Generate professional PDFs with agency logo and interview insights
- [x] **Job Brief Builder**: Voice-to-structured-data flow for creating job postings
- [x] **Smart Lead Finder**: Integrated sourcing for companies and decision-makers

### D) Core Backend Hardening
- [x] Structured API error telemetry with request IDs
- [x] Route-level rate limiting for AI and write-heavy endpoints
- [x] Idempotency key dedupe on create/update routes
- [x] Tenant-safe soft-delete and restore flows for Candidates, Jobs, and Clients

### E) Current Priorities (Outstanding)
- [ ] **P0: Storage Migration**: Replace Base64 Data URIs with Supabase Storage for resume files
- [ ] **P1: Billing Activation**: Connect `payment-dialog.tsx` to real Stripe checkout sessions
- [ ] **P1: Tenant Governance**: Implement owner-transfer policy and invite revoke/expiry UX
- [ ] **P2: Refactor**: Split `src/lib/data/hooks.ts` into domain-specific modules

## 4) Release Readiness Definition

Pilot-ready when all are true:
- Auth flows work on `/`, `/login`, `/signup`
- Supabase runtime is enforced in production
- Tenant isolation verified by tests
- No Base64 payload risks for large files (Storage migration complete)
- Stripe webhooks are live and updating `subscriptions` table
