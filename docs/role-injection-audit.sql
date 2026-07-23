-- Role-injection remediation audit
-- =================================
-- Companion to migration 202607230023_restore_role_from_account_type.sql.
--
-- Context: while 202607110022_company_currency.sql was live, handle_new_user()
-- set profiles.role from client-supplied raw_user_meta_data->>'role', so a
-- crafted supabase.auth.signUp({ options: { data: { role: 'Admin' | 'Developer' }}})
-- could self-elevate. The migration fixes new signups but does NOT remediate
-- rows created during the vulnerable window. This query surfaces those rows.
--
-- Fixed-trigger outcomes are ONLY:
--   account_type = 'company'  -> 'Admin'
--   account_type = 'personal' -> 'Candidate'
-- Anything else on a self-service signup is anomalous.
--
-- IMPORTANT: roles can also be set legitimately via team member-management /
-- invites (an existing Admin promoting someone). Treat every hit as a REVIEW
-- candidate, not an automatic culprit — cross-check against known staff and
-- invited team members before changing anything.
--
-- Run read-only first. Remediation for confirmed-bad rows is at the bottom
-- (commented out — review the SELECT results before running it).

select
  p.id,
  p.email,
  p.role,
  p.account_type,
  c.is_personal,
  c.name                            as company_name,
  u.created_at                      as signed_up_at,
  u.raw_user_meta_data ->> 'role'   as signup_metadata_role,   -- what was passed at signup
  (c.owner_id = p.id)               as is_company_owner
from public.profiles p
join public.companies c on c.id = p.company_id
join auth.users       u on u.id = p.id
where
  -- (1) Privileged role on a personal account — personal signups must be Candidate.
  (p.account_type = 'personal' and p.role <> 'Candidate')
  -- (2) Developer anywhere — the signup trigger NEVER assigns Developer, and it
  --     also unlocks the unlimited-quota exemption in rate-limit.ts.
  or p.role = 'Developer'
  -- (3) Signup metadata role disagrees with the account_type-derived role.
  --     The app's normal client sends a MATCHING role, so only true mismatches
  --     (the injection signature) flag here.
  or (
    u.raw_user_meta_data ->> 'role' is not null
    and u.raw_user_meta_data ->> 'role'
        <> case when p.account_type = 'company' then 'Admin' else 'Candidate' end
  )
order by (p.role = 'Developer') desc, u.created_at desc;

-- ---------------------------------------------------------------------------
-- Remediation (RUN ONLY after reviewing the SELECT above and excluding
-- legitimately-assigned roles). Resets each listed profile to the role its
-- account_type would have produced under the fixed trigger.
--
-- update public.profiles p
-- set role = case when p.account_type = 'company' then 'Admin' else 'Candidate' end
-- where p.id in (
--   -- paste the reviewed, confirmed-bad profile ids here
-- );
