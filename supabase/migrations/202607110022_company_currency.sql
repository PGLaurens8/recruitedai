-- Company-level primary currency. RecruitedAI's primary market is South Africa,
-- so ZAR is the default; USD is the only other supported currency for now. This
-- is the server-side source of truth for billing display, placement fees
-- (submissions.placement_fee, documented as "company default currency") and any
-- money rendered in reports. The client currency detection in src/lib/locale.ts
-- still drives the pre-auth pricing page, but once a company exists this column
-- wins.
--
-- The value is chosen on the signup screen and rides through as user metadata,
-- so handle_new_user() is re-created below to read raw_user_meta_data->>'currency'
-- and stamp it on the new company. Anything other than a supported code coerces
-- to ZAR so a bad/absent metadata value can never fail the signup insert against
-- the check constraint.

alter table public.companies
  add column if not exists currency text not null default 'ZAR'
    check (currency in ('USD', 'ZAR'));

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
    coalesce(new.raw_user_meta_data ->> 'role', 'Recruiter'),
    account_type_val,
    new_company_id
  );

  return new;
end;
$$;

comment on column public.companies.currency is 'Primary display/billing currency for the tenant (USD or ZAR). Defaults to ZAR; set from the signup currency selector via handle_new_user().';
