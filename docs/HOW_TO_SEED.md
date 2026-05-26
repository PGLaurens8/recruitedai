# How to Seed Demo Data

The demo seed endpoint populates a company with sample candidates, jobs, and clients — including the **skills-first demo cohort** used to show how Skills-First Mode reranks candidates.

## Prerequisites

1. **Database migrations applied.** The skills-first candidates use enriched columns (`years_of_experience`, `education`, `certifications`, `has_degree_level_education`) added in migration `202605260010_candidate_skills_enhancement.sql`. Make sure your Supabase project is up to date before seeding, or the insert will fail.
2. **`SEED_ENABLED=true`** must be set in the environment.
   - In Vercel: **Project → Settings → Environment Variables → Add** `SEED_ENABLED` = `true` for the target environment, then **trigger a new deployment** (env var changes only take effect after a redeploy).
   - Locally: add `SEED_ENABLED=true` to your `.env` / `.env.local` and restart the dev server.
3. **Signed in as an Admin or Developer.** The endpoint reads your Supabase session and checks your `profiles.role`. Recruiters and Candidates are rejected with `403 FORBIDDEN`.

## How to run it

Send an authenticated `POST` to:

```
POST /api/seed/demo
Content-Type: application/json

{ "confirm": true }
```

The `{"confirm": true}` body is required — without it the endpoint returns `400 CONFIRM_REQUIRED` as a safety guard against accidental seeding.

The simplest way to run it is from the browser console **while logged in as Admin/Developer** (so the session cookie is sent automatically):

```js
await fetch('/api/seed/demo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirm: true }),
}).then((r) => r.json());
```

Data is seeded into **your own company** (`company_id` is resolved from your profile).

## What to expect

On success you get:

```json
{
  "ok": true,
  "data": {
    "companyId": "<your-company-id>",
    "seeded": { "candidates": 10, "jobs": 3, "clients": 3 }
  }
}
```

The 10 candidates are 5 generic samples plus the 5-person **skills-first cohort**:

| Candidate | AI score | Degree? | Experience |
|---|---|---|---|
| Alex Mokoena | 91 | No | 14 yrs, Senior Data Engineer |
| James Ferreira | 88 | No (3 cloud certs) | 8 yrs, Full Stack Engineer |
| Ruan van der Merwe | 82 | No | 11 yrs, Automation Specialist |
| Nomsa Dlamini | 79 | Yes (BSc CS) | 5 yrs, ML Engineer |
| Priya Naidoo | 54 | Yes (BCom) | 3 yrs, Junior Business Analyst |

The demo moment: in **Skills-First Mode**, the no-degree veterans (Alex 91, James 88, Ruan 82) outrank the degree-holders (Nomsa 79, Priya 54).

## Notes & cautions

- **The endpoint inserts, it does not upsert.** Running it more than once will create duplicate rows. Clear existing demo data first if you need a clean re-seed.
- **Turn it back off.** After seeding, set `SEED_ENABLED` back to `false` (and redeploy) so the endpoint cannot be triggered in production.
- Possible error responses: `403 SEED_DISABLED` (env var not set), `401 UNAUTHORIZED` (not signed in), `403 PROFILE_MISSING`, `403 FORBIDDEN` (wrong role), `400 CONFIRM_REQUIRED` (missing confirm flag).
