create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  idempotency_key text not null,
  request_hash text,
  status text not null default 'processing' check (status in ('processing', 'succeeded', 'failed')),
  response_status int,
  response_body jsonb,
  error_code text,
  error_message text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, actor_user_id, scope, idempotency_key)
);

create index if not exists idempotency_keys_company_actor_idx
  on public.idempotency_keys (company_id, actor_user_id, scope, idempotency_key);

create index if not exists idempotency_keys_expires_idx
  on public.idempotency_keys (expires_at);

drop trigger if exists idempotency_keys_set_updated_at on public.idempotency_keys;
create trigger idempotency_keys_set_updated_at
before update on public.idempotency_keys
for each row execute function public.set_updated_at();

alter table public.idempotency_keys enable row level security;

drop policy if exists "Users read own idempotency keys" on public.idempotency_keys;
create policy "Users read own idempotency keys" on public.idempotency_keys
for select using (
  company_id = public.auth_company_id()
  and actor_user_id = auth.uid()
);

drop policy if exists "Users insert own idempotency keys" on public.idempotency_keys;
create policy "Users insert own idempotency keys" on public.idempotency_keys
for insert with check (
  company_id = public.auth_company_id()
  and actor_user_id = auth.uid()
);

drop policy if exists "Users update own idempotency keys" on public.idempotency_keys;
create policy "Users update own idempotency keys" on public.idempotency_keys
for update using (
  company_id = public.auth_company_id()
  and actor_user_id = auth.uid()
) with check (
  company_id = public.auth_company_id()
  and actor_user_id = auth.uid()
);
