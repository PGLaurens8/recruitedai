create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_personal boolean not null default false,
  logo text,
  website text,
  email text,
  address text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  first_name text,
  last_name text,
  role text not null default 'Recruiter' check (role in ('Admin', 'Recruiter', 'Sales', 'Candidate', 'Developer')),
  account_type text not null default 'personal' check (account_type in ('personal', 'company')),
  company_id uuid not null references public.companies(id) on delete cascade,
  onboarding_step int not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  avatar text,
  status text not null default 'Sourced' check (status in ('Sourced', 'Applied', 'Interviewing', 'Offer', 'Hired', 'Rejected')),
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
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  salary text,
  company text,
  location text,
  status text not null default 'active' check (status in ('active', 'pending', 'closed')),
  approval text not null default 'pending' check (approval in ('approved', 'pending', 'rejected')),
  description text,
  candidates_count int not null default 0,
  ai_matches int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  logo text,
  contact_name text,
  contact_email text,
  status text not null default 'prospect' check (status in ('active', 'prospect', 'on hold', 'inactive')),
  open_jobs int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.master_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists candidates_set_updated_at on public.candidates;
create trigger candidates_set_updated_at
before update on public.candidates
for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists master_resumes_set_updated_at on public.master_resumes;
create trigger master_resumes_set_updated_at
before update on public.master_resumes
for each row execute function public.set_updated_at();

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

  insert into public.companies (name, is_personal, owner_id)
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
    coalesce(new.raw_user_meta_data ->> 'role', 'Recruiter'),
    account_type_val,
    new_company_id
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.auth_company_id()
returns uuid
language sql
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.jobs enable row level security;
alter table public.clients enable row level security;
alter table public.master_resumes enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
for select using (id = auth.uid());

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
for insert with check (id = auth.uid());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Members read own company" on public.companies;
create policy "Members read own company" on public.companies
for select using (id = public.auth_company_id());

drop policy if exists "Owner updates company" on public.companies;
create policy "Owner updates company" on public.companies
for update using (id = public.auth_company_id()) with check (id = public.auth_company_id());

drop policy if exists "Authenticated users create company" on public.companies;
create policy "Authenticated users create company" on public.companies
for insert with check (auth.uid() = owner_id);

drop policy if exists "Company members read candidates" on public.candidates;
create policy "Company members read candidates" on public.candidates
for select using (company_id = public.auth_company_id());

drop policy if exists "Company members insert candidates" on public.candidates;
create policy "Company members insert candidates" on public.candidates
for insert with check (company_id = public.auth_company_id());

drop policy if exists "Company members update candidates" on public.candidates;
create policy "Company members update candidates" on public.candidates
for update using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists "Company members delete candidates" on public.candidates;
create policy "Company members delete candidates" on public.candidates
for delete using (company_id = public.auth_company_id());

drop policy if exists "Company members read jobs" on public.jobs;
create policy "Company members read jobs" on public.jobs
for select using (company_id = public.auth_company_id());

drop policy if exists "Company members insert jobs" on public.jobs;
create policy "Company members insert jobs" on public.jobs
for insert with check (company_id = public.auth_company_id());

drop policy if exists "Company members update jobs" on public.jobs;
create policy "Company members update jobs" on public.jobs
for update using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists "Company members delete jobs" on public.jobs;
create policy "Company members delete jobs" on public.jobs
for delete using (company_id = public.auth_company_id());

drop policy if exists "Company members read clients" on public.clients;
create policy "Company members read clients" on public.clients
for select using (company_id = public.auth_company_id());

drop policy if exists "Company members insert clients" on public.clients;
create policy "Company members insert clients" on public.clients
for insert with check (company_id = public.auth_company_id());

drop policy if exists "Company members update clients" on public.clients;
create policy "Company members update clients" on public.clients
for update using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists "Company members delete clients" on public.clients;
create policy "Company members delete clients" on public.clients
for delete using (company_id = public.auth_company_id());

drop policy if exists "Users read own resumes" on public.master_resumes;
create policy "Users read own resumes" on public.master_resumes
for select using (user_id = auth.uid());

drop policy if exists "Users insert own resumes" on public.master_resumes;
create policy "Users insert own resumes" on public.master_resumes
for insert with check (user_id = auth.uid());

drop policy if exists "Users update own resumes" on public.master_resumes;
create policy "Users update own resumes" on public.master_resumes
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users delete own resumes" on public.master_resumes;
create policy "Users delete own resumes" on public.master_resumes
for delete using (user_id = auth.uid());
