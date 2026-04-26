-- Fix: make the legacy plain-text token column nullable so new invites no longer
-- store a raw token alongside the secure token_hash. Lookups already use
-- token_hash exclusively. The plain token column is retained for existing rows
-- but will no longer be populated for new invites.

alter table public.company_invites
  alter column token drop not null;
