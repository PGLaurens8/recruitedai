# Key Rotation Tracker

Last updated: 2026-03-21
Owner: Engineering + Security

Use this tracker to close the remaining "Rotate any exposed local/test API keys" roadmap item.

## Rotation Matrix

| Provider | Key/Secret | Environment(s) | Rotated (Y/N) | Rotated At (UTC) | Owner | Notes |
|---|---|---|---|---|---|---|
| Supabase | NEXT_PUBLIC_SUPABASE_ANON_KEY | Local / Staging / Prod | N |  |  |  |
| Supabase | SUPABASE_SERVICE_ROLE_KEY | Local / Staging / Prod | N |  |  |  |
| Google AI | GOOGLE_GENAI_API_KEY | Local / Staging / Prod | N |  |  |  |
| Google AI | GEMINI_API_KEY (legacy) | Local / Staging / Prod | N |  |  |  |
| Stripe | STRIPE_SECRET_KEY | Staging / Prod | N |  |  |  |
| Stripe | STRIPE_WEBHOOK_SECRET | Staging / Prod | N |  |  |  |
| Stripe | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Staging / Prod | N |  |  |  |
| Upstash | UPSTASH_REDIS_REST_TOKEN | Staging / Prod | N |  |  |  |

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
