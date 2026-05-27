# RecruitedAI — Security, Code Quality & Usability Review

**Date:** 2026-05-27
**Scope:** Entire codebase (`src/`, `supabase/migrations/`, `middleware.ts`)
**Type:** Read-only review. **Nothing was changed.** This is a findings report only.
**Method:** Mechanical scans (secret scanner, lint, file metrics, route inventory) + three focused deep-dive passes (security, code quality, usability), with all P1+ findings verified by hand against source.

---

## Executive Summary

The codebase is in **good shape**. There are **no P0 issues** — no hardcoded secrets, no unauthenticated API routes, no missing input validation, no broken/blank AI flows, and the voice job brief feature is **fully functional end-to-end** (not a stub). `next lint` passes with zero warnings, there are zero `console.log` statements, and the API-route error envelope convention is followed consistently across all 40 routes.

The findings are concentrated in **P1 (4 items)** — mostly client-side error surfacing that makes a failed data fetch look like an empty/missing record — and **P2 (defense-in-depth and polish)**. One orphaned placeholder page (`/resume/[id]`) should be wired up or deleted.

| Priority | Count | Theme |
|----------|-------|-------|
| **P0** | 0 | — |
| **P1** | 4 | Fetch errors silently swallowed in UI; orphaned placeholder page |
| **P2** | 8 | Rate-limit gaps, RLS defense-in-depth, role-scoping, large files, polish |
| **P3** | 2 | Future-proofing notes (intentional-but-confirm) |

---

## P0 — Security / Breaking

**None found.**

Positive confirmations:
- **Secret scan clean.** `npm run security:secrets` returned no matches (exit 0). No `sk-…`, `AIza…`, `AKIA…`, private keys, or `xox…` tokens. Manual grep for JWT-shaped strings, `postgres://` connection strings, and inline passwords across `src/**` and test files also found nothing. The service-role key is read only via `getSupabaseServiceEnv()` in `src/lib/supabase/admin.ts` from env.
- **All 41 API routes authenticate.** Every handler calls `requireUserAndCompany()` / `requireUserAndCompanyRole([...])` or an equivalent inline `auth.getUser()` + role check. The intentionally-unauthenticated `/api/company/invites/accept` still verifies `auth.getUser()` and enforces `invite.email === user.email`. `/api/seed/*` is gated by `SEED_ENABLED=true` + Admin/Developer + `{confirm:true}`.
- **No unvalidated input to DB/AI.** Every body-reading route uses Zod (`safeParse`/`.parse`) before use; every tenant query is scoped `.eq('company_id', companyId)`.
- **No anon-reachable sensitive pages.** `middleware.ts` fails closed — any non-public path with no user redirects to `/login`. `isPublicPath` allows only `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/invite`.

---

## P1 — Important

### P1-1 — List pages swallow data-fetch errors → a failed fetch looks like an empty account
The data hooks expose an `error` field (`src/lib/data/hooks.ts:38`), but these pages destructure only `{ data, isLoading }`:
- `src/app/candidates/page.tsx:59`
- `src/app/jobs/page.tsx:43`
- `src/app/clients/page.tsx:54`

On a failed fetch the hook resolves to `isLoading:false, data:null`, which renders as an empty table — e.g. **"All Candidates (0)"** — indistinguishable from a genuinely empty account. The user gets no indication anything went wrong.
**Fix pattern already exists** in the dashboards (`src/app/dashboard/recruiter/page.tsx:31,65-69` renders `error.message`); apply the same `error &&` branch here.

### P1-2 — Candidate detail page reports a fetch failure as "Candidate Not Found"
`src/app/candidates/[id]/page.tsx:42` destructures only `{ data, isLoading }` from `useCandidate`. On an API/permission error, `candidate` is `null`, so the page renders the **"Candidate Not Found"** branch (`:154`). A transient fetch failure or permission error is presented identically to a deleted candidate — misleading and unactionable for the user.

### P1-3 — Orphaned placeholder page: `/resume/[id]` editor is non-functional
`src/app/resume/[id]/page.tsx:12-13` self-documents as *"a very basic placeholder… A real implementation would involve complex state management, forms, and data binding."* The entire page is static JSX — Save/Delete, "AI Suggest Improvements", and all "Add …" buttons have **no handlers and no state**, and it never fetches or persists. It is **not linked from anywhere** (nav, components, or lib). **Action:** wire it up or delete the route so it can't be reached by guessing the URL.

### P1-4 — (Grouped with P1-1/P1-2) Read-hook error field is unused app-wide
The above three pages share one root cause: the `error` field returned by `useCandidates`/`useJobs`/`useClients`/`useCandidate` is never consumed outside the dashboards. Treat as a single small cross-cutting fix: surface `error` (toast or inline `Alert`) wherever these read hooks are used.

---

## P2 — Nice to Have

### Security / Hardening

**P2-1 — `/api/ai/voice-job-brief` has no rate limiting.** `src/app/api/ai/voice-job-brief/route.ts` authenticates and validates with Zod but does **not** call `enforceRateLimit` — it is the only `/api/ai/*` route missing a limiter. Authenticated-only, so abuse is bounded to logged-in tenant users, but it allows uncapped Gemini spend. Add a limiter consistent with siblings (e.g. `scope: 'ai:voice-job-brief'`).

