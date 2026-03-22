# API Key Rotation and Secret Hygiene

Last reviewed: 2026-03-21
Owner: Engineering

## 1) Scope

This playbook defines how to rotate potentially exposed local/test API keys and ensure the repository does not retain real secret material.

## 2) Immediate Actions (When Exposure Is Suspected)

1. Identify all impacted providers and key identifiers.
2. Revoke/rotate keys in provider consoles immediately.
3. Update deployment environment variables with new values.
4. Restart/redeploy affected services.
5. Validate core workflows after rotation.

## 3) RecruitedAI Key Inventory

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Google AI:
  - `GOOGLE_GENAI_API_KEY`
  - `GEMINI_API_KEY` (legacy alias if used)
- Stripe:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Upstash:
  - `UPSTASH_REDIS_REST_TOKEN`

## 4) Rotation Procedure (Per Provider)

1. Create a new key in provider console.
2. Update non-production env first and validate smoke tests.
3. Promote new key to production env.
4. Revoke old key only after successful validation.
5. Record timestamp, owner, and changed environments.

## 5) Validation Checklist After Rotation

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. Manual smoke:
   - login
   - candidate/job/client reads and writes
   - one AI endpoint call

## 6) Repository Hygiene Rules

1. Never commit real keys in source, docs, or examples.
2. Keep `.env*` ignored (`.gitignore` already includes `.env*`).
3. Use placeholders in docs (`<your-key>` format).
4. Run secret-pattern scans before release.

## 7) Recommended Secret Scan Command

```bash
rg -n --hidden --glob '!.git' --glob '!node_modules' --glob '!.env*' --glob '!package.json' --glob '!docs/api-key-rotation-and-secret-hygiene.md' \
  "(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|BEGIN PRIVATE KEY|xox[baprs]-)"
```

## 8) Current Follow-Up (2026-03-21)

- Repository docs were sanitized to remove hardcoded key-like material.
- Local machine `.env` values must be rotated in provider consoles by an owner with credential access.
