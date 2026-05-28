-- Candidate submission and placement pipeline. A submission records that a
-- recruiter put a specific candidate forward for a specific job/vacancy. The
-- status column walks through interview rounds and ends at placed / rejected /
-- withdrew. Unique constraint on (company_id, candidate_id, job_id) prevents
-- duplicate submissions of the same candidate to the same vacancy — recruiters
-- need to withdraw and re-submit if they want to start over.
--
-- client_id is denormalized from jobs.client_id at write time so the sales
-- pipeline view can roll up submissions by client without joining through
-- jobs every time, and so historical placements survive client-deletion (FK
-- on delete set null instead of cascade).

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  status text not null default 'submitted'
    check (status in (
      'submitted',
      'client_reviewing',
      'interview_scheduled',
      'interview_completed',
      'offer_extended',
      'offer_accepted',
      'placed',
      'rejected',
      'withdrew'
    )),
  submitted_by uuid references public.profiles(id),
  notes text,
  rejection_reason text,
  placement_fee numeric(10,2),
  placement_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, candidate_id, job_id)
);

create index if not exists submissions_company_job_idx
  on public.submissions (company_id, job_id);

create index if not exists submissions_company_candidate_idx
  on public.submissions (company_id, candidate_id);

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

alter table public.submissions enable row level security;

drop policy if exists "Company members read submissions" on public.submissions;
create policy "Company members read submissions" on public.submissions
for select using (company_id = public.auth_company_id());

drop policy if exists "Company members insert submissions" on public.submissions;
create policy "Company members insert submissions" on public.submissions
for insert with check (company_id = public.auth_company_id());

drop policy if exists "Company members update submissions" on public.submissions;
create policy "Company members update submissions" on public.submissions
for update using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id());

drop policy if exists "Company members delete submissions" on public.submissions;
create policy "Company members delete submissions" on public.submissions
for delete using (company_id = public.auth_company_id());

comment on table public.submissions is 'Records a candidate being put forward to a specific job/vacancy. Status walks the pipeline from submitted through placed/rejected/withdrew.';
comment on column public.submissions.client_id is 'Denormalized from jobs.client_id at write time. Lets the sales pipeline roll up submissions by client without joining jobs. On client deletion the link is cleared.';
comment on column public.submissions.placement_fee is 'Fee charged on placement, in the company default currency. Set when status transitions to placed.';
