-- Link jobs to clients so the sales pipeline can connect vacancies to a client.
-- client_id is nullable on purpose: existing jobs that only carry a free-text
-- company name must continue to work, so this is an additive, backwards-compatible change.
-- Uses ADD COLUMN IF NOT EXISTS so the migration is safe to run multiple times.

alter table public.jobs
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists jobs_client_id_idx on public.jobs (client_id);

comment on column public.jobs.client_id is 'Optional FK to the client this vacancy belongs to. Null for legacy jobs that only have a free-text company name. On client deletion the link is cleared (set null) rather than cascading the job away.';
