# Supabase Backup, PITR, and Recovery Runbook

Last reviewed: 2026-03-21
Owner: Engineering
Applies to: Supabase production project for RecruitedAI

## 1) Recovery Targets

- Target RPO: 15 minutes (PITR granularity)
- Target RTO: 60 minutes for partial restore, 120 minutes for full environment restore
- Critical data domains:
  - `profiles`
  - `companies`
  - `candidates`
  - `jobs`
  - `clients`
  - `master_resumes`

## 2) Required Controls (Supabase)

1. Enable daily backups for production database.
2. Enable Point-in-Time Recovery (PITR) for production.
3. Restrict backup/restore permissions to Admin/Owner accounts only.
4. Store environment variable snapshots in the team password manager:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 3) Weekly Verification Checklist

1. Confirm PITR is enabled in Supabase project settings.
2. Confirm latest automated backup exists and succeeded.
3. Confirm backup retention period matches plan.
4. Confirm at least two team members can access restore controls.
5. Record verification timestamp in incident log.

## 4) Incident Triggers

Run this playbook when any of these occur:
- Accidental data deletion or destructive migration
- Corrupted production writes
- Security incident requiring rollback to known-good timestamp

## 5) PITR Recovery Procedure

1. Declare incident and freeze deploys.
2. Identify recovery timestamp (UTC) from logs and request IDs.
3. Create a restore target project/database from PITR snapshot in Supabase.
4. Run smoke checks against restore target:
   - auth login
   - candidate list/read
   - jobs list/read
   - clients list/read
5. If smoke checks pass, cut over app env vars to restored target.
6. Run post-cutover checks:
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
   - manual login and CRUD smoke in production
7. Announce incident resolved and record final timeline.

## 6) Table-Level Validation After Restore

1. Confirm row counts are within expected range for core tables.
2. Validate latest known records for one tenant across:
   - company profile
   - candidate updates
   - job status changes
   - client status changes
3. Validate RLS behavior with non-admin user account.

## 7) Roll-Forward Guidance

- After restore, replay any required business writes from audit logs manually.
- Do not reapply risky migrations until root cause is documented.
- Add regression tests for the incident class before reopening normal release flow.

## 8) Recovery Drill (Monthly)

1. Run a non-production PITR restore drill.
2. Measure actual RTO and compare to target.
3. Capture gaps and assign actions.
4. Update this runbook if steps changed.
