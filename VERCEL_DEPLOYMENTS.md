# Vercel Deployments

Use separate Vercel projects for the same repository.

## Project 1: Demo

- Name: `recruitedai-demo`
- Suggested branch: `main`
- Env:
  - `NEXT_PUBLIC_RUNTIME_MODE=mock`

## Project 2: Supabase

- Name: `recruitedai-supabase`
- Suggested branch: `supabase`
- Env:
  - `NEXT_PUBLIC_RUNTIME_MODE=supabase`
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

## Notes

- The app shell now selects auth/runtime behavior from `NEXT_PUBLIC_RUNTIME_MODE`.
- Supported runtime modes are `mock` and `supabase`.
- The active app runtime no longer depends on Firebase. Remaining Firebase files in the repository are legacy cleanup items, not required for deployment.
