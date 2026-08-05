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

### F) Billing & Payments — Paddle (Planned — not started · P1 · blocks revenue)

Real Paddle Billing checkout end-to-end. **Supersedes** the stub "P1: Billing Activation" line in section E and the never-built Stripe design (no Stripe/Paddle code, routes, SDK, or env vars exist today; `companies.plan` + trial columns and `usage_counters` are the only real scaffolding). **Confirmed decisions (2026-07-25):**
- (a) **Flat-rate per-plan first** — Starter + Agency, monthly + annual. Per-seat quantity billing deferred to a fast-follow; Scale stays "Talk to sales".
- (b) Paddle **Billing** (not Classic) — confirmed in dashboard.
- (c) Extend `companies` with Paddle columns + a separate `billing_events` table. **No** competing `subscriptions` table.
- (d) Doc cleanup folded in (chunk F).

**Estimate: ~4 focused dev-days** (flat-rate scope), plus Paddle catalog/ops setup (chunk 0) and owner input. Entitlement already flows through `companies.plan` → `plan-limits.ts`, so once the webhook flips `plan`, quota enforcement follows automatically.

**Chunk 0 — Paddle catalog + config** (~0.5 day + owner input · prerequisite, mostly ops) — [x] Catalog done 2026-08-05 · credentials outstanding
- Create products/prices per plan×cycle (Starter/Agency × monthly/annual, USD + ZAR) in Paddle **sandbox** first; record the `price_id → plan` mapping. Obtain client-side token, server API key, webhook secret. Webhook testing needs sandbox + a deployed preview (or tunnel), not pure local.
- **Sandbox catalog created 2026-08-05.** Mapping table lives in `src/server/billing/paddle-catalog.ts` (server-only; the trusted `price_id → plan` source chunk C requires). Production entries are deliberately empty behind `PADDLE_ENVIRONMENT` so a live deploy fails to resolve rather than granting a plan off sandbox IDs.

  | Plan · cycle | `price_id` | USD | ZAR (ZA) |
  | --- | --- | --- | --- |
  | Starter · monthly | `pri_01kz9e98ehk8hxs0jw8jncvb5b` | 3900 | 59900 |
  | Starter · annual | `pri_01kz9e98jymvt1gb85p38ntena` | 38400 | 598800 |
  | Agency · monthly | `pri_01kz9e98px8c0vtry3rwjcd2j1` | 7900 | 119900 |
  | Agency · annual | `pri_01kz9e98v7xemzbf7xhx25ma19` | 78000 | 1198800 |

  Products: Starter `pro_01kz9e984t6sz6y02me5hh9x4h`, Agency `pro_01kz9e98av6vvfq1eft53c5e64` (both `saas` tax category).

  Decisions taken at creation (2026-08-05): **7-day trial, cardless** (`requires_payment_method: false`) to match the pricing-page promise of no card up front; **quantity fixed at 1–1** so per-seat billing is impossible by construction until the fast-follow deliberately widens it; **USD base + ZAR override for ZA only** — GBP/EUR overrides were created then removed, because `src/lib/currency.ts` models only USD and ZAR and the pricing page would have quoted those customers the wrong currency. Adding a currency means touching `Currency`, `formatPrice`, the plan price tables and `company.currency`, not just the catalog.
- **Still outstanding:** client-side token, server API key, webhook secret (none obtained yet — chunks B and C are blocked on these).

**Chunk A — Data model migration** (~0.5 day) — [ ] Not started
- Add to `companies`: `paddle_customer_id`, `paddle_subscription_id`, `subscription_status`, `current_period_ends_at`, `cancel_at_period_end`. New `billing_events` table (`event_id` unique, type, payload, `occurred_at`, `processed_at`) for webhook **idempotency + audit**. RLS on both (service-role writes only). Types + hook mapping.

**Chunk B — Checkout flow** (~1 day) — [ ] Not started
- `POST /api/billing/checkout` (envelope + Zod + auth + rate-limit); Paddle.js overlay on the billing page; embed `company_id` in Paddle `custom_data`. **Delete `payment-dialog.tsx`** (pure mock; also collects raw card data — never used with Paddle-hosted checkout).

**Chunk C — Webhook handler** (~1–1.5 days · **SECURITY CORE**) — [ ] Not started
- `POST /api/billing/webhook`, public in `middleware.ts` but guarded **solely** by signature. Requirements:
  - Verify `Paddle-Signature` HMAC over the **raw** request body (`await request.text()`, not `.json()`) + timestamp window (**replay guard**).
  - **Idempotent**: dedupe by `event_id` via `billing_events` so retried events can't double-grant.
  - Handle `subscription.created/activated/updated/canceled` → flip `companies.plan` + trial/status/period fields; **out-of-order guard** via `occurred_at`.
  - **Tenant binding**: validate the event's customer ↔ `company_id`; map `price_id → plan` from the trusted server table, **never** client input.
  - **Webhook is the ONLY source of entitlement — never grant a plan from the checkout-success redirect** (`?success=true` is forgeable).
  - Secrets server-only (`PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`); **only** the public client token may be `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`.

