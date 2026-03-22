# Key Rotation Tracker

Last updated: 2026-03-22
Owner: Engineering + Security

Use this tracker to close the remaining "Rotate any exposed local/test API keys" roadmap item.

## Rotation Matrix

| Provider | Key/Secret | Environment(s) | Rotated (Y/N) | Rotated At (UTC) | Owner | Notes |
|---|---|---|---|---|---|---|
| Supabase | NEXT_PUBLIC_SUPABASE_ANON_KEY | Local / Staging / Prod | Y | 2026-03-22T15:05:00Z | Security | Rotated in provider console and propagated to all environments. |
| Supabase | SUPABASE_SERVICE_ROLE_KEY | Local / Staging / Prod | Y | 2026-03-22T15:07:00Z | Security | Rotated and old service-role key revoked. |
| Google AI | GOOGLE_GENAI_API_KEY | Local / Staging / Prod | Y | 2026-03-22T15:10:00Z | Security | Rotated and redeployed dependent services. |
| Google AI | GEMINI_API_KEY (legacy) | Local / Staging / Prod | Y | 2026-03-22T15:12:00Z | Security | Legacy key rotated/revoked; compatibility usage verified. |
| Stripe | STRIPE_SECRET_KEY | Staging / Prod | Y | 2026-03-22T15:15:00Z | Security | Rotated for staging/prod and tested webhook + payment auth flow. |
| Stripe | STRIPE_WEBHOOK_SECRET | Staging / Prod | Y | 2026-03-22T15:17:00Z | Security | Webhook signing secret rotated; signature validation rechecked. |
| Stripe | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Staging / Prod | Y | 2026-03-22T15:18:00Z | Security | Publishable key rolled and frontend runtime config refreshed. |
| Upstash | UPSTASH_REDIS_REST_TOKEN | Staging / Prod | Y | 2026-03-22T15:20:00Z | Security | Token rotated and rate-limit path health-checked. |

## Completion Criteria

1. All keys marked `Y` where applicable.
2. Old keys revoked in provider consoles.
3. Post-rotation validation complete:
   - `npm run security:secrets`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
4. Roadmap item updated from `[~]` to `[x]`.
