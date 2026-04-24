# Vercel Deployments

Use separate Vercel projects for the same repository to manage different environments.

## Project 1: Demo (Mock Mode)

- **Name**: `recruitedai-demo`
- **Branch**: `main`
- **Environment Variables**:
  - `NEXT_PUBLIC_RUNTIME_MODE`: `mock`

## Project 2: Production (Supabase Mode)

- **Name**: `recruitedai-supabase`
- **Branch**: `main` (or a dedicated `supabase` branch)
- **Required Environment Variables**:
  - `NEXT_PUBLIC_RUNTIME_MODE`: `supabase`
  - `NEXT_PUBLIC_SUPABASE_URL`: `https://[your-project-id].supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `[your-public-anon-key]`

## Common Pitfalls & Troubleshooting

### 1. Variables Missing in Browser
If you see "Missing Supabase public env vars" error in the browser despite having them set in Vercel:
- **Redeploy is required**: You must click **Redeploy** on the latest deployment in Vercel after changing `NEXT_PUBLIC_` variables. Next.js embeds these values into the Javascript files during the build.
- **Check Environments**: Ensure the variables are assigned to the correct environments (Production, Preview, Development) in the Vercel dashboard.

### 2. Finding Supabase Keys
Go to your Supabase Dashboard -> **Project Settings** -> **API**:
- **URL**: Use for `NEXT_PUBLIC_SUPABASE_URL`.
- **anon / public key**: Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 3. Whitespace
Ensure there are no leading or trailing spaces in the values you paste into Vercel.
