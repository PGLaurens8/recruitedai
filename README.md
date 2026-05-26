# RecruitedAI

> **AI-powered CV screening and recruitment tools that understand skills — not just keywords.**

RecruitedAI is a dual-purpose recruitment platform for **independent recruiters, agencies, and job seekers** who need faster, smarter, and fairer candidate screening. Built with Next.js 15, Supabase, and Gemini AI via Genkit.

🚀 **[Live App](https://recruitedai.vercel.app)** · 📋 **[Request Demo Access](mailto:pglaurens@outlook.com)**

---

## The Problem It Solves

Recruiters screening 80+ CVs for a single role spend most of their time on a broken process:

- ATS keyword matching surfaces keyword-stuffers and misses qualified candidates who describe their experience differently
- Scoring systems feel like a black box — no explanation for why a candidate ranked where they did
- Manual review at volume is brutal — 10–15 seconds per CV means good people get missed
- Most AI tools on the market are just ChatGPT wrappers over the same keyword logic

RecruitedAI addresses this with genuine AI understanding of skills, experience, and context — and shows you *why* each candidate ranked where they did.

---

## Core Features

### For Recruiters & Agencies

- **Smart CV Parser & Scorer** — AI extraction and scoring of candidate skills, experience, and seniority against a specific job description. Ranks candidates with plain-language explanations, not just a number
- **Skills-First Screening** — evaluates demonstrated skills and real-world experience; treats education as one signal among many rather than a gate. Built for skills-based hiring
- **Branded CV Generator** — produce professional PDF CVs with agency branding for client submission
- **Interview Transcript Analysis** — automated extraction of structured Q&A and candidate insights from raw interview transcripts
- **Smart Lead Finder** — AI-powered sourcing for companies actively hiring and decision-maker contact details
- **Pipeline Reporting** — placement performance analytics and sales pipeline tracking

### For Candidates

- **Master Resume Builder** — AI-driven reformatting, gap analysis, and professional restructuring of your core CV
- **Targeted Resume Tailoring** — real-time tailoring of your CV to a specific job description, maximising relevance without keyword stuffing
- **Interview Preparation** — voice-enabled mock interviews with AI coaching and scoring
- **Online Presence** — shareable online resume and professional bio page

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 18, Tailwind CSS, ShadCN UI, Radix UI |
| AI Engine | Genkit 1.0 · Gemini via `@genkit-ai/google-genai` |
| Backend / Database | Supabase (PostgreSQL, Auth, RLS) |
| API Layer | Next.js API Routes · `src/server/api/` |
| Auth | Supabase SSR Auth with role-based access control |
| Rate Limiting | Upstash Redis |
| Document Generation | docx · jsPDF · html2canvas |
| Testing | Vitest (unit) · Playwright (e2e) |
| CI/CD | GitHub Actions · Vercel (69+ production deployments) |
| Validation | Zod |

---

## User Roles & Access

| Role | Access |
|---|---|
| **Candidate** | Personal career tools — CV builder, tailoring, interview prep, online profile |
| **Recruiter** | Full screening suite — CV scoring, branded PDFs, transcript analysis, lead finder |
| **Agency Admin** | Multi-seat management, team reporting, branding configuration |
| **Admin / Developer** | Full system access, AI model configuration, seed data management |

---

## Architecture

- **Multi-tenant** — agencies and their recruiters operate in isolated data contexts
- **RBAC middleware** — role-based access enforced at both API and UI layer
- **AI Flows** — 12+ specialised Genkit AI flows for extraction, scoring, sourcing, and analysis
- **Supabase RLS** — row-level security policies ensure data isolation across tenants

---

## Roadmap

**In progress / planned:**

- [ ] Semantic CV search using vector embeddings (RAG pipeline with PGVector)
- [ ] Explainable scoring breakdown — per-skill match/gap visibility
- [ ] Skills vs degree weighting toggle — explicit skills-first mode for companies moving away from degree requirements
- [ ] ATS-agnostic bulk import — CSV/export compatibility with major ATS platforms
- [ ] Candidate feedback loop — recruiter accept/reject signals feed back into scoring model

---

## Why No ATS Integration (Yet)?

RecruitedAI is intentionally standalone. Recruiters export CVs from their existing ATS, run them through RecruitedAI for intelligent screening, and take the ranked results back. No IT approval. No 6-month procurement process. No integration required.

This works alongside Workday, Greenhouse, Lever, Zoho Recruit, Bullhorn, or a spreadsheet — whatever you already use.

---

## Status

RecruitedAI is in **active development** and available for **beta testing**.

If you're a recruiter, hiring manager, or agency owner and want early access in exchange for honest feedback — reach out directly.

📩 **pglaurens@outlook.com**
🔗 **[linkedin.com/in/pg-laurens-87783b199](https://linkedin.com/in/pg-laurens-87783b199)**

---

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase and Gemini API keys

# Run development server
npm run dev
# App runs on http://localhost:9002

# Run AI flows (separate terminal)
npm run genkit:dev

# Run unit tests
npm test

# Run e2e tests
npm run test:e2e:smoke
```

---

## Built By

**PG Laurens** — Senior Data & AI Engineer, South Africa
15+ years across data engineering, AI integration, and SaaS product development.

Currently also building: [Altivo](https://altivo.co.za) · Adminless · QuantEasy
