-- Candidate contact fields. The candidate detail page surfaces a "Contact
-- Details" card with inline-editable fields beyond name/email. All optional and
-- nullable. Added with IF NOT EXISTS so the migration is safe to re-run and over
-- partially-applied environments.

alter table public.candidates add column if not exists phone text;
alter table public.candidates add column if not exists linkedin_url text;
alter table public.candidates add column if not exists location text;
alter table public.candidates add column if not exists notice_period text;
alter table public.candidates add column if not exists salary_expectation text;
alter table public.candidates add column if not exists availability_date text;
alter table public.candidates add column if not exists work_authorization text;

comment on column public.candidates.phone is 'Candidate contact phone number, edited inline on the candidate detail page.';
comment on column public.candidates.linkedin_url is 'Candidate LinkedIn profile URL, edited inline on the candidate detail page.';
comment on column public.candidates.location is 'Candidate location/city, edited inline on the candidate detail page.';
comment on column public.candidates.notice_period is 'Candidate notice period (e.g. "30 days"), edited inline on the candidate detail page.';
comment on column public.candidates.salary_expectation is 'Candidate salary expectation (free text), edited inline on the candidate detail page.';
comment on column public.candidates.availability_date is 'Candidate availability/start date (free text), edited inline on the candidate detail page.';
comment on column public.candidates.work_authorization is 'Candidate work authorization status, edited inline on the candidate detail page.';
