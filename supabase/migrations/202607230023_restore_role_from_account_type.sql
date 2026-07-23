-- SECURITY FIX (re-fix): prevent role injection via user metadata on signup.
--
-- Background:
--   * 202603120001_core_schema.sql originally set profiles.role from
--     raw_user_meta_data->>'role' — client-supplied signup metadata.
--   * 202604260007_fix_role_injection.sql fixed this by deriving role from
--     account_type only ("never trusted from user metadata").
--   * 202607110022_company_currency.sql re-created handle_new_user() to add the
--     currency column handling but SILENTLY REVERTED the role fix, restoring
--     `coalesce(new.raw_user_meta_data ->> 'role', 'Recruiter')`.
--
-- Impact of the revert: a crafted `supabase.auth.signUp({ options: { data: {
--   role: 'Admin' | 'Developer', ... } } })` call — reachable with only the
--   public anon key — lands the injected value straight into profiles.role
--   (constrained only by the CHECK to the five valid roles). Because API RBAC
--   (src/server/api/auth.ts `requireUserAndCompanyRole`) reads profiles.role as
--   the sole authority, and no code populates the "tamper-proof"
--   app_metadata.role that middleware.ts prefers, the attacker becomes
--   Admin/Developer of their own tenant end to end. (Cross-tenant isolation
--   still holds — company_id is server-derived and RLS-scoped.)
--
-- Fix: re-derive role from account_type only, exactly as
-- 202604260007_fix_role_injection.sql did, while preserving the currency
-- handling introduced by 202607110022_company_currency.sql.
--
-- DO NOT re-introduce a `raw_user_meta_data ->> 'role'` read here or in any
-- future re-creation of this function. src/server/api/role-assignment-security.test.ts
-- guards against exactly that regression.

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
  currency_val text;
  assigned_role text;
begin
  full_name := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  first_name_val := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  last_name_val := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  account_type_val := coalesce(new.raw_user_meta_data ->> 'account_type', 'personal');

  -- Coerce to a supported code; anything unexpected (or missing) becomes ZAR so
  -- the companies check constraint can never reject a signup.
  currency_val := case
    when new.raw_user_meta_data ->> 'currency' = 'USD' then 'USD'
    else 'ZAR'
  end;

  -- Role is derived from account_type ONLY — never trusted from user metadata,
  -- to prevent privilege escalation via direct Auth API calls.
  assigned_role := case
    when account_type_val = 'company' then 'Admin'
    else 'Candidate'
  end;

  insert into public.companies (name, is_personal, owner_id, currency)
  values (
    case
      when account_type_val = 'personal' then full_name || '''s Workspace'
      else coalesce(new.raw_user_meta_data ->> 'company_name', full_name || '''s Company')
    end,
    account_type_val = 'personal',
    new.id,
    currency_val
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
    assigned_role,
    account_type_val,
    new_company_id
  );

  return new;
end;
$$;
