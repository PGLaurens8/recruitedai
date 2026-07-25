# Project State & Execution Roadmap

Last updated: 2026-07-25
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
- [ ] **P3: Docs cleanup — payment processor**: The processor is **Paddle** (confirmed 2026-07-23), not Stripe. Four stale "Stripe" references remain and should be updated to Paddle (not done today): the **P1 Billing Activation** line above, the billing UI (`src/app/billing/page.tsx`), `README.md`, and `CLAUDE.md`. Context in `docs/faq-known-issues.md`.

### F) Vacancy-Linked Matching & Match History (Planned — not started)

Two **separate** work items — do **not** conflate them. F1 is the vacancy-linking prerequisite; F2 is the history log + read views built on top of it. Verified 2026-07-25: an AI match today runs against free-form job-spec **text** (pasted or uploaded) with **no** reference to a saved Vacancy and **no** job title captured, so F1 is a hard prerequisite for F2's vacancy-side (reverse) view.

**F1) P2 — Vacancy save-and-link (prerequisite)** — [ ] Not started
- Let an AI match run against a **selected saved Vacancy** (`JobRecord`), not only pasted free text, and persist the vacancy link (`job_id`) on the match. Includes the vacancy picker in the match flow and a "Run match on an existing candidate" entry point on the candidate detail page.
- This is the "job-picker" dependency surfaced during Path A scoping. **Shared with F2 chunk (c) — one piece of work, build once; do not double-count or double-build.**

**F2) P2 — Persistent Match History + two read views (Path A — confirmed)** — [ ] Not started
Full scoped breakdown as estimated (~2–3 focused days total; chunk (c) is the F1 work, so F1+F2 together ≈ this total, not the sum of two separate builds):
- **(a) ~0.5 day** — Migration: new `match_history` table (`candidate_id`, `job_id`, job-title snapshot at match time, `score`, `skills_first_mode`, key strengths / missing-skills summary) + **RLS policy** keyed on `auth_company_id()` (mandatory per the 3-layer tenancy model) + camelCase types + snake_case hook mapping + **mock-store support** (app defaults to mock mode; e2e needs it).
- **(b) ~0.5 day** — Record-match API route (envelope + Zod + idempotency + company scoping) + wire it to append a history row after each successful match + a round-trip unit test.
- **(c) ~0.5–1 day** — Vacancy selector in the match flow + "Run match on an existing candidate" entry point. **This is F1 — same work, build once.**
- **(d) ~0.5–1 day** — Two read-only views: candidate "Match History" table (most-recent first) + vacancy "Matched Candidates" table (sorted by score). No filtering/sorting controls/export in this pass.

Design note: the committed `candidates.ai_score` / `match_details` columns stay as the denormalized "latest match" (drives the detail-page card + the sortable AI Score list column); `match_history` is the append-only log. Each match run writes **both**.

## 4) Release Readiness Definition

Pilot-ready when all are true:
- Auth flows work on `/`, `/login`, `/signup`
- Supabase runtime is enforced in production
- Tenant isolation verified by tests
- No Base64 payload risks for large files (Storage migration complete)
- Stripe webhooks are live and updating `subscriptions` table
