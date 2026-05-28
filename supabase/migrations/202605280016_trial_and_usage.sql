-- Phase 2 trial enforcement: plan field + trial dates on companies, plus a
-- usage_counters table that the rate-limit middleware updates per (company,
-- period, feature). Caps for trial / starter / agency / scale plans live in
-- src/lib/plan-limits.ts. Stripe / Paddle activation will flip plan + clear
-- trial dates on subscription.created webhook (Phase 3).

alter table public.companies
  add column if not exists plan text not null default 'trial'
    check (plan in ('trial','starter','agency','scale'));

alter table public.companies
  add column if not exists trial_started_at timestamptz;

alter table public.companies
  add column if not exists trial_expires_at timestamptz;

-- Counter rows are scoped per company + monthly period_start + feature key. The
-- unique constraint lets the quota helper use upsert(on conflict) as the
-- increment primitive without a read-then-write race.
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_start date not null,
  feature text not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, period_start, feature)
);

create index if not exists usage_counters_company_idx
  on public.usage_counters (company_id, period_start);

alter table public.usage_counters enable row level security;

-- Members of a company can read their own usage. Writes happen only via the
-- service-role admin client in src/server/api/rate-limit.ts, so no insert /
-- update policy is exposed to authenticated users.
drop policy if exists usage_counters_select_own on public.usage_counters;
create policy usage_counters_select_own on public.usage_counters
  for select using (company_id = public.auth_company_id());

comment on column public.companies.plan is 'Subscription plan: trial (default for new signups), starter, agency, scale. Flipped by the billing webhook on subscription create / cancel.';
comment on column public.companies.trial_started_at is 'Timestamp the 7-day trial began. Null for paid plans created before trial-enforcement landed.';
comment on column public.companies.trial_expires_at is 'When the 7-day trial ends. Compared against now() by the trial banner and the quota helper.';
comment on table public.usage_counters is 'Per-company, per-month feature usage. Compared against limits in src/lib/plan-limits.ts by enforceTrialQuota.';
