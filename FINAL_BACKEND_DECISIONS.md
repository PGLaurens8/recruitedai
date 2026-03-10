# FINAL_BACKEND_DECISIONS.md

> Resolves all remaining ambiguities in CODEX_IMPLEMENTATION_DELTA.md.
> This file is the single source of truth. No optional branches.

---

## 1. Product Ownership Model

**Decision: Recruiter/company-owned candidate platform with a personal-use mode.**

- The primary user is a **recruiter or agency** who manages candidates, jobs, and clients under a `company_id`.
- A solo user (accountType = "personal") gets an auto-created company row (`is_personal = true`) so that every user has a `company_id`. This removes all branching logic around "personal vs company" throughout the codebase.
- `master_resumes` is the only table scoped to `user_id` (a recruiter's own resume). Everything else is scoped to `company_id`.
- Candidates do NOT have auth accounts. They are records created by recruiters.

---

## 2. Final Database Model

Seven tables. No `cv_versions`, no `interviews`, no `model_registry`.

| Table | PK | Tenant Key | Purpose |
|-------|----|------------|---------|
| `profiles` | `id` (uuid = `auth.uid()`) | `company_id` | Authenticated user profile. One row per signup. |
| `companies` | `id` (uuid) | -- | Company/agency. Auto-created on signup. |
| `candidates` | `id` (uuid) | `company_id` | Recruiter-managed candidate records. Parsed CV stored as JSONB. |
| `jobs` | `id` (uuid) | `company_id` | Job postings managed by the company. |
| `clients` | `id` (uuid) | `company_id` | Employer/client organizations the agency recruits for. |
| `master_resumes` | `id` (uuid) | `user_id` | The authenticated user's own resume. One active row per user. |
| `subscriptions` | `id` (uuid) | `company_id` | Stripe billing state. Server-write only. |

**Versioning decision: No version-history table.** `master_resumes` stores the single current version. If versioning is needed later, add a `master_resume_snapshots` table -- but not now.

---

## 3. Billing Ownership

**Decision: Subscriptions belong to `company_id`, not `user_id`.**

- A subscription covers the entire company/agency.
- The `subscriptions.company_id` FK points to `companies.id`.
- The `user_id` column in the DELTA spec's `subscriptions` table is removed.
- Plan tier on `profiles` is derived: read from the company's subscription, not stored independently.
- `profiles.plan` column is removed. Query the company's subscription instead.

---

## 4. Final SQL Requirements

### 4.1 Schema DDL (exact corrections)

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Companies (must exist before profiles)
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_personal boolean not null default false,
  logo text,
  website text,
  email text,
  address text,
  owner_id uuid not null references auth.users(id) on delete cascade,  -- set to auth.uid() of creator; FK added after profiles exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  first_name text,
  last_name text,
  role text not null default 'Recruiter' check (role in ('Admin','Recruiter','Sales','Candidate','Developer')),
  account_type text not null default 'personal' check (account_type in ('personal','company')),
  company_id uuid not null references companies(id),
  onboarding_step int not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Candidates
create table candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  email text,
  avatar text,
  status text not null default 'Sourced' check (status in ('Sourced','Applied','Interviewing','Offer','Hired','Rejected')),
  ai_score int,
  current_job text,
  current_company text,
  applied_for text,
  full_resume_text text,
  skills text[],
  contact_info jsonb,
  extracted_details jsonb,
  interview_notes jsonb,
  interview_scores jsonb,
  ai_summary text,
  interview_analysis jsonb,
  last_interview_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  salary text,
  company text,
  location text,
  status text not null default 'active' check (status in ('active','pending','closed')),
  approval text not null default 'pending' check (approval in ('approved','pending','rejected')),
  description text,
  candidates_count int not null default 0,
  ai_matches int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  logo text,
  contact_name text,
  contact_email text,
  status text not null default 'prospect' check (status in ('active','prospect','on hold','inactive')),
  open_jobs int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Master Resumes
create table master_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  user_title text not null,
  reformatted_text text not null,
  full_name text,
  current_job_title text,
  contact_info jsonb,
  skills text[],
  avatar_uri text,
  missing_information text[],
  questions text[],
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Subscriptions (server-write only)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies(id) on delete cascade,
  plan text not null default 'Free' check (plan in ('Free','Premium','ProAnnual')),
  status text not null default 'active' check (status in ('active','canceled','past_due')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);```

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  full_name text;
  first_name_val text;
  last_name_val text;
  account_type_val text;
begin
  full_name := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  first_name_val := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  last_name_val := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  account_type_val := coalesce(new.raw_user_meta_data ->> 'account_type', 'personal');

  insert into public.companies (
    name,
    is_personal,
    owner_id
  )
  values (
    case
      when account_type_val = 'personal' then full_name || '''s Workspace'
      else coalesce(new.raw_user_meta_data ->> 'company_name', full_name || '''s Company')
    end,
    account_type_val = 'personal',
    new.id
  )
  returning id into new_company_id;

  insert into public.profiles (
    id,
    email,
    name,
    first_name,
    last_name,
    role,
    account_type,
    company_id
  )
  values (
    new.id,
    new.email,
    full_name,
    nullif(first_name_val, ''),
    nullif(last_name_val, ''),
    'Admin',
    account_type_val,
    new_company_id
  );

  insert into public.subscriptions (
    company_id,
    plan,
    status
  )
  values (
    new_company_id,
    'Free',
    'active'
  )
  on conflict (company_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

### 4.2 RLS Policies (with WITH CHECK)

```sql
alter table profiles enable row level security;
alter table companies enable row level security;
alter table candidates enable row level security;
alter table jobs enable row level security;
alter table clients enable row level security;
alter table master_resumes enable row level security;
alter table subscriptions enable row level security;

-- Helper: get the caller's company_id
create or replace function auth_company_id() returns uuid as $$
  select company_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- profiles
create policy "Users read own profile" on profiles for select using (id = auth.uid());
create policy "Users insert own profile" on profiles for insert with check (id = auth.uid());
create policy "Users update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- companies
create policy "Members read own company" on companies for select using (id = auth_company_id());
create policy "Owner updates company" on companies for update using (id = auth_company_id()) with check (id = auth_company_id());
create policy "Authenticated users create company" on companies for insert with check (auth.uid() = owner_id);

-- candidates / jobs / clients (identical pattern)
create policy "Company members read candidates" on candidates for select using (company_id = auth_company_id());
create policy "Company members insert candidates" on candidates for insert with check (company_id = auth_company_id());
create policy "Company members update candidates" on candidates for update using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "Company members delete candidates" on candidates for delete using (company_id = auth_company_id());

create policy "Company members read jobs" on jobs for select using (company_id = auth_company_id());
create policy "Company members insert jobs" on jobs for insert with check (company_id = auth_company_id());
create policy "Company members update jobs" on jobs for update using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "Company members delete jobs" on jobs for delete using (company_id = auth_company_id());

create policy "Company members read clients" on clients for select using (company_id = auth_company_id());
create policy "Company members insert clients" on clients for insert with check (company_id = auth_company_id());
create policy "Company members update clients" on clients for update using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "Company members delete clients" on clients for delete using (company_id = auth_company_id());

-- master_resumes (user-scoped, not company-scoped)
create policy "Users read own resumes" on master_resumes for select using (user_id = auth.uid());
create policy "Users insert own resumes" on master_resumes for insert with check (user_id = auth.uid());
create policy "Users update own resumes" on master_resumes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own resumes" on master_resumes for delete using (user_id = auth.uid());

-- subscriptions (read-only for members; writes via service-role only)
create policy "Members read own subscription" on subscriptions for select using (company_id = auth_company_id());
```

### 4.3 Required Indexes

```sql
create index idx_profiles_company on profiles(company_id);
create index idx_candidates_company on candidates(company_id);
create index idx_jobs_company on jobs(company_id);
create index idx_clients_company on clients(company_id);
create index idx_master_resumes_user on master_resumes(user_id);
create index idx_subscriptions_company on subscriptions(company_id);
create index idx_subscriptions_stripe on subscriptions(stripe_customer_id);
```

---

## 5. AI Flow Edit Policy

| Path | Rule |
|------|------|
| `src/ai/flows/*.ts` | **No edits.** Flow logic, prompts, and Zod schemas are frozen. |
| `src/ai/tools/*.ts` | **No edits.** |
| `src/ai/genkit.ts` | **No edits.** |
| `src/app/api/ai/*/route.ts` | **Create only.** These are new thin wrappers that import and call flows. They do not modify flow internals. |

The only permitted interaction with `src/ai/` is importing the exported flow functions from route handlers. No changes to function signatures, prompts, models, or Zod schemas.

---

## 6. Phase 1 Implementation Scope (Single Vertical Slice)

**Goal:** A user can sign up, land on a dashboard, create a candidate, upload/parse a CV, persist the result, and view the candidate with parsed data.

### Phase 1 file list (exact, ordered)

```
1.  npm install @supabase/supabase-js @supabase/ssr
2.  CREATE src/lib/supabase/client.ts        -- browser client
3.  CREATE src/lib/supabase/server.ts        -- server client (cookies)
4.  CREATE src/lib/supabase/admin.ts         -- service-role client
5.  CREATE src/middleware.ts                  -- session refresh
6.  CREATE src/lib/api-helpers.ts            -- getAuthUser, getAuthProfile, errorResponse
7.  CREATE src/lib/api-client.ts             -- apiPost, apiGet, apiPatch, apiDelete (no Bearer)
8.  CREATE src/types/models.ts               -- all interfaces, string dates, no Firebase imports
9.  CREATE src/app/api/auth/callback/route.ts -- OAuth code exchange
10. CREATE src/app/api/profile/route.ts       -- GET/PATCH own profile
11. CREATE src/app/api/companies/[companyId]/candidates/route.ts      -- GET, POST
12. CREATE src/app/api/companies/[companyId]/candidates/[id]/route.ts -- GET, PATCH, DELETE
13. CREATE src/app/api/ai/extract-cv-data/route.ts  -- POST (parse CV)
14. CREATE src/app/api/ai/reformat-resume/route.ts   -- POST (reformat)
15. RUN    Supabase SQL: create tables (profiles, companies, candidates) + RLS
16. EDIT src/app/signup/page.tsx    -- wire to supabase.auth.signUp only; DO NOT create company/profile client-side. These are auto-created by DB trigger.
17. EDIT   src/app/ai-parser/page.tsx         -- wire to /api/ai/extract-cv-data + persist candidate
```

### Phase 1 does NOT include

- Jobs, clients, master_resumes, subscriptions CRUD
- Billing / Stripe integration
- Remaining 10 AI route handlers (only extract-cv-data and reformat-resume)
- Client-side localStorage migration (except ai-parser)
- Seed route

These ship in Phase 2+.
