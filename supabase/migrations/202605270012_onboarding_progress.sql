-- First-use onboarding checklist progress.
-- New users see a dashboard checklist that walks them through initial setup.
-- These columns persist which steps a user has manually marked complete and
-- whether they have permanently dismissed the card. Auto-detectable steps
-- (first candidate / client / job) are derived from real data at render time
-- and are intentionally NOT stored here.

alter table public.profiles
  add column if not exists onboarding_completed_steps text[] not null default '{}',
  add column if not exists onboarding_dismissed boolean not null default false;
