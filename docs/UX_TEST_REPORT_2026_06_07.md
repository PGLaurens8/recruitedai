# RecruitedAI — Deep Test & UX Audit

**Date:** 2026-06-07
**Target:** https://recruitedai.vercel.app (production, `supabase` runtime mode)
**Method:** Playwright MCP (Chromium), accessibility snapshots + screenshots, desktop (1280×900) and mobile (390×844)
**Account:** `pgl.baobab@gmail.com` (role: **Admin**; also the internal-user email for gated surfaces)
**Scope:** Pure audit — no code changes. (Some test data was created to exercise flows; see [Test Artifacts](#test-artifacts-created-during-this-audit).)

---

## 0. Coverage summary

| Area | Pages tested | Result |
|---|---|---|
| Public / unauthenticated | `/`, `/pricing`, `/terms`, `/privacy`, `/refunds`, `/login`, `/signup` | ✅ All render, correct titles |
| Dashboards | `/dashboard/admin` (✅), `/dashboard/sales` (⚠️ redirects to admin) | Admin OK; Sales gated |
| Talent | `/candidates`, `/candidates/[id]`, `/candidate-profiles`, `/ai-parser`, `/interview-analysis` | ✅ |
| Business | `/jobs`, `/jobs/[id]`, `/jobs/new`, `/clients`, `/clients/[id]`, `/company-finder` | ✅ |
| Candidate portal | `/master-resume`, `/interview-prep` | ✅ |
| Insights / System | `/reports` (⚠️ calendar bug), `/team`, `/settings`, `/profile`, `/billing`, `/about` | Mostly ✅ |

**Console health:** Excellent. Across ~22 authenticated pages the **only** console error was a single Radix accessibility warning on the mobile nav drawer (see Bug #2). No JS exceptions, no failed data loads observed.

**Regression check on recent fixes (all confirmed live):**
- ✅ Clickable row names → detail pages (candidates, clients, jobs, job pipeline)
- ✅ Inline status dropdowns (candidates + jobs)
- ✅ Quick Add candidate (count went 13 → 14)
- ✅ Screening Notes now candidate-linked (searchable dropdown)
- ✅ Smart Parser no longer shows a false "No Agency Branding Found" banner
- ✅ Internal-user gating: Developer tab + "Strategy & About" visible for `pgl.baobab@gmail.com`
- ✅ Client detail edit + PATCH (saved a website successfully)
- ✅ Candidate detail inline-editable contact fields auto-save (saved a phone number)

---

## 1. Bugs (broken functionality)

### 🔴 Bug 1 — Reports → "Recruiter Performance": orphan calendar renders behind the KPI cards
On `/reports`, the **Recruiter Performance** tab renders a stray month calendar **underneath/behind the KPI cards** ("Interviews Scheduled", "Offers Extended", "Successful Placements"). Calendar dates visibly bleed through the cards.

- It is present **on initial load**, **without** clicking the date picker, and **persists after pressing Escape** — so it is not the date-picker popover; it is a second, always-rendered calendar leaking into the KPI row. In the DOM it appears nested *inside* the "Interviews Scheduled" KPI card.
- The **actual** date-picker (the "May 08 – Jun 07, 2026" button) works correctly: clicking it opens a properly positioned two-month popover **above** the KPIs. So the previously-reported z-index fix works for the *button's* popover — but a separate orphan calendar remains.
- **Isolated to the Recruiter Performance tab.** The Sales Pipeline and Executive Summary tabs are clean.

Screenshots: `ux-test-assets/reports-recruiter-calendar-bug.png` (orphan calendar bleeding through), `ux-test-assets/reports-datepicker-popover-correct.png` (correct popover, with orphan still visible bottom-right).

**Impact:** High visual defect on the first analytics tab a user lands on; makes the KPIs look broken.

### 🔴 Bug 2 — Mobile nav drawer is missing a `DialogTitle` (accessibility)
Opening the hamburger menu at 390px throws:
> `DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.

The drawer is a Radix Dialog/Sheet with no title. This is the only console error in the whole app and is an a11y defect for screen-reader users. Fix: add a (optionally visually-hidden) `DialogTitle`.

### 🟠 Bug 3 — Data tables overflow horizontally on mobile
At 390px the **Talent Pool** table is cut off at the right edge — the **Status** dropdowns are clipped and **AI Score / Current Job / Actions** are off-screen with no responsive reflow. The same wide-table pattern is used on Jobs and Clients, so they are likely affected too. Screenshot: `ux-test-assets/mobile-candidates-table-overflow.png`. Consider a card/stacked layout or a clearly scrollable container on small screens.

### 🟡 Bug 4 (needs verification) — Screening Notes doesn't pre-load the candidate's existing AI summary
On `/candidate-profiles`, selecting **Alex Mokoena** loaded the question fields but the **"AI Generated Profile Summary"** box was **empty** — even though that same candidate shows a populated AI summary ("Senior data engineer with 14 years…") on his detail page (`/candidates/[id]`). Per-question notes being empty is expected (he has none), but the AI summary should have loaded.

Likely cause: the candidates **list** endpoint (used by `useCandidates`) may not return `ai_summary`, whereas the single-candidate endpoint does. Worth verifying the list select includes `ai_summary` (or fetch the full record on selection).

---

## 2. UX friction points (works, but feels wrong)

- **Sales Dashboard is invisible to Admins.** `/dashboard/sales` redirects to `/dashboard/admin`; it's gated to the **Sales** role. So the agency owner/Admin persona cannot see the **Active Placements Pipeline** or **Pipeline by Client** views at all (Flow 6 could not be exercised on this account). Recommend allowing Admin to view the Sales Dashboard (Admins typically need the superset of every role's view).

- **Edit patterns are inconsistent.** Client edit is an **inline in-page form**; Job edit is a **modal dialog**. Same conceptual action ("edit this record"), two different interaction models. Pick one.

- **Add Client dialog lacks Website & Notes**, but the client detail/edit screen has them. Users may expect to capture a website at creation time.

- **Dialog submit button can fall below the fold.** The Quick Add "Add Candidate" button was off-screen at a 900px-tall window until the viewport was enlarged. Long dialogs should use a sticky footer or internal scroll so the primary action is always reachable.

- **Pricing currency is mixed.** With **ZAR (R)** selected, the Starter card still says "additional seats **$29** each" (USD) while everything else is in Rand. Localise the seat price too.

- **Client → Jobs rollup can't be seen in current data.** Every job shows "—" for Client and every client shows "-" open jobs; no job is linked to a client in the seed data. The Edit Job dialog *does* offer a Client selector, so the capability exists — but seeding one linked example would let the pipeline/rollup features actually demonstrate themselves.

- **Three different labels for the same `/about` page:** "Strategy & About" (desktop sidebar), "About Strategy" (mobile drawer), "Strategic About Page" (link on Profile). Pick one label.

- **Nav vs page-title mismatches:** "Smart Lead Finder" (nav) vs "Company & Lead Finder" (page title); "Plans & Billing" (nav) vs "Plans & billing" (page) vs "Account & Billing" (Profile page H1). Minor, but they read as different features.

---

## 3. Navigation rename / consolidation recommendations (Flow 8)

Current sidebar groups: **Operational Dashboard** · **Module: Talent Engine** · **Module: Business Hub** · **Module: Candidate Portal** · **Strategic Insights** · **System**. Footer: Profile · Plans & Billing · Strategy & About · Log Out.

Assessed for a first-time **agency recruiter**:

| Current | Issue | Recommendation |
|---|---|---|
| **"Module: Talent Engine"**, **"Module: Business Hub"**, **"Module: Candidate Portal"** | "Module:" is developer-speak; "Engine"/"Hub" are vague brand names. | Drop "Module:". Rename to plain functional headers: **"Candidates"**, **"Clients & Jobs"**, **"Candidate Tools"**. |
| **"Smart Parser & Match"** | The flagship action (screen a CV vs a job) has the least obvious name. | **"Screen & Match CVs"** (or "CV Screening"). |
| **"AI Note Taker"** vs **"Screening Notes"** | Both sit in the Talent group and sound interchangeable to a newcomer (both = "notes about a candidate"). | Differentiate: "AI Note Taker" → **"Interview Transcript Analysis"**; "Screening Notes" → **"Screening Call Notes"**. Or consolidate — both ultimately attach notes to a candidate record. |
| **"Module: Candidate Portal"** shown to Admin | "Resume Builder" + "Interview Prep" are **job-seeker** tools; surfacing a "Candidate Portal" to agency staff is confusing. | Hide for agency roles, or relabel **"Candidate Self-Service"** and clarify it's for represented candidates. |
| **"Job Board"** | In recruiting, "Job Board" implies a public listings site (Indeed/LinkedIn). These are the agency's own vacancies. | **"Jobs"** or **"Vacancies"**. |
| **"Client CRM"** | "CRM" is jargon; the page H1 already says "Client Management". | **"Clients"**. |
| **"Job Brief Builder"** | Useful, but "New Job" already exists as a button on the Job Board. | Keep, but consider it could be a primary button on the Jobs page rather than a separate nav item. |
| **"Operational Dashboard"** (group) → single item "Agency Overview" | One-item group with a heavy header. | Drop the group header; call the item **"Dashboard"**. |
| **"Strategic Insights"** (group) → single item "Analytics & ROI" | One-item group. | Rename group to **"Reports"** (or fold the item up a level). |
| **"System"** → "System Settings" | Slightly redundant. | **"Settings"**. |

**Net:** the biggest wins are (1) removing the "Module:" prefixes, (2) renaming "Smart Parser & Match" to something action-oriented, and (3) disambiguating the two "notes" items.

---

## 4. Mobile issues (390px)

- **Tables overflow horizontally** (candidates confirmed; jobs/clients use the same pattern) — Status/Score/Actions clipped. *(Bug 3)*
- **Nav drawer a11y error** — missing `DialogTitle`. *(Bug 2)*
- **Header description text clips** at the viewport edge on the Talent Pool ("…track all candidates in your pip").
- **Positive:** sidebar collapses to a clean hamburger drawer; KPI cards and form dialogs stack correctly; the drawer itself is readable and navigable.

Screenshots: `ux-test-assets/mobile-candidates-table-overflow.png`, `ux-test-assets/mobile-nav-drawer.png`.

---

## 5. What's working well

- **Clean, stable app.** ~22 authenticated pages, zero JS exceptions, all data loaded (13→14 candidates, 3 jobs, 4 clients all live from Supabase).
- **Clickable rows everywhere** — candidate/client/job names and job-pipeline candidate names all navigate, with consistent `text-primary` + underline styling, eye icons retained.
- **Inline status editing** — candidate statuses and job statuses are editable in-row via dropdowns (verified structurally; mutation not committed per audit scope).
- **Quick Add candidate** — full dialog (name required, email/phone/role/company/status/notes), submitted successfully, list updated immediately, name links to the new profile.
- **Candidate detail is strong** — inline-editable Contact Details with auto-save-on-blur (saved a phone number live), Profile Intelligence skills, screening notes with per-question scoring + general notes + AI summary, and a Submit-to-Vacancy dialog that correctly lists the 3 active jobs.
- **Client detail** — clean read view, working inline Edit form (saved a website that persisted as a clickable link), Notes section, and the "Activity logging coming soon" placeholder.
- **Job detail** — Job Specification card correctly sits **above** the Candidate Pipeline; Edit Job modal exposes all fields incl. a Client linker; pipeline candidate names link out.
- **Screening Notes page** — now properly candidate-linked via a searchable dropdown (all 14 candidates, name + role), with a "View full profile →" deep link.
- **Smart Parser** — upload area, Skills-First toggle (interactive), Job Spec Intake (Upload/Paste tabs); correctly shows **no** false branding banner.
- **Reports** — all three tabs load real sample data; the date-picker popover renders correctly above the KPIs when invoked.
- **Public marketing site** — polished landing, a thorough pricing page (Monthly/Annual + USD/ZAR toggles, agency + candidate tiers, FAQ), and all three legal pages with correct `<title>`s.
- **Role/identity gating** — Developer settings tab and "Strategy & About" correctly appear for the internal-user email.

---

## 6. Flow-by-flow result

| Flow | Result |
|---|---|
| 1 — Smart Parser | ✅ Upload area, Skills-First toggle, Job Spec Intake all present/interactive; no false branding banner. |
| 2 — Quick Add Candidate | ✅ End to end; candidate appears in list (13→14). |
| 3 — Candidate detail | ✅ Contact Details editable+autosave, Profile Intelligence skills, Screening Notes, Submit-to-Vacancy dialog (lists active jobs), Submissions section. |
| 4 — Client workflow | ✅ Name navigates, Edit form saves (website persisted), linked-jobs section present, Add Client dialog works. |
| 5 — Job workflow | ✅ Title navigates, Job Spec above pipeline, Edit Job modal works, pipeline table with linked candidate names. |
| 6 — Sales Dashboard | ⚠️ **Not reachable** as Admin (`/dashboard/sales` → `/dashboard/admin`); role-gated to Sales. |
| 7 — Analytics | ⚠️ All 3 tabs load; date-picker popover correct; **but** orphan calendar bug on Recruiter Performance (Bug 1). |
| 8 — Nav & labels | ✅ Reviewed; see §3. |
| 9 — Public pages | ✅ All load with correct titles. |
| 10 — Onboarding | ⛔ **Not tested** — used an existing populated Admin account; no onboarding checklist appeared. Requires a fresh signup to assess. |

---

## Test artifacts created during this audit
These were created to exercise the flows and can be removed to keep data pristine:
1. Candidate **"Audit Test Candidate"** (`audit.test@example.com`, QA Auditor) in the Talent Pool.
2. Phone **"+27 11 555 0199"** set on **Alex Mokoena**.
3. Website **"https://techcorp.example.com"** set on **TechCorp Solutions**.

---

## Priority fix list (suggested order)
1. **Bug 1** — remove the orphan calendar on Reports → Recruiter Performance (high-visibility defect).
2. **Bug 3 / mobile tables** — make data tables responsive (card layout or scroll container).
3. **Bug 2** — add `DialogTitle` to the mobile nav drawer (quick a11y fix).
4. **Sales Dashboard for Admin** — let Admins view it.
5. **Bug 4** — pre-load AI summary on the Screening Notes page.
6. **Nav relabeling** — drop "Module:" prefixes; rename "Smart Parser & Match" and disambiguate the two "notes" items.
7. Polish: unify the `/about` label, localise the Starter seat price, align nav/page titles.
