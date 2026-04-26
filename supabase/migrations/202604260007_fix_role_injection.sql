-- Fix: prevent role injection via user metadata on signup.
-- The original handle_new_user trigger trusted raw_user_meta_data.role,
-- allowing anyone to self-assign 'Admin' or 'Developer' by calling the
-- Supabase Auth API directly. Role is now derived from account_type only.

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
  assigned_role text;
begin
  full_name := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  first_name_val := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  last_name_val := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  account_type_val := coalesce(new.raw_user_meta_data ->> 'account_type', 'personal');

  -- Role is derived from account_type only — never trusted from user metadata
  -- to prevent privilege escalation via direct API calls.
  assigned_role := case
    when account_type_val = 'company' then 'Admin'
    else 'Candidate'
  end;

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
    assigned_role,
    account_type_val,
    new_company_id
  );

  return new;
end;
$$;
