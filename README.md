# CareerCraft AI (RecruitedAI)

AI-Powered Recruiting & Career Tools platform built with Next.js, Genkit, and environment-selectable backend modes.

## 🚀 Overview
CareerCraft AI is a dual-purpose platform designed to serve both job seekers (Candidates) and recruitment professionals (Recruiters/Agencies). It leverages Gemini 1.5 Pro to automate the recruitment cycle.

## ✨ Core Features

### For Candidates
- **Master Resume Builder:** AI-driven reformatting and gap analysis for core resumes.
- **Targeted Resume AI:** Real-time tailoring of resumes to specific job descriptions.
- **Interview Prep:** Voice-enabled mock interviews with AI coaching and scoring.
- **Online Presence:** Shareable Online Resumes and LinkTree-style bio pages.

### For Recruiters & Agencies
- **Smart Parser & Match:** High-precision extraction of candidate metrics (notice period, salary, hardware specs).
- **Agency Branding:** Generate professional Branded CV PDFs with custom logos for client submission.
- **Interview Analysis:** Automated extraction of structured Q&A from raw interview transcripts.
- **Smart Lead Finder:** AI sourcing for companies hiring and decision-maker contact details.
- **Reporting:** Performance analytics for placements and sales pipelines.

## 🛠 Technical Stack
- **Frontend:** Next.js 15, React, Tailwind CSS, ShadCN UI.
- **AI Engine:** Genkit v1.x with `@genkit-ai/google-genai` (Gemini 2.5 Flash).
- **Backend modes:** `supabase` (primary), `mock` (lightweight local/demo auth).
- **Automation:** 12+ specialized AI Flows for text extraction, sourcing, and analysis.

## Runtime Modes

Note: changing any `NEXT_PUBLIC_*` environment variable requires restarting the dev server/process or **triggering a Redeploy in Vercel** to rebuild client bundles with the new values.

Set `NEXT_PUBLIC_RUNTIME_MODE` to one of:

- `supabase`: uses Supabase Auth and Postgres-backed app data.
- `mock`: uses local browser storage for demo auth and demo data.

### Supabase env vars

When `NEXT_PUBLIC_RUNTIME_MODE=supabase`, define:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Vercel Setup

Recommended: create two Vercel projects from the same repo.

- Demo project:
  - `NEXT_PUBLIC_RUNTIME_MODE=mock`
- Supabase project:
  - `NEXT_PUBLIC_RUNTIME_MODE=supabase`
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

The active app runtime no longer depends on Firebase. Legacy Firebase files may still exist in the repo during cleanup, but the supported deployment modes are `mock` and `supabase`.

## 🔐 User Roles
- **Candidate:** Personal career management.
- **Recruiter:** Candidate sourcing and analysis.
- **Sales:** Client management and revenue tracking.
- **Admin/Developer:** Full system access and AI Model Registry management.

## 🎨 Design System
- **Primary Color:** Professional Blue (#2289C3)
- **Background:** Light Blue Gray (#F0F4F7)
- **Accent:** Teal (#1AA3A3)
- **Typography:** Inter (UI), Source Code Pro (Data).

## 🛠 Developer Setup & AI Workflow

### AI Usage: Prototyper vs. CLI
- **App Prototyper (Chat):** Use this for building UI, connecting databases, and architecting new AI features. It has full context of your files and can apply code changes directly.
- **Gemini/Genkit CLI:** Use this in the terminal for **testing specific flows** (`npm run genkit:dev`), batch processing data, or debugging raw model responses without UI overhead.

### Switching Google Accounts in CLI
If you need to switch the Google account used in the terminal (e.g., from personal to your **Google Business Standard** account) to leverage your business tier limits:

1. **Log in with your Business Account:**
   ```bash
   gcloud auth login --no-launch-browser
   ```
2. **Update Application Default Credentials (ADC):**
   ```bash
   gcloud auth application-default login --no-launch-browser
   ```

### Gemini API Key
If you prefer using an API key from your business account's Google AI Studio:
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create an API key under your business account.
3. Update your `.env` file:
   ```bash
   GOOGLE_GENAI_API_KEY=your_business_account_key_here
   ```

## Security Checks

Run repository secret-pattern scan before release:

```bash
npm run security:secrets
```

The command exits non-zero only when likely secret patterns are found. It intentionally ignores local `.env*` files and focuses on tracked source/docs.
