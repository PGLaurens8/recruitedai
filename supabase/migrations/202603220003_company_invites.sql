create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('Admin', 'Recruiter', 'Sales', 'Candidate', 'Developer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_invites_company_created_idx
  on public.company_invites (company_id, created_at desc);

create index if not exists company_invites_token_idx
  on public.company_invites (token);

create unique index if not exists company_invites_pending_company_email_uidx
  on public.company_invites (company_id, lower(email))
  where status = 'pending';

drop trigger if exists company_invites_set_updated_at on public.company_invites;
create trigger company_invites_set_updated_at
before update on public.company_invites
for each row execute function public.set_updated_at();

alter table public.company_invites enable row level security;

drop policy if exists "Company members read invites" on public.company_invites;
create policy "Company members read invites" on public.company_invites
for select using (company_id = public.auth_company_id());
