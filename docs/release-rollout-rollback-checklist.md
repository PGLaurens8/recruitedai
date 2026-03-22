# Staged Rollout and Rollback Checklist

Last reviewed: 2026-03-21
Owner: Engineering

## 1) Pre-Release Gate (Required)

1. Confirm branch and commit SHA for release candidate.
2. Confirm CI green on the release commit.
3. Run local gates on release commit:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
4. Confirm environment variables are present for target environment.
5. Confirm migration risk and rollback strategy for any schema changes.

## 2) Staged Rollout Sequence

1. Deploy to preview/staging environment.
2. Run smoke path in staging:
   - login flow
   - candidate create/read/update
   - job read/update
   - client read/update
   - one AI route call
3. Verify no spike in 5xx/API errors in logs.
4. Deploy to production with one designated release owner.
5. Run production smoke checks immediately after deploy.

## 3) Production Verification (First 30 Minutes)

1. Validate auth success/failure paths.
2. Validate API request IDs are present in responses.
3. Validate dashboard pages load and show live metrics.
4. Validate candidate/job/client list endpoints respond normally.
5. Confirm no elevated rate-limit or unexpected error patterns.

## 4) Rollback Criteria

Rollback immediately if any of these occur:
- sustained auth failures
- sustained 5xx increase
- tenant isolation concerns
- data mutation failures on core workflows

## 5) Rollback Procedure

1. Freeze further deploys.
2. Re-deploy previous known-good production build.
3. Revert environment variable changes if introduced in this release.
4. If data integrity was impacted, execute backup/PITR runbook.
5. Re-run production smoke checks on rolled-back version.
6. Publish incident summary with timeline and root cause owner.

## 6) Post-Release Documentation

1. Record release timestamp, commit SHA, and owner.
2. Record observed issues and mitigations.
3. Open follow-up tasks for any temporary mitigations.
