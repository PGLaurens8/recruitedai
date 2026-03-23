alter table public.candidates
  add column if not exists deleted_at timestamptz;

alter table public.jobs
  add column if not exists deleted_at timestamptz;

alter table public.clients
  add column if not exists deleted_at timestamptz;

create index if not exists candidates_company_deleted_idx
  on public.candidates (company_id, deleted_at, created_at desc);

create index if not exists jobs_company_deleted_idx
  on public.jobs (company_id, deleted_at, created_at desc);

create index if not exists clients_company_deleted_idx
  on public.clients (company_id, deleted_at, created_at desc);
