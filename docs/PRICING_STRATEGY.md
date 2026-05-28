# RecruitedAI — Pricing Strategy: Findings & Recommendations

> **Status:** Approved findings document. Source of truth for the pricing page build, Stripe activation, and go-to-market positioning.
> **Author:** Strategy research, 2026-05-28
> **Owner:** PG Laurens

## Context

RecruitedAI is a multi-tenant SaaS for independent recruiters, small/mid agencies, and job seekers, with 12 Gemini-powered AI flows wrapped around an explainable, skills-first scoring engine. The repo currently has a stub `/billing` page with placeholder plans ($0 / $19 / $199) and a fake Stripe dialog (`src/components/feature/payment-dialog.tsx`) — Stripe activation is the P1 item in `PROJECT_STATE_ROADMAP.md`.

The intent of this document: land first paying customers in the **small/mid agency (6–25 recruiters) sweet spot**, with a **USD storefront + ZAR PPP discount for South Africa**, using a **hybrid seat + usage-cap with overage** model and a **7-day trial that conserves AI spend** (2 CVs / 3 matches) while giving generous platform access.

---

## 1. Market & Competitor Pricing Benchmarks

### Direct competitors — Agency ATS/CRM
Per-seat/month pricing in USD, billed annually:

| Tool | Entry | Mid | Notes |
|---|---|---|---|
| **Manatal** | $15/user | $35/user (Ent.) | AI candidate scoring at the base tier. Closest direct competitor on positioning + price |
| **Recruit CRM** | $85/user | — | Includes invoicing, multi-currency. Built for agencies |
| **Crelate** | $69/user | $144/user | Agency-focused ATS+CRM |
| **Recruiterflow** | $99–119/user | — | Agency-focused. AI matching gated to higher tier |
| **Loxo** | Free tier | Custom | Free-forever ATS for solo / sub-25-headcount firms |
| **Workable** | $149/mo flat | $599/mo | Flat-rate, not per-seat. Mid-market |
| **JazzHR** | $75/mo (Hero) | $269/mo (Plus) | 3 active jobs vs unlimited |
| **BreezyHR** | $157/mo | $439/mo | Flat-rate. Better UX than enterprise tools |
| **Greenhouse / iCIMS** | $6.5k–$100k+/yr | — | Enterprise, irrelevant to our ICP |

### Indirect competitors — AI screening tools
- **CVShelf**: $29/mo flat
- **Klearskill**: $100/mo flat (up to 10,000 CVs)
- **InterviewFlowAI**: $0.99 per interview (per-use)

### Adjacent — Sales/lead-gen (because Smart Lead Finder competes here)
- **Apollo.io**: $0 / $59 / $99 / $149 per user/mo
- **Lusha**: SMB-focused, transparent tier (~$36–80/user/mo range)
- **ZoomInfo**: enterprise, $15k–$20k+/yr minimum

### Candidate-side (B2C resume tools)
- **Teal**: free / $9/wk / $29/mo / $179/yr
- **Rezi**: $29/mo or $149 lifetime
- **JobScan**: $49.95/mo
- **Kickresume**: $7–24/mo

### Assessment platforms (only relevant if interview transcript analysis is monetised separately)
- **TestGorilla**: $75–142/mo entry
- **Vervoe**: $228–300/mo entry
- **HireVue**: $20k–60k/yr enterprise

### Headline takeaways
1. The **small-agency sweet spot is $69–99 per user/month** (Recruit CRM, Crelate, Recruiterflow). Pricing meaningfully above this needs strong proof.
2. Manatal at $15/user is the **commoditized floor** — pricing below this signals "low quality" and compresses margins relative to AI spend.
3. **Flat-rate vs per-seat split exists**: Workable/BreezyHR/JazzHR use flat tiers; agency-native tools (Recruit CRM/Crelate/Recruiterflow) use per-seat. Per-seat is the right primitive for our ICP because agencies grow by adding recruiters.
4. Annual billing discount is universal — typically 15–20% off monthly.

---

## 2. Total Addressable Market (TAM) & ICP Sizing

### Global TAM
- **~72,300 active recruiting firms** worldwide (BoldData, 2026)
- **~3.5M individual recruiters** (LinkedIn-derived estimate)
- **Global recruitment market: $690B–$968B in 2026**, ~7.5% CAGR
- **US recruitment market alone: $206B**

