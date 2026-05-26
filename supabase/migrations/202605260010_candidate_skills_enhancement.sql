-- Add skills/experience enrichment columns to candidates.
-- These store the structured output of the CV extraction and job-match AI flows.
-- Uses ADD COLUMN IF NOT EXISTS so the migration is safe to run multiple times.

alter table public.candidates
  add column if not exists years_of_experience integer;

alter table public.candidates
  add column if not exists education jsonb;

alter table public.candidates
  add column if not exists certifications text[];

alter table public.candidates
  add column if not exists has_degree_level_education boolean;

alter table public.candidates
  add column if not exists match_details jsonb;

comment on column public.candidates.years_of_experience is 'Total estimated years of professional experience extracted from the CV.';
comment on column public.candidates.education is 'Education history as a JSON array of { degree, institution, year? } entries.';
comment on column public.candidates.certifications is 'List of certifications and courses mentioned in the CV.';
comment on column public.candidates.has_degree_level_education is 'True if the candidate holds a bachelor degree or higher.';
comment on column public.candidates.match_details is 'Full assess-job-match output, including matchedSkills, missingSkills, experienceAlignment, and educationNote.';
