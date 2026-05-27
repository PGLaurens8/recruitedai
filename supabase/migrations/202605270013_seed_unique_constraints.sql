-- Per-company uniqueness so the demo seed (src/app/api/seed/demo/route.ts) can
-- upsert by a stable key instead of inserting duplicates on every re-run.
-- These also back the ON CONFLICT targets used by that route's upserts.

-- Collapse any pre-existing duplicates first, otherwise the unique index
-- creation would fail. Keep one row per key (lowest ctid) and drop the rest.

delete from public.candidates a
  using public.candidates b
  where a.company_id = b.company_id
    and a.email = b.email
    and a.email is not null
    and a.ctid > b.ctid;

create unique index if not exists candidates_company_email_uidx
  on public.candidates (company_id, email);

delete from public.jobs a
  using public.jobs b
  where a.company_id = b.company_id
    and a.title = b.title
    and a.title is not null
    and a.ctid > b.ctid;

create unique index if not exists jobs_company_title_uidx
  on public.jobs (company_id, title);

delete from public.clients a
  using public.clients b
  where a.company_id = b.company_id
    and a.name = b.name
    and a.name is not null
    and a.ctid > b.ctid;

create unique index if not exists clients_company_name_uidx
  on public.clients (company_id, name);