**P2-2 — Legacy write routes lack rate limiting.** `candidates` POST, `clients` POST, `jobs` POST, `company/invites` POST, `master-resume` PUT, `onboarding` PATCH, and the legacy `candidates/[id]/analysis` & `/interview` PATCH routes don't call `enforceRateLimit`, while the newer `companies/[companyId]/*` equivalents do. Protected by idempotency + tenant scope, but the inconsistency suggests the top-level routes were never back-filled. Low risk; worth a consistency sweep.

**P2-3 — `company_invites` table has only a SELECT RLS policy.** `supabase/migrations/202603220003_company_invites.sql:31-35` defines no INSERT/UPDATE/DELETE policies. Not currently exploitable because all invite writes go through the **service-role admin client** (which bypasses RLS). But it violates the project's stated "RLS is the last line of defense" principle — a future code path using the user-scoped client would have no DB backstop. Add company-scoped write policies, or document that writes are admin-only by design.

**P2-4 — `/billing` page is not role-scoped.** `src/app/billing/page.tsx` has no entry in `rolePathRules`, and `isRoleAllowedForPath` returns `true` for unmatched paths (`src/lib/rbac.ts:52-53`), so any authenticated role (incl. Candidate) can reach it. Billing/Stripe is flagged P1 product work — scope this to Admin before launch.

### Code Quality

**P2-5 — `src/app/targeted-resume/page.tsx` (793 lines) genuinely warrants splitting.** **25 `useState` hooks** plus three distinct concerns in one component: job-match assessment, resume tailoring, and cover-letter generation — plus jsPDF/html2canvas/docx export logic. Extract the export utilities into a hook/util and each AI sub-flow into its own panel.

**P2-6 — `src/app/interview-analysis/page.tsx` (834 lines), lean toward splitting.** 16 `useState` + 9 `useEffect` indicates several independent lifecycle concerns (recording, analysis polling, platform-connection UI) co-located. The static "Platform Connections" block (`:564+`) is pure presentation and is a clean extraction candidate. (`src/components/ui/sidebar.tsx` at 763 lines is ShadCN-generated — leave as-is. `src/lib/data/hooks.ts` at 577 and `reports/page.tsx` at 524 are long-but-cohesive — no action.)

**P2-7 — "Auto-join coming soon" unbuilt integration.** `src/app/interview-analysis/page.tsx:576` shows a Zoom connection card with a "Connect" badge (`:579`) that has no onClick; the adjacent Google Meet card (`:588`) is similarly inert. Implement or hide until built.

**P2-8 — Client-side `console.error` ships to the browser.** ~11 of the 20 `console.error` calls are in `"use client"` components (e.g. `targeted-resume/page.tsx:176,222,258`, `auth-context.tsx:143,168,192`, `master-resume/page.tsx:107,147`). All are in legitimate `catch` blocks (not a bug), but they appear in end-users' devtools. Consider routing client errors through a telemetry sink. *(For reference: all 3 `console.warn` are correctly server-side — `audit.ts:27`, `http.ts:34`, `rate-limit.ts:135` — and there are zero `console.log`.)*

### Usability

**P2-9 — interview-prep question-generation failure has no retry affordance.** `src/app/interview-prep/page.tsx:117-119` returns to the setup screen with only an inline Alert; the user must re-press the generate button. Functional but thin — add an explicit "Retry" action.

---

## P3 — Confirm / Future-proofing

**P3-1 — `audit_logs` has no UPDATE/DELETE RLS policy** (`supabase/migrations/202603220001_audit_logs.sql`): SELECT + INSERT only. For an append-only audit table this is **likely intentional** (immutability). Flagged only to confirm it's deliberate.

**P3-2 — `isPublicPath` uses exact match for `/invite`** (`src/lib/rbac.ts:28-29`). Works today because the invite page reads the token from a query string (`/invite?token=…`). If the flow ever moves to a path param (`/invite/<token>`), it would no longer match and would redirect to login. Note for future-proofing; not a current bug.

---

## Verification Notes

- **Verified by hand:** P1-1/2/3 (read the exact destructures and the placeholder header), P2-1 (read the full voice-job-brief route), hooks `error` field presence (`hooks.ts:38`).
- **Voice job brief — confirmed fully functional end-to-end:** UI trigger `src/app/jobs/new/page.tsx:124` (`VoiceJobBriefButton`) → Web Speech API capture in `src/hooks/useVoiceJobBrief.ts:56-67` → POST `{ transcript }` → role-guarded route `src/app/api/ai/voice-job-brief/route.ts` → real Genkit `defineFlow` in `src/ai/flows/voiceJobBriefFlow.ts:27-48` that sends the transcript to Gemini with a structured Zod output schema and returns model output (not canned). Browser-support limitation (Chromium-only Web Speech API) is handled with a toast + type-instead fallback.
- **Tooling results:** `npm run security:secrets` → clean. `npm run lint` → no warnings/errors. `console.log` count → 0.

---

## Recommended order of attack

1. **P1-1 / P1-2 / P1-4** — one small shared fix: surface the hooks' `error` field on the three list pages + candidate detail (reuse the dashboard pattern).
2. **P1-3** — decide: wire up or delete `/resume/[id]`.
3. **P2-1** — add rate limiting to `voice-job-brief` (one-line consistency fix).
4. **P2-4** — role-scope `/billing` before billing ships.
5. **P2-3** — add `company_invites` write RLS policies (or document admin-only).
6. Remaining P2/P3 as capacity allows.
