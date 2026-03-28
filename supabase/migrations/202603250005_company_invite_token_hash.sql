alter table public.company_invites
  add column if not exists token_hash text;

update public.company_invites
set token_hash = encode(digest(token, 'sha256'), 'hex')
where token_hash is null;

alter table public.company_invites
  alter column token_hash set not null;

create unique index if not exists company_invites_token_hash_uidx
  on public.company_invites (token_hash);

create index if not exists company_invites_token_hash_idx
  on public.company_invites (token_hash);
