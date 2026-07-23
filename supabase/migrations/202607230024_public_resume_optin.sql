-- Public resume viewer — privacy hardening (opt-in + drop contact info).
--
-- The public /resume/[id] viewer (202605270014_public_resume_rls.sql) exposed
-- EVERY master resume by id, and its projection included contact_info
-- (email / phone / LinkedIn / location). That made a candidate's contact
-- details publicly readable by anyone with — or guessing — the link, with no
-- opt-in and no way to turn it off. This migration fixes both:
--   1. Adds master_resumes.is_public (default FALSE) — resumes are PRIVATE by
--      default; sharing is an explicit opt-in.
--   2. Re-defines get_public_resume() to (a) return nothing unless is_public,
--      and (b) drop contact_info from the projection entirely.
--
-- Ordering note (addresses the concern that 202605270014 predates the already-
-- applied 202607110022): this migration is timestamped after everything on
-- main and is written idempotently (`add column if not exists`, `drop function
-- if exists` before recreate), so it applies cleanly on any environment
-- regardless of whether the earlier out-of-order file ran.

alter table public.master_resumes
  add column if not exists is_public boolean not null default false;

-- The return type changes (contact_info removed), and Postgres will not let
-- `create or replace` alter a function's return type — so drop first, then
-- recreate, then re-establish the locked-down grants.
drop function if exists public.get_public_resume(uuid);

create function public.get_public_resume(resume_id uuid)
returns table (
  full_name text,
  user_title text,
  reformatted_text text,
  skills text[],
  avatar_uri text,
  current_job_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mr.full_name,
    mr.user_title,
    mr.reformatted_text,
    mr.skills,
    mr.avatar_uri,
    mr.current_job_title
  from public.master_resumes mr
  where mr.id = resume_id
    and mr.is_public = true;
$$;

-- contact_info, user_id, missing_information, questions and timestamps are all
-- intentionally excluded — the anon/authenticated grantees only ever receive
-- the columns projected above, and only when the owner has opted the resume in.
revoke all on function public.get_public_resume(uuid) from public;
grant execute on function public.get_public_resume(uuid) to anon, authenticated;

comment on function public.get_public_resume(uuid) is
  'Public projection of a master resume for the /resume/[id] viewer. Returns rows ONLY when master_resumes.is_public = true. Never exposes contact_info or any owner identifier.';
comment on column public.master_resumes.is_public is
  'Opt-in flag for the public /resume/[id] share link. FALSE by default; only the owner can flip it (via POST /api/master-resume/visibility).';