### Serviceable Addressable Market (SAM) — small/mid agencies
Approx. **45,000–55,000 agencies globally** in the 2–50 recruiter range (the realistic SaaS target after stripping out enterprise staffing groups and one-person LinkedIn freelancers who won't pay).

### Serviceable Obtainable Market (SOM) — realistic 3-year target
- **Year 1**: 100–250 paying agencies (mostly SA + early US/UK/AU early adopters via content)
- **Year 3**: 1,500–3,000 paying agencies at $400–800 ARPU/mo = **$7M–$28M ARR potential**

### Why agencies, not solos or enterprise
- **Solos** (3.5M TAM) sounds huge but converts at 0.1–0.5% on cold-start. Lifetime value is low ($30–60/mo) and churn is brutal — they win one mandate and disappear.
- **Enterprise** needs SSO, audit logs, MSA/DPA, procurement cycles 6–18 months. Not realistic without dedicated sales.
- **Small/mid agencies (6–25)** have budget ($500–2,500/mo), real pain (high CV volume), faster decisions (founder/owner buys), and stick — they're the unit-economics sweet spot.

### Recommended ICP — three concentric tiers

**Tier A — "Beachhead" (target first 100 customers)**
- 6–15 recruiter boutique agencies in South Africa, UK, Australia, US
- Specialist verticals: **tech recruiting, exec search, healthcare locum, F&A finance**
- Currently using spreadsheets + LinkedIn Recruiter (paying $170/mo each already)
- Owner/managing-partner buyer; they handle screening themselves and feel the pain personally
- Pain: 80+ CVs per role, ATS keyword matching missing good candidates, can't explain decisions to clients

**Tier B — "Expansion" (after Tier A repeatable)**
- 15–50 recruiter mid agencies
- Multi-office or multi-vertical
- Have an existing ATS (Bullhorn, Vincere, JobAdder) — we sit alongside, not replace
- Need branded CV exports + team reporting

**Tier C — "Self-serve solo" (low-touch revenue tail)**
- Independent contract recruiters / 2–3 person firms
- Buys on credit card with no demo, expects to be onboarded by the product
- $39–59/mo, high churn but high volume

**Excluded ICPs (intentionally)**
- Enterprise staffing firms (>200 recruiters) — sales motion misalignment
- Internal corporate TA teams — different buyer, different positioning, ATS replacement
- General job seekers as primary ICP — keep as funnel, not revenue line

---

## 3. Unit Economics (drives plan limits)

### Gemini 2.5 Flash cost
- **$0.30 / 1M input tokens** · **$2.50 / 1M output tokens**

### Estimated cost per AI action (conservative)

| Action | Input tokens | Output tokens | Cost |
|---|---|---|---|
| CV parse (extract-cv-data) | ~4,000 | ~1,500 | ~$0.005 |
| Job match assessment (assess-job-match) | ~6,000 | ~2,000 | ~$0.007 |
| Candidate profile generation | ~3,000 | ~1,500 | ~$0.005 |
| Cover letter generation | ~2,500 | ~1,200 | ~$0.004 |
| Interview transcript analysis | ~15,000 | ~3,000 | ~$0.012 |
| Smart Lead Finder query | ~3,000 | ~2,000 | ~$0.006 |
| **Full CV screening cycle** (parse + match) | — | — | **~$0.012** |

### Implications
- AI cost is **functionally negligible relative to plan price**, so the real lever is **caps to prevent abuse**, not margin protection.
- A $79/seat plan with 200 CVs/month = $2.40 AI cost = **~97% gross margin** before infra/storage.
- The cap exists to (a) prevent a single user dumping 100,000 CVs against us, and (b) create a credible "upgrade trigger" for the next tier.
- For Smart Lead Finder, set tighter caps — it's the most prospect-facing feature and easier to scrape-abuse.

---

## 4. Recommended Pricing Structure

### Plan ladder (USD primary, ZAR PPP-discounted)

PPP factor for South Africa: ~0.55 (i.e. ZAR plan ≈ 55% of USD plan when converted at ~R18/$). This matches Manatal/Spotify/Netflix regional pricing patterns and keeps margin viable.

#### STARTER — Solo & boutique recruiters
- **USD: $39/user/mo** (billed monthly) · **$32/user/mo** annual · **R599/user/mo** ZAR
- Includes:
  - 1 seat (additional seats $29 each)
  - 100 CV screenings/month (parse + score)
  - 25 job match assessments/month
  - 5 branded CV exports/month
  - 10 Smart Lead Finder queries/month
  - Basic candidate pipeline
  - Email support, 48hr response
- **Trial:** 7 days (see Section 4.2)
- **Target:** Solo recruiters, 2–3 person firms

#### AGENCY — 6–25 recruiter teams (PRIMARY PLAN, "Most Popular")
- **USD: $79/user/mo** (billed monthly) · **$65/user/mo** annual · **R1,199/user/mo** ZAR
- Everything in Starter, plus:
  - 500 CV screenings/seat/month *pooled across team*
  - 150 job match assessments/seat/month *pooled*
  - 50 branded CV exports/seat/month
  - 100 Smart Lead Finder queries/team/month
  - Unlimited jobs and candidates
  - Branded PDF templates with agency logo
  - Interview transcript analysis (10/seat/month)
  - Sales pipeline + client linking (already shipped)
  - Team reporting + placement analytics
  - Priority email + chat support, 24hr response
- **Minimum:** 3 seats ($237/mo entry)
- **Target:** Where 70–80% of ACV should land

#### SCALE — 25+ recruiter firms / multi-office
- **USD: $129/user/mo** (billed monthly) · **$109/user/mo** annual · **R1,899/user/mo** ZAR
- Everything in Agency, plus:
  - Unlimited CV screenings, job matches, exports
  - Unlimited Smart Lead Finder
  - Unlimited interview transcript analysis
  - Custom branding + custom CV templates
  - SSO (Google Workspace, Microsoft Entra)
  - Audit logs + admin console (RBAC + RLS already enforced)
  - Dedicated CSM, SLA, 4hr response
  - DPA + data residency on request
- **Minimum:** 10 seats ($1,090/mo annual)
- **Target:** Top of revenue pyramid

#### CANDIDATE (B2C, separate ladder)
Keep two simple plans alongside the agency ladder — candidate flows are already built and act as top-of-funnel for SEO + brand:

- **Free** (forever)
  - 1 master resume
  - 3 targeted resume tailorings/month
  - Watermarked online resume + LinkTree bio
  - Basic interview prep (3 sessions/month)
- **Pro — $19/mo** · **$15/mo annual** · **R299/mo** ZAR
  - Unlimited resume tailoring
  - Unlimited interview prep with AI scoring
  - Ad-free, custom-domain online resume
  - Cover letter generation
  - One-time **lifetime deal: $149** for the first 500 buyers (matches Rezi)

### 4.2 7-day trial limits

For **Agency plan trial** (the most important trial path):

| Feature | Trial limit | Why |
|---|---|---|
| CV parse + score | **2 total** | High AI cost, easiest abuse vector |
| Job match assessment | **3 total** | Same |
| Smart Lead Finder | **2 queries** | Highest-cost AI flow, scrape-attractive |
| Cover letter / candidate profile | **1 each** | Demonstrates capability without bleeding spend |
| Interview transcript analysis | **1** | Largest single AI cost |
| Jobs (create/manage) | **Unlimited** | Pure CRUD, no AI cost |
| Candidates (manual add) | **Unlimited** | Pure CRUD |
| Clients (sales pipeline) | **Unlimited** | Pure CRUD |
| Branded CV export | **3 total** | Cheap, but a wow moment — keep it low to drive conversion |
| Team invites | **Up to 3 seats during trial** | Lets buyer test team workflows |

**Implementation note:** Trial limits enforced server-side via the existing `enforceRateLimit` plumbing in `src/server/api/rate-limit.ts` (extended with per-company, per-period quotas) and Upstash Redis. We do NOT use client-side gating only — trivially bypassed.

**Card-on-file?** Recommendation: **opt-in, no card required** for the 7-day trial. Industry data: 8–15% conversion (opt-in) vs 25–35% (opt-out card required). Opt-in is the right pick for a cold-start brand with limited social proof; we'd lose more from a card-required friction wall than we'd gain from conversion lift. Revisit at 500 customers.

---

## 5. Pricing Page — Design Recommendations

**Route:** Replace `src/app/billing/page.tsx` content; add a public marketing variant at `src/app/pricing/page.tsx` (no auth required).

**Page structure (top to bottom):**
1. Hero — "Skills-first CV screening that explains every decision"
2. Three-card ladder: **Starter / Agency (highlighted) / Scale** with annual/monthly toggle
3. Currency toggle: **USD / ZAR** — auto-detects from browser locale on first visit, persisted
4. Trial CTA on every card: "Start 7-day free trial" → `/signup?plan=agency`
5. Comparison table (collapsed by default) — feature × tier matrix
6. **"Candidates? See plans →"** secondary CTA linking to candidate ladder section
7. FAQ — billing, cancellation, data ownership, AI accuracy, GDPR/POPIA, refunds
8. Trust strip — "Built in SA, used by [X] agencies", logos when available
9. ROI calculator block — "Screen 200 CVs in 90 minutes instead of 8 hours = saves 6.5h/role × 12 roles/month = 78h reclaimed" (interactive)

**Critical:** the pricing page is also a **positioning document**. Use it to anchor "skills-first" and "explainable" as the differentiators — that's what justifies pricing above Manatal's $15 floor.

---

## 6. Features to Lead Marketing With

In order of conversion impact:

1. **Explainable skills-first scoring** — the unfakeable differentiator. Demo video of the green/amber skill indicators. Most ATS players cannot do this and cannot copy without rebuilding their scoring engine. Marketing crown jewel.
2. **Branded CV exports with agency logo** — visual, emotional wow moment for boutique agency owners. Easy to put on the landing page as a before/after.
3. **80 CVs → ranked in under 10 minutes** — time-savings hook with a concrete number. Hero-page worthy.
4. **Skills-First Mode toggle** — taps into a real workplace movement (skills-based hiring) that buyers want to be seen supporting. Doubles as PR angle.
5. **Smart Lead Finder** — strong differentiator vs pure ATS competitors. Position as "Apollo for recruitment" — but de-emphasize early because data freshness is a long fight to win.
6. **Voice Job Brief Builder** — novel, demo-able, lower priority because it doesn't carry conversion on its own. Use it in product tours, not landing-page heroes.

**De-emphasise initially:**
- Interview transcript analysis — useful but not why people buy ATS-adjacent tools first
- Master Resume / candidate side — keep visible for SEO but don't lead with it for agency buyers (signals wrong product)
- LinkTree bio — feels off-brand for B2B agency selling

**Marketing channels:**
- LinkedIn organic + paid (recruiters live there) — primary
- SEO content on "how to screen 80 CVs" + "skills-first hiring guide" — secondary
- Cold outbound to South African + UK boutique agencies via founder LinkedIn — primary for first 50 customers
- Partnerships with industry bodies (APSO in SA, REC in UK) — slow but compounds
- AppSumo lifetime deal — **avoid** for agency plan (attracts wrong ICP); could test for candidate Pro plan

---

## 7. Risks & Open Questions

1. **AI cost forecasting risk.** Gemini pricing may rise; the Agency plan needs to assume ≥10x current cost still maintains 70%+ margin. At current pricing it does.
2. **Trial abuse** — without card-on-file, expect 15–20% disposable-email/serial-trial signups. Mitigation: email domain reputation check, IP rate limit on signup, manual review of any account that exhausts trial limits in <30 minutes.
3. **South Africa PPP arbitrage** — VPN users could buy at ZAR pricing. Mitigation: bill the billing-address country, lock plan to that country for 12 months, accept some leakage.
4. **Two-sided cannibalisation** — candidate Pro plan ($19) is cheaper than Starter ($39). Some solo recruiters might buy candidate Pro instead. Mitigation: candidate plan blocks recruiter features (no scoring, no Smart Lead Finder, no branded exports) and the role gate already exists in `src/lib/rbac.ts`.

**Open questions:**
- Founder's available CAC budget — affects whether we lean self-serve only or run paid LinkedIn from launch
- Is South Africa-first a hard 6-month commitment, or do we go global the moment Tier A converts?
- Stripe vs Paddle for billing (Paddle is merchant-of-record, simpler for global VAT; Stripe gives more flexibility but VAT/tax is on us)

---

## 8. Implementation Plan (sequenced, not yet executed)

### Phase 1 — Pricing page UI
1. Create `src/app/pricing/page.tsx` — public, unauthenticated marketing page implementing the three-card layout above. Reuses ShadCN `Card`, `Button`, `Tabs` (for monthly/annual + USD/ZAR toggles). No new component dependencies.
2. Update `src/app/billing/page.tsx` — replace placeholder plans with the new ladder; gate upgrade CTAs behind "Contact us / Start trial" until Stripe is live.
3. Add currency/locale detection helper in `src/lib/locale.ts` (browser-locale → default currency, persisted in localStorage).
4. Update `src/lib/rbac.ts` so `/pricing` is in `isPublicPath()`.

### Phase 2 — Trial enforcement (server-side)
5. Migration: add `companies.trial_started_at`, `companies.trial_expires_at`, `companies.plan` (enum: `trial | starter | agency | scale`), and `usage_counters(company_id, period_start, feature, count)`.
6. Extend `src/server/api/rate-limit.ts` with `enforceTrialQuota(feature, scope)` — combines Upstash rate limit + Postgres-backed quota for trial users.
7. Wire each AI API route (`src/app/api/ai/*/route.ts`) through `enforceTrialQuota` — fail with a `TRIAL_LIMIT_REACHED` `ApiRouteError` that the client renders as an upgrade prompt.

### Phase 3 — Stripe activation (closes the P1 in `PROJECT_STATE_ROADMAP.md`)
8. Stripe products + prices created out of band (manual setup, 6 prices: 3 tiers × monthly/annual, ZAR prices via Stripe multi-currency).
9. `src/app/api/billing/checkout/route.ts` — creates Stripe checkout session with the right price ID.
10. `src/app/api/billing/webhook/route.ts` — listens to `customer.subscription.*` events, updates the `subscriptions` table.
11. `payment-dialog.tsx` rewired to call the checkout endpoint and redirect to Stripe-hosted checkout.

### Phase 4 — Marketing assets (separate workstream)
12. Landing-page hero refresh with "skills-first scoring" positioning
13. Demo video / interactive walkthrough of the green/amber skill scoring
14. ROI calculator component for the pricing page

### Critical files referenced
- `src/app/billing/page.tsx` — current placeholder
- `src/components/feature/payment-dialog.tsx` — current Stripe stub
- `src/lib/rbac.ts` — public path + role gate
- `src/server/api/rate-limit.ts` — existing rate-limit plumbing to extend
- `src/server/api/idempotency.ts` — pattern to follow for the new quota helper
- `supabase/migrations/` — new `usage_counters` + `subscriptions` migrations land here
- `PROJECT_STATE_ROADMAP.md` — update once Phase 3 lands

### Verification
- `/pricing` renders unauthenticated, correctly toggles USD/ZAR, displays the three-card ladder
- `/billing` (authenticated) reflects user's current plan and shows trial countdown if applicable
- Trial user calling `/api/ai/parse-cv` 3 times in a row gets a `TRIAL_LIMIT_REACHED` on the 3rd call
- Stripe webhook in test mode correctly upgrades a company from `trial` → `agency` on subscription creation
- `npm run lint && npm run typecheck && npm test && npm run build` all green
- E2E smoke test extended to cover the trial-limit-hit upgrade prompt

---

## Summary

1. Treat the **6–25 recruiter agency** as the primary buyer and design everything around them.
2. Launch **Starter $39 / Agency $79 / Scale $129** per-seat USD plans with a **ZAR PPP discount** for South Africa.
3. Keep the **two-sided model** with a thin candidate plan ladder ($0 free / $19 Pro) — purely as funnel + SEO.
4. Ship a **7-day opt-in trial** with hard caps on AI-cost features (2 CV scores, 3 matches) but generous platform access.
5. Rebuild the pricing page, extend rate-limiting for quota enforcement, then close the Stripe P1.
6. Market on **explainable skills-first scoring + branded CV exports + 80 CVs in 10 minutes**, in that order.
