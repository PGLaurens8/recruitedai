-- Client detail fields. The client detail/edit page surfaces a website and a
-- free-text notes field on each client record alongside the existing contact
-- details. Both are optional and nullable. Added with IF NOT EXISTS so the
-- migration is safe to re-run and over partially-applied environments.

alter table public.clients add column if not exists website text;
alter table public.clients add column if not exists notes text;

comment on column public.clients.website is 'Client company website URL, shown and editable on the client detail page.';
comment on column public.clients.notes is 'Free-text notes about the client relationship, edited on the client detail page.';
