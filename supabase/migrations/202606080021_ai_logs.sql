-- AI observability log. One row per AI flow invocation, written server-side by
-- the service role (see src/server/api/ai-logger.ts) so the main flow can record
-- latency, estimated token usage, estimated cost, and success/failure without
-- ever blocking or failing the user-facing request.
--
-- Logs are IMMUTABLE: company members may read their own rows, only the service
-- role may insert, and there are no UPDATE or DELETE policies — the audit trail
-- cannot be tampered with through the app. Estimates are deliberately
-- approximate (token counts via char/4 heuristic, cost via Gemini 2.5 Flash
-- public pricing); this table is for trend/cost monitoring, not billing.

create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  flow_name text not null,
  duration_ms integer not null,
  estimated_input_tokens integer,
  estimated_output_tokens integer,
  estimated_cost_usd numeric(10,6),
  success boolean not null default true,
  error_code text,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists ai_logs_company_created_idx
  on public.ai_logs (company_id, created_at);

create index if not exists ai_logs_flow_created_idx
  on public.ai_logs (flow_name, created_at);

alter table public.ai_logs enable row level security;

-- Company members can read their own company's logs (admin usage dashboard).
drop policy if exists "Company members read ai_logs" on public.ai_logs;
create policy "Company members read ai_logs" on public.ai_logs
for select using (company_id = public.auth_company_id());

-- Only the service role may write. Authenticated users have NO insert policy,
-- so RLS denies their inserts; the service role bypasses RLS entirely. This
-- explicit (false) policy documents the intent and keeps the table closed even
-- if a future grant widens table privileges.
drop policy if exists "Service role inserts ai_logs" on public.ai_logs;
create policy "Service role inserts ai_logs" on public.ai_logs
for insert with check (false);

-- No UPDATE or DELETE policies by design — logs are immutable.

comment on table public.ai_logs is 'Per-invocation AI flow observability: latency, estimated token usage, estimated cost, and success/failure. Immutable; written only by the service role.';
comment on column public.ai_logs.flow_name is 'Logical AI flow name, e.g. assess-job-match, parse-cv, generate-cover-letter.';
comment on column public.ai_logs.estimated_input_tokens is 'Approximate input tokens (char/4 heuristic), not a billed figure.';
comment on column public.ai_logs.estimated_output_tokens is 'Approximate output tokens (char/4 heuristic), not a billed figure.';
comment on column public.ai_logs.estimated_cost_usd is 'Approximate USD cost from Gemini 2.5 Flash public pricing ($0.30/1M input, $2.50/1M output) applied to the token estimates.';
