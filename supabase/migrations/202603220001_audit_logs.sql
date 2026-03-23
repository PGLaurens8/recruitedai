create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_company_created_at_idx
  on public.audit_logs (company_id, created_at desc);

create index if not exists audit_logs_actor_created_at_idx
  on public.audit_logs (actor_user_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Company members read audit logs" on public.audit_logs;
create policy "Company members read audit logs" on public.audit_logs
for select using (company_id = public.auth_company_id());

drop policy if exists "Company members insert audit logs" on public.audit_logs;
create policy "Company members insert audit logs" on public.audit_logs
for insert with check (
  company_id = public.auth_company_id()
  and actor_user_id = auth.uid()
);
