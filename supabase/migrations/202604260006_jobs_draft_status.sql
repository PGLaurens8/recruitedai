-- Fix: add 'draft' to jobs status constraint to match API default value.
-- The API defaults new jobs to 'draft' but the original constraint excluded it,
-- causing a DB violation on every job create without an explicit status.

alter table public.jobs
  drop constraint if exists jobs_status_check;

alter table public.jobs
  add constraint jobs_status_check
  check (status in ('draft', 'active', 'pending', 'closed'));
