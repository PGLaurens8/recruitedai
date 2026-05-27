-- Public (anon) read access to a master resume's shareable, non-sensitive
-- fields, powering the /resume/[id] public viewer.
--
-- NOTE: requested as 202605270013_public_resume_rls.sql, but that timestamp is
-- already taken by 202605270013_seed_unique_constraints.sql. Renumbered to
-- 202605270014 to keep migration ordering unambiguous.
--
-- RLS on master_resumes stays locked to the owner (see core_schema.sql:
-- "Users read own resumes" -> user_id = auth.uid()). Rather than open the whole
-- table to anon (which would also expose user_id, missing_information,
-- questions, timestamps, etc.), we expose a SECURITY DEFINER function that
-- projects ONLY the safe, public-facing columns. The function runs as its owner
-- and so bypasses RLS for exactly this whitelisted projection — anon never gets
-- direct table access.

create or replace function public.get_public_resume(resume_id uuid)
returns table (
  full_name text,
  user_title text,
  reformatted_text text,
  skills text[],
  avatar_uri text,
  current_job_title text,
  contact_info jsonb
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
    mr.current_job_title,
    mr.contact_info
  from public.master_resumes mr
  where mr.id = resume_id;
$$;

-- Lock down the default PUBLIC execute grant, then grant explicitly. The
-- function only ever returns the whitelisted columns above — never user_id.
revoke all on function public.get_public_resume(uuid) from public;
grant execute on function public.get_public_resume(uuid) to anon, authenticated;
