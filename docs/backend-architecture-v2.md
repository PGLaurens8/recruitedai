# Backend Architecture V2 (Stable, Scalable, Secure, Observable)

## 1) Objectives

- Stable: predictable behavior under failures and high load.
- Scalable: clear paths from single-tenant usage to many companies/teams.
- Robust: strong data integrity, idempotent writes, safe retries.
- Reliable: measurable SLOs, alerting, and incident-ready operations.
- Secure: strict authn/authz, tenant isolation, secret hygiene, abuse controls.
- Observable: traceable requests, structured logs, actionable metrics.
- Maintainable: simple service boundaries, typed contracts, tested workflows.
- Self-serve: easy onboarding for both users and developers.

## 2) Current State (from repo)

- Good foundation:
  - Multi-tenant schema and RLS in `supabase/migrations/202603120001_core_schema.sql`.
  - Trigger-based signup bootstrap (`handle_new_user`) for profile/company provisioning.
  - Runtime mode split (`mock` and `supabase`).
- Main risks:
  - Business writes are mostly in client hooks (`src/lib/data/hooks.ts`), increasing drift and policy coupling.
  - AI flows are available in app code without a strict backend boundary for quotas, rate limits, and auditability.
  - No formal observability layer (request IDs, traces, error budgets, alert routing).
  - Seed/demo writes are mixed with production data paths.

## 3) Target Architecture (North Star)

1. UI Layer (Next.js App Router):
   - Presentation only.
   - No direct table writes from browser except tightly controlled read-only cases.

2. BFF/API Layer (Next.js Route Handlers under `src/app/api/*`):
   - Single entry for all mutations and privileged reads.
   - Validates input (Zod), checks auth/session, enforces authorization.
   - Emits structured logs + trace IDs.

3. Domain Layer (`src/server/domain/*`):
   - Use-cases: candidate lifecycle, job lifecycle, onboarding, billing sync.
   - Idempotent commands (idempotency key support).
   - Encapsulates invariants (status transitions, ownership checks).

4. Data Layer (`src/server/repositories/*`):
   - Supabase access only here.
   - Narrow table-specific repository methods.
   - All queries typed; no ad-hoc SQL in route handlers.

5. Async/AI Layer:
   - Route handler accepts request and creates a job record.
   - Worker executes Genkit flow and updates job/result tables.
   - Retries with exponential backoff + dead-letter state.

6. Platform Layer:
   - Auth: Supabase Auth + RLS tenant isolation.
   - Storage: Supabase Storage for resume assets (private bucket + signed URLs).
   - Billing: server-only Stripe webhook writes to `subscriptions`.

## 4) Data and Tenancy Rules

- Tenant model:
  - `company_id` is mandatory tenant key for company-scoped entities.
  - `master_resumes` remains `user_id` scoped (current decision).
- Database constraints:
  - Add unique/index constraints where behavior assumes uniqueness.
  - Add check constraints for status transitions if feasible.
- RLS:
  - Default deny.
  - Policies reference `auth.uid()` and `auth_company_id()`.
  - Service-role bypass only in server-only modules.
- Auditing:
  - Add `created_by`, `updated_by` where mutation provenance matters.

## 5) Security Architecture

- Secret boundaries:
  - `SUPABASE_SERVICE_ROLE_KEY` only in server runtime, never browser.
  - AI provider keys server-only.
- API hardening:
  - Per-route rate limits (auth, AI, and write-heavy routes).
  - Request size limits for uploads.
  - Input validation with explicit schemas and sanitization.
- Session and auth:
  - Validate user session in every protected route.
  - Resolve authoritative profile/company server-side (do not trust client-sent company IDs).
- Abuse prevention:
  - Add CAPTCHA or email verification for signup if abuse appears.
  - Track suspicious patterns via audit events.

## 6) Reliability and Scalability Controls

- Idempotency:
  - Mutation endpoints accept `Idempotency-Key`.
  - Store result hash + status to prevent duplicate writes from retries.
- Timeouts/circuit breakers:
  - AI and external calls wrapped with timeout + fallback.
  - Graceful degradation for non-critical AI features.
- Queue-first for long tasks:
  - Resume parsing/interview analysis should run asynchronously.
  - UI polls job status or subscribes to updates.
- Pagination and indexing:
  - Cursor-based pagination for candidates/jobs/clients.
  - Ensure indexes match common filters/sorts (`company_id`, `created_at`, `status`).
- Backups and DR:
  - Enable PITR/backups in Supabase project.
  - Document restore runbook and RTO/RPO targets.

## 7) Observability Standard

- Logs:
  - Structured JSON logs with `request_id`, `user_id`, `company_id`, `route`, `latency_ms`, `result`.
- Traces:
  - OpenTelemetry instrumentation for route handlers and DB calls.
  - Propagate trace context into AI calls where possible.
- Metrics:
  - API p95 latency, error rate, queue depth, job success rate, auth failure rate.
  - Business metrics: onboarding completion, parse success, candidate creation funnel.
- Alerts:
  - Trigger on sustained 5xx, AI timeout spikes, webhook failures, queue backlog growth.

## 8) Self-Serve and Self-Onboarding Design

- For end users:
  - Guided onboarding state machine in `profiles.onboarding_step`.
  - One-click "seed workspace" endpoint for demo data in non-prod only.
  - In-app health and integration checks (Supabase auth/storage/connectivity).
- For developers:
  - One command local bootstrap (`npm run dev` + clear env template).
  - CI checks: typecheck, lint, migration validation, basic API smoke tests.
  - Architecture Decision Records in `docs/adr/` for major changes.

## 9) Folder/Code Organization

- `src/app/api/*`: transport and auth boundary only.
- `src/server/domain/*`: business logic.
- `src/server/repositories/*`: persistence access.
- `src/server/contracts/*`: Zod schemas, response contracts, shared DTOs.
- `src/lib/supabase/*`:
  - `client.ts` browser client.
  - `server.ts` SSR/session client.
  - `admin.ts` service-role client (strictly server only).

## 10) Phased Delivery Plan

### Phase 0 (Immediate hardening)

- Freeze direct browser mutation calls for core entities; migrate writes to API routes.
- Add centralized error shape + request IDs for all routes.
- Add server-side company resolution for every protected write.

### Phase 1 (Core backend boundary)

- Implement CRUD route handlers for profiles, candidates, jobs, clients, master_resumes.
- Add domain services + repositories.
- Add rate limiting on auth + AI routes.

### Phase 2 (Async AI + observability)

- Introduce `ai_jobs` and `ai_job_events` tables.
- Move long AI operations to async jobs.
- Add OpenTelemetry + error tracking + basic SLO dashboards.

### Phase 3 (operational maturity)

- Billing webhook hardening + reconciliation jobs.
- Runbooks, backup drills, and incident playbooks.
- Load tests and query/index optimization.

## 11) Definition of Done (Production Backend)

- 100% protected mutations go through backend routes (no direct browser table writes).
- RLS verified with automated policy tests.
- Every route has validation, auth checks, structured logging, and typed responses.
- AI long-running tasks are async, retryable, and observable.
- SLOs and alerts are in place and tested.
- Onboarding flow is deterministic and recoverable.
