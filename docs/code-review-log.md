# Code Review Log

A running log of code reviews, findings, and their resolution status.
Add new review sessions at the top under a dated heading.

---

## Review — 2026-04-26

**Reviewer:** Claude (full automated review)
**Scope:** Full codebase — auth, API routes, DB schema, middleware, AI flows, components

### Context

RecruitedAI is a multi-tenant recruiting SaaS (Next.js 15, Supabase, Genkit/Gemini). Two runtime modes: `mock` (local) and `supabase` (production). Core patterns are solid — idempotency on mutations, audit logging, soft deletes, RLS, RBAC middleware. Issues below are concentrated in auth flow, schema, and CORS.

---

### Findings

#### CRITICAL

| # | File | Issue | Status |
|---|---|---|---|
| C1 | `supabase/migrations/202603120001_core_schema.sql:189` | **Role injection via signup trigger.** `handle_new_user` reads `role` from `raw_user_meta_data` — anyone can call Supabase Auth API directly with `{"role":"Admin"}` to gain admin access. Fix: derive role from `account_type` only, never trust metadata role. | Fixed — migration `202604260007_fix_role_injection.sql` |
| C2 | `src/app/api/jobs/route.ts:12` + migration core schema `:63` | **Jobs status enum mismatch — live DB error.** DB check constraint has `('active','pending','closed')` — no `'draft'`. API defaults to `'draft'`. Every job create without explicit status throws a DB constraint violation. Fix: add migration adding `'draft'` to the constraint. | Fixed — migration `202604260006_jobs_draft_status.sql` |
| C3 | `next.config.ts:12` | **Wildcard CORS on all API routes.** `Access-Control-Allow-Origin: *` is hardcoded. `CORS_ALLOWED_ORIGINS` env var is documented in `.env.example` but never read. Fix: read the env var and use it in the headers config. | Fixed — reads `CORS_ALLOWED_ORIGINS` env var; no header sent if unset |

#### HIGH

| # | File | Issue | Status |
|---|---|---|---|
| H1 | `src/context/auth-context.tsx:165` | **Client auth bootstrap uses `getSession()` not `getUser()`.** `getSession()` reads from localStorage and can be spoofed. Middleware correctly uses `getUser()` (server-validated). Fix: replace with `supabase.auth.getUser()` in bootstrap. | Fixed — auth-context.tsx rewritten |
| H2 | `src/context/auth-context.tsx:237` | **Auth `useEffect` re-runs on every page navigation.** `pathname` is in the deps array, causing a full auth re-evaluation (session fetch + profile query) on every route change. Causes redundant DB calls and potential subscription leaks. Fix: separate subscription setup from redirect logic. | Fixed — split into two effects; subscription runs once |
| H3 | `src/context/auth-context.tsx` `login()` | **Login ignores `?redirectTo` param.** After login always redirects to `getDefaultRouteForRole()`, ignoring the `redirectTo` param set by middleware when bouncing unauthenticated users. This is the likely cause of reported login redirect issues. Fix: read `redirectTo` from search params and use it post-login. | Fixed — `login()` now accepts `redirectTo`; login page passes it through |
| H4 | `src/server/api/company-invites.ts:134` | **Plain-text invite token stored in DB alongside hash.** `token: randomUUID()` is stored as-is; lookups use `token_hash`. The plain token is vestigial but exploitable if DB is compromised. Fix: stop writing to the `token` column; drop or null it via migration. | Fixed — migration `202604260008` makes column nullable; insert no longer writes plain token |

#### MEDIUM

| # | File | Issue | Status |
|---|---|---|---|
| M1 | `src/server/api/company-invites.ts` | **`createCompanyInvite` race condition returns 500 not 409.** 4-step invite creation is non-atomic. Concurrent requests can both pass the pending-check, hit the unique index, and get a 500 (`INVITE_CREATE_FAILED`) instead of a clean 409 conflict. Fix: handle `error.code === '23505'` and return 409. | Open |
| M2 | `src/server/api/company-members.ts:145` | **`removeCompanyMember` is not atomic.** Create personal company + update profile is not in a transaction. Partial failure leaves orphaned company; cleanup can also silently fail. Fix: use Supabase RPC to wrap in a transaction. | Open |
| M3 | `/api/candidates`, `/api/jobs`, `/api/clients` routes | **No pagination + `select('*')` on all list endpoints.** Returns full tables including large text fields (`full_resume_text`, `extracted_details`, etc.) with no limit. Will degrade at scale. Fix: add `limit`/`offset` params and select only columns needed for list views. | Open |
| M4 | `middleware.ts:94-102` | **Two Supabase round-trips on every authenticated request.** `getUser()` + profile select for role on every page load. Fix: store role in JWT custom claims to eliminate the profile query. | Open |

#### LOW

| # | File | Issue | Status |
|---|---|---|---|
| L1 | `src/app/layout.tsx:2` | **Root layout is a Client Component.** Prevents use of Next.js `metadata` export. Manual `<title>` in `<head>` is rendered client-side — bad for SEO, no per-page dynamic titles. Fix: extract client logic to a child component, use `export const metadata` in the server layout. | Open |
| L2 | `src/app/signup/page.tsx:159` | **"Sign in" link points to `/` not `/login`.** `href="/"` should be `href="/login"`. | Open |
| L3 | `package.json` | **`jsdom` and `dotenv` in production dependencies.** Both should be `devDependencies`. Next.js loads env files natively; `jsdom` is test-only. | Fixed — moved to devDependencies |
| L4 | `src/server/api/idempotency.ts:6` | **`supabase: any` type.** Loses all type safety inside the idempotency wrapper. Fix: use the proper Supabase client type. | Open |

---

### Fix Priority

1. **C2** — Jobs enum mismatch (live breakage, fix immediately)
2. **C1** — Role injection (security, fix immediately)
3. **C3** — Wildcard CORS (security)
4. **H3** — Login redirectTo ignored (root cause of reported login UX issues)
5. **H1** — getSession → getUser
6. **H2** — useEffect on pathname
7. **H4** — Plain token in DB
8. M1–M4, L1–L4 (backlog)

---

<!--
## Review — YYYY-MM-DD

**Reviewer:**
**Scope:**

### Context

### Findings

#### CRITICAL
| # | File | Issue | Status |
|---|---|---|---|

#### HIGH
| # | File | Issue | Status |
|---|---|---|---|

#### MEDIUM
| # | File | Issue | Status |
|---|---|---|---|

#### LOW
| # | File | Issue | Status |
|---|---|---|---|

### Notes

-->
