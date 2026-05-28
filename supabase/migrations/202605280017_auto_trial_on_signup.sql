-- Auto-stamp trial dates whenever a new company row is inserted. The plan column
-- already defaults to 'trial' (see 202605280016_trial_and_usage.sql), but the
-- trial_started_at / trial_expires_at columns are nullable for backfill safety
-- and so paid companies created later don't get spurious trial windows. This
-- trigger fills them in for new signups so the trial banner and quota helper
-- have a concrete 7-day window to compare against.
--
-- Companies created before this migration keep trial_started_at = null and are
-- treated as legacy / non-trial by enforceTrialQuota.

create or replace function public.set_trial_window_on_new_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trial_started_at is null then
    update public.companies
    set
      trial_started_at = now(),
      trial_expires_at = now() + interval '7 days',
      plan = 'trial'
    where id = new.id
      and trial_started_at is null;
  end if;
  return null;
end;
$$;

drop trigger if exists companies_set_trial_window on public.companies;
create trigger companies_set_trial_window
after insert on public.companies
for each row execute function public.set_trial_window_on_new_company();

comment on function public.set_trial_window_on_new_company() is 'Stamps a 7-day trial window on newly inserted companies when trial_started_at is null. Paired with the plan default in 202605280016_trial_and_usage.sql.';