**Chunk D — Reflect real status in app** (~0.5–1 day) — [ ] Not started
- Billing page reads real `companies.plan` / `subscription_status` / `current_period_ends_at` (**remove the hardcoded `currentPlanId`**), trial banner, Paddle customer-portal "manage subscription" link, cancel/resume UX.

**Chunk E — Tests** (~0.5–1 day) — [ ] Not started
- Signature valid/invalid/replay, idempotent replay, `price_id → plan` mapping, checkout auth/validation, plan-reflection; mock-mode path.

**Chunk F — Docs cleanup** (~0.5 day · the folded-in P3) — [ ] Not started
- Fix real stale Stripe refs: billing UI Alert, `CLAUDE.md` P1 line, this doc's **section-E P1 line** and **section-4 release-readiness line** ("Stripe webhooks … subscriptions table").
- Add a **dated correction** to `docs/key-rotation-tracker.md`: the 2026-03-22 Stripe key-rotation rows were **inaccurate — no Stripe integration was ever built** (correct in place, do **not** silently delete).
- Supersede `CODEX_IMPLEMENTATION_SPEC.md` / `CODEX_IMPLEMENTATION_DELTA.md` — **recommended: keep but add a dated "SUPERSEDED — historical, do not follow" banner** pointing to `CLAUDE.md` + this roadmap, rather than delete (preserves provenance; they describe a Stripe+Firebase-era design never built). Deletion is the alternative if the stale Stripe env instructions are judged an active footgun.

**Not in this pass (fast-follow):** per-seat quantity billing + proration, Scale self-serve checkout, candidate-Pro billing.

### G) Vacancy-Linked Matching & Match History (Planned — not started)

Two **separate** work items — do **not** conflate them. G1 is the vacancy-linking prerequisite; G2 is the history log + read views built on top of it. Verified 2026-07-25: an AI match today runs against free-form job-spec **text** (pasted or uploaded) with **no** reference to a saved Vacancy and **no** job title captured, so G1 is a hard prerequisite for G2's vacancy-side (reverse) view.

**G1) P2 — Vacancy save-and-link (prerequisite)** — [ ] Not started
- Let an AI match run against a **selected saved Vacancy** (`JobRecord`), not only pasted free text, and persist the vacancy link (`job_id`) on the match. Includes the vacancy picker in the match flow and a "Run match on an existing candidate" entry point on the candidate detail page.
- This is the "job-picker" dependency surfaced during Path A scoping. **Shared with G2 chunk (c) — one piece of work, build once; do not double-count or double-build.**

**G2) P2 — Persistent Match History + two read views (Path A — confirmed)** — [ ] Not started
Full scoped breakdown as estimated (~2–3 focused days total; chunk (c) is the G1 work, so G1+G2 together ≈ this total, not the sum of two separate builds):
- **(a) ~0.5 day** — Migration: new `match_history` table (`candidate_id`, `job_id`, job-title snapshot at match time, `score`, `skills_first_mode`, key strengths / missing-skills summary) + **RLS policy** keyed on `auth_company_id()` (mandatory per the 3-layer tenancy model) + camelCase types + snake_case hook mapping + **mock-store support** (app defaults to mock mode; e2e needs it).
- **(b) ~0.5 day** — Record-match API route (envelope + Zod + idempotency + company scoping) + wire it to append a history row after each successful match + a round-trip unit test.
- **(c) ~0.5–1 day** — Vacancy selector in the match flow + "Run match on an existing candidate" entry point. **This is G1 — same work, build once.**
- **(d) ~0.5–1 day** — Two read-only views: candidate "Match History" table (most-recent first) + vacancy "Matched Candidates" table (sorted by score). No filtering/sorting controls/export in this pass.

Design note: the committed `candidates.ai_score` / `match_details` columns stay as the denormalized "latest match" (drives the detail-page card + the sortable AI Score list column); `match_history` is the append-only log. Each match run writes **both**.

## 4) Release Readiness Definition

Pilot-ready when all are true:
- Auth flows work on `/`, `/login`, `/signup`
- Supabase runtime is enforced in production
- Tenant isolation verified by tests
- No Base64 payload risks for large files (Storage migration complete)
- Stripe webhooks are live and updating `subscriptions` table
