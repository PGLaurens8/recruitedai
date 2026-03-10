# CODEX_IMPLEMENTATION_SPEC.md
# RecruitedAI Backend Implementation Plan

> **Agent-Ready Specification** - All instructions use precise file paths, code snippets, and deterministic steps for automated execution.

---

## 1. Tech Stack Confirmation

| Layer | Technology | Version / Detail |
|-------|-----------|-----------------|
| Framework | Next.js | 15.3.8 (App Router) |
| Runtime | React | 18.x |
| Language | TypeScript | 5.x |
| Database | Firebase Firestore | v11.9.1 SDK |
| Auth | Firebase Auth | Anonymous + Email/Password |
| AI | Genkit + Google AI | 1.0.0 / Gemini 2.5 Flash |
| UI | shadcn/ui + Radix + Tailwind | |
| ORM | None (Firestore SDK direct) | |
| Hosting | Firebase App Hosting | `apphosting.yaml` present |

### Current Architecture Gaps

1. **No API routes** - All 11 Genkit AI flows are invoked directly from client components. These MUST be wrapped in Next.js Route Handlers for security (API keys, rate limiting).
2. **localStorage abuse** - Master resume data (8 keys) and company branding (5 keys) are stored in `localStorage`. Must migrate to Firestore.
3. **No Firestore Security Rules** - All data access is unprotected.
4. **No signup persistence** - Signup page collects fields but doesn't save to Firestore.
5. **No billing backend** - Payment dialog is a stub with a 2-second `setTimeout`.
6. **No file storage** - Files are converted to data URIs client-side; no Firebase Storage integration.

---

## 2. Data Models

### 2.1 Firestore Collection Map

```
/users/{uid}                                    # User profiles
/companies/{companyId}                          # Company/Agency profiles
/companies/{companyId}/candidates/{candidateId} # Candidate records
/companies/{companyId}/jobs/{jobId}             # Job postings
/companies/{companyId}/clients/{clientId}       # Client/employer records
/companies/{companyId}/resumes/{resumeId}       # Master resumes (NEW)
/companies/{companyId}/interviews/{interviewId} # Interview records (NEW)
/subscriptions/{uid}                            # Billing/plan data (NEW)
/modelRegistry/latest                           # AI model cache
```

### 2.2 TypeScript Interfaces

Create file: **`src/types/models.ts`**

```typescript
import { Timestamp, FieldValue } from "firebase/firestore";

// ─── Roles & Auth ────────────────────────────────────────────
export type Role = "Admin" | "Recruiter" | "Sales" | "Candidate" | "Developer";
export type AccountType = "personal" | "company";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  accountType: AccountType;
  companyId: string;
  plan: "Free" | "Professional" | "Agency";
  onboardingStep: number;
  avatarUrl?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ─── Company / Agency ────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  email?: string;
  address?: string;
  plan: "Free" | "Professional" | "Agency";
  ownerId: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ─── Candidates ──────────────────────────────────────────────
export type CandidateStatus = "Sourced" | "Applied" | "Interviewing" | "Offer" | "Hired" | "Rejected";

export interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  location?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: CandidateStatus;
  aiScore?: number;
  currentJob?: string;
  currentCompany?: string;
  appliedFor?: string;
  fullResumeText?: string;
  skills?: string[];
  contactInfo?: ContactInfo;
  extractedDetails?: ExtractedCVDetails;
  interviewNotes?: Record<string, string>;
  interviewScores?: Record<string, number | null>;
  aiSummary?: string;
  interviewAnalysis?: AnalyzeInterviewOutput;
  lastInterviewAt?: string;
  companyId: string;
  createdBy?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface ExtractedCVDetails {
  role?: string;
  summary?: string;
  noticePeriod?: string;
  salary?: string;
  pcSpecs?: string;
}

// ─── Jobs ────────────────────────────────────────────────────
export type JobStatus = "active" | "pending" | "closed";
export type JobApproval = "approved" | "pending" | "rejected";

export interface Job {
  id: string;
  title: string;
  salary?: string;
  company?: string;
  location?: string;
  status: JobStatus;
  approval: JobApproval;
  description?: string;
  candidates?: number;
  aiMatches?: number;
  companyId: string;
  createdBy?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

// ─── Clients ─────────────────────────────────────────────────
export type ClientStatus = "active" | "prospect" | "on hold" | "inactive";

export interface Client {
  id: string;
  name: string;
  logo?: string;
  contactName?: string;
  contactEmail?: string;
  status: ClientStatus;
  openJobs?: number;
  companyId: string;
  createdBy?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

// ─── Master Resume (NEW - replaces localStorage) ────────────
export interface MasterResume {
  id: string;
  userId: string;
  userTitle: string;
  reformattedText: string;
  fullName?: string;
  currentJobTitle?: string;
  contactInfo?: ContactInfo;
  skills?: string[];
  avatarUri?: string;
  missingInformation?: string[];
  questions?: string[];
  processedAt: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ─── Subscriptions (NEW) ────────────────────────────────────
export type PlanTier = "Free" | "Premium" | "ProAnnual";

export interface Subscription {
  id: string;
  userId: string;
  companyId: string;
  plan: PlanTier;
  status: "active" | "canceled" | "past_due";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Timestamp;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ─── AI Flow Outputs (mirror Zod schemas) ───────────────────
export interface AssessJobMatchOutput {
  matchScore: number;
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
}

export interface TailorResumeOutput {
  tailoredResume: string;
  questions?: string[];
}

export interface GenerateCoverLetterOutput {
  coverLetter: string;
}

export interface ReformatResumeOutput {
  reformattedResume: string;
  fullName?: string;
  currentJobTitle?: string;
  contactInfo?: ContactInfo;
  skills?: string[];
  missingInformation?: string[];
  questions?: string[];
}

export interface AnalyzeInterviewOutput {
  overallAssessment: string;
  candidateName?: string;
  interviewerName?: string;
  questionsAnswers: Array<{ question: string; answer: string }>;
}

export interface AnalyzeInterviewResponseOutput {
  feedback: string;
  score: number;
}

export interface GenerateCandidateProfileOutput {
  profileSummary: string;
}

export interface FindCompaniesOutput {
  companies: Array<{
    companyName: string;
    sampleJobTitle: string;
    reasonForMatch: string;
    website: string;
  }>;
}

export interface Lead {
  fullName: string;
  title: string;
  email: string;
  companyName: string;
  industry: string;
  companySize: string;
}

export interface FindSmartLeadsOutput {
  leads: Lead[];
  insights?: Array<{ companyName: string; insight: string }>;
}

export interface GenerateInterviewQuestionsOutput {
  questions: string[];
}
```

---

## 3. Route Map - API Endpoints

All routes use Next.js App Router Route Handlers at `src/app/api/`.

### 3.1 AI Flow Endpoints

| # | File Path | Method | Purpose |
|---|-----------|--------|---------|
| 1 | `src/app/api/ai/reformat-resume/route.ts` | POST | Reformat/parse uploaded resume |
| 2 | `src/app/api/ai/extract-cv-data/route.ts` | POST | Extract structured CV fields |
| 3 | `src/app/api/ai/assess-job-match/route.ts` | POST | Score resume against job spec |
| 4 | `src/app/api/ai/tailor-resume/route.ts` | POST | Tailor resume to job spec |
| 5 | `src/app/api/ai/generate-cover-letter/route.ts` | POST | Generate cover letter |
| 6 | `src/app/api/ai/generate-interview-questions/route.ts` | POST | Generate 5 interview questions |
| 7 | `src/app/api/ai/analyze-interview-response/route.ts` | POST | Score single interview answer |
| 8 | `src/app/api/ai/analyze-interview/route.ts` | POST | Analyze full interview transcript |
| 9 | `src/app/api/ai/generate-candidate-profile/route.ts` | POST | Generate screening summary |
| 10 | `src/app/api/ai/find-companies/route.ts` | POST | Find matching companies |
| 11 | `src/app/api/ai/find-smart-leads/route.ts` | POST | Find sales leads |
| 12 | `src/app/api/ai/list-models/route.ts` | GET | List available AI models |

### 3.2 CRUD Endpoints

| # | File Path | Methods | Purpose |
|---|-----------|---------|---------|
| 13 | `src/app/api/auth/signup/route.ts` | POST | Register user + create profile |
| 14 | `src/app/api/users/[uid]/route.ts` | GET, PATCH | Read/update user profile |
| 15 | `src/app/api/companies/[companyId]/route.ts` | GET, PATCH | Read/update company |
| 16 | `src/app/api/companies/[companyId]/candidates/route.ts` | GET, POST | List/create candidates |
| 17 | `src/app/api/companies/[companyId]/candidates/[id]/route.ts` | GET, PATCH, DELETE | Candidate CRUD |
| 18 | `src/app/api/companies/[companyId]/jobs/route.ts` | GET, POST | List/create jobs |
| 19 | `src/app/api/companies/[companyId]/jobs/[id]/route.ts` | GET, PATCH, DELETE | Job CRUD |
| 20 | `src/app/api/companies/[companyId]/clients/route.ts` | GET, POST | List/create clients |
| 21 | `src/app/api/companies/[companyId]/clients/[id]/route.ts` | GET, PATCH, DELETE | Client CRUD |
| 22 | `src/app/api/resumes/route.ts` | GET, POST | List/save master resume |
| 23 | `src/app/api/resumes/[id]/route.ts` | GET, PATCH, DELETE | Resume CRUD |
| 24 | `src/app/api/billing/checkout/route.ts` | POST | Create Stripe checkout session |
| 25 | `src/app/api/billing/webhook/route.ts` | POST | Stripe webhook handler |
| 26 | `src/app/api/billing/subscription/route.ts` | GET | Get current subscription |
| 27 | `src/app/api/seed/route.ts` | POST | Dev-only: seed demo data |

---

## 4. Logic Details - Per Route

### 4.1 AI Flow Routes

Each AI route follows an identical pattern. Create a shared helper first.

#### Helper: `src/lib/api-helpers.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";

initAdmin();

/** Verify Firebase ID token from Authorization header */
export async function verifyAuth(req: NextRequest): Promise<{ uid: string; email?: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

/** Standard error response */
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
```

#### Helper: `src/lib/firebase-admin.ts`

```typescript
import { initializeApp, getApps, cert, App } from "firebase-admin/app";

let adminApp: App;

export function initAdmin(): App {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  // Firebase App Hosting auto-injects credentials
  adminApp = initializeApp();
  return adminApp;
}
```

---

#### Route 1: `src/app/api/ai/reformat-resume/route.ts`

```
POST /api/ai/reformat-resume
```

**Input** (JSON body):
```json
{
  "resumeDataUri": "data:application/pdf;base64,..." // required
}
```

**Output** (200):
```json
{
  "reformattedResume": "string",
  "fullName": "string | null",
  "currentJobTitle": "string | null",
  "contactInfo": { "email": "...", "phone": "...", "linkedin": "...", "location": "..." },
  "skills": ["string"],
  "missingInformation": ["string"],
  "questions": ["string"]
}
```

**Logic**:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, errorResponse } from "@/lib/api-helpers";
import { reformatResume } from "@/ai/flows/reformat-resume";

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  if (!body.resumeDataUri) return errorResponse("resumeDataUri is required", 400);

  const result = await reformatResume({ resumeDataUri: body.resumeDataUri });
  return NextResponse.json(result);
}
```

---

#### Route 2: `src/app/api/ai/extract-cv-data/route.ts`

```
POST /api/ai/extract-cv-data
```

**Input**:
```json
{ "resumeDataUri": "data:...;base64,..." }
```

**Output** (200):
```json
{
  "name": "string",
  "role": "string",
  "noticePeriod": "string",
  "salary": "string",
  "pcSpecs": "string",
  "summary": "string"
}
```

**Logic**: Same pattern as Route 1 but calls `extractCVData()`.

---

#### Route 3: `src/app/api/ai/assess-job-match/route.ts`

```
POST /api/ai/assess-job-match
```

**Input**:
```json
{
  "masterResumeDataUri": "data:...;base64,...",
  "jobSpecDataUri": "data:...;base64,...",   // optional
  "jobSpecText": "string"                     // optional - one of these two required
}
```

**Output** (200):
```json
{
  "matchScore": 85,
  "summary": "Strong match...",
  "strengths": ["React experience", "..."],
  "areasForImprovement": ["Missing AWS cert", "..."]
}
```

**Validation**: Must provide either `jobSpecDataUri` OR `jobSpecText`.

---

#### Route 4: `src/app/api/ai/tailor-resume/route.ts`

```
POST /api/ai/tailor-resume
```

**Input**:
```json
{
  "masterResumeDataUri": "data:...;base64,...",
  "jobSpecDataUri": "data:...;base64,...",
  "jobSpecText": "string"
}
```

**Output** (200):
```json
{
  "tailoredResume": "string (human-readable)",
  "questions": ["string"]
}
```

---

#### Route 5: `src/app/api/ai/generate-cover-letter/route.ts`

```
POST /api/ai/generate-cover-letter
```

**Input**:
```json
{
  "masterResumeDataUri": "data:...;base64,...",
  "jobSpecDataUri": "data:...;base64,...",
  "jobSpecText": "string",
  "companyName": "string",
  "jobTitle": "string",
  "tailoredResumeText": "string"
}
```

**Output** (200):
```json
{ "coverLetter": "string (3-4 paragraphs)" }
```

---

#### Route 6: `src/app/api/ai/generate-interview-questions/route.ts`

```
POST /api/ai/generate-interview-questions
```

**Input**:
```json
{ "jobSpecText": "string" }
```

**Output** (200):
```json
{ "questions": ["Q1", "Q2", "Q3", "Q4", "Q5"] }
```

---

#### Route 7: `src/app/api/ai/analyze-interview-response/route.ts`

```
POST /api/ai/analyze-interview-response
```

**Input**:
```json
{
  "question": "Tell me about a time...",
  "answer": "In my previous role..."
}
```

**Output** (200):
```json
{
  "feedback": "Your answer demonstrated...",
  "score": 7
}
```

---

#### Route 8: `src/app/api/ai/analyze-interview/route.ts`

```
POST /api/ai/analyze-interview
```

**Input**:
```json
{ "transcript": "Interviewer: ... Candidate: ..." }
```

**Output** (200):
```json
{
  "interviewerName": "string | null",
  "candidateName": "string | null",
  "overallAssessment": "string",
  "questionsAnswers": [
    { "question": "string", "answer": "string" }
  ]
}
```

---

#### Route 9: `src/app/api/ai/generate-candidate-profile/route.ts`

```
POST /api/ai/generate-candidate-profile
```

**Input**:
```json
{
  "candidateName": "string",
  "candidateRole": "string",
  "interviewNotes": "string"
}
```

**Output** (200):
```json
{ "profileSummary": "string (2-4 paragraphs)" }
```

---

#### Route 10: `src/app/api/ai/find-companies/route.ts`

```
POST /api/ai/find-companies
```

**Input**:
```json
{
  "resumeDataUri": "data:...;base64,...",
  "keySkills": "React, Node.js, AWS"
}
```

**Output** (200):
```json
{
  "companies": [
    {
      "companyName": "TechCorp",
      "sampleJobTitle": "Senior Developer",
      "reasonForMatch": "...",
      "website": "https://..."
    }
  ]
}
```

**Validation**: Must provide either `resumeDataUri` OR `keySkills`.

---

#### Route 11: `src/app/api/ai/find-smart-leads/route.ts`

```
POST /api/ai/find-smart-leads
```

**Input**:
```json
{
  "industry": "Fintech",
  "companySize": "51-200",
  "location": "Johannesburg",
  "targetRole": "VP of Engineering",
  "companyName": "string",
  "companyWebsite": "https://..."
}
```

**Output** (200):
```json
{
  "leads": [
    {
      "fullName": "string",
      "title": "string",
      "email": "string",
      "companyName": "string",
      "industry": "string",
      "companySize": "string"
    }
  ],
  "insights": [
    { "companyName": "string", "insight": "string" }
  ]
}
```

**Validation**: At least one search criterion required.

---

#### Route 12: `src/app/api/ai/list-models/route.ts`

```
GET /api/ai/list-models
```

**Input**: None

**Output** (200):
```json
{
  "models": [
    {
      "name": "string",
      "displayName": "string",
      "description": "string",
      "supportedGenerationMethods": ["string"]
    }
  ]
}
```

---

### 4.2 Auth & User Routes

#### Route 13: `src/app/api/auth/signup/route.ts`

```
POST /api/auth/signup
```

**Input**:
```json
{
  "email": "user@example.com",
  "password": "securePass123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "Candidate",
  "accountType": "personal",
  "companyName": "Acme Inc"
}
```

**Output** (201):
```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "companyId": "generated-company-id"
}
```

**Logic**:
1. Create Firebase Auth user with `createUser()` (firebase-admin)
2. If `accountType === "company"`, create doc in `/companies/{newId}` with `companyName`
3. Create doc in `/users/{uid}` with all profile fields, linking `companyId`
4. If `accountType === "personal"`, assign `companyId = "personal-{uid}"`
5. Return uid + companyId

---

#### Route 14: `src/app/api/users/[uid]/route.ts`

```
GET  /api/users/{uid}     → Returns UserProfile
PATCH /api/users/{uid}    → Updates UserProfile (partial)
```

**GET Output**:
```json
{
  "id": "uid",
  "email": "...",
  "name": "...",
  "role": "Candidate",
  "companyId": "...",
  "plan": "Free",
  "onboardingStep": 1,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**PATCH Input** (partial):
```json
{
  "name": "New Name",
  "role": "Recruiter",
  "avatarUrl": "https://...",
  "onboardingStep": 2
}
```

**Auth**: Token UID must match `[uid]` param OR user must be Admin.

---

#### Route 15: `src/app/api/companies/[companyId]/route.ts`

```
GET   /api/companies/{companyId}   → Returns Company
PATCH /api/companies/{companyId}   → Updates Company (branding, etc.)
```

**PATCH Input** (replaces localStorage company branding):
```json
{
  "name": "RecruitedAI Agency",
  "logo": "https://...",
  "website": "https://...",
  "email": "contact@agency.com",
  "address": "123 Main St"
}
```

**Auth**: User must belong to this company (verified via `users/{uid}.companyId`).

---

### 4.3 Resource CRUD Routes

All resource routes follow this pattern:

#### Routes 16-17: Candidates

**`GET /api/companies/{companyId}/candidates`**
- Returns all candidates for the company
- Query params: `?status=Sourced&sort=aiScore&order=desc`

**`POST /api/companies/{companyId}/candidates`**
- Input: Candidate object (without `id`, `companyId`, `createdAt`)
- Output: `{ id: "new-doc-id" }`
- Sets `companyId` from URL param, `createdBy` from token, `createdAt` via `serverTimestamp()`

**`GET /api/companies/{companyId}/candidates/{id}`**
- Returns single candidate

**`PATCH /api/companies/{companyId}/candidates/{id}`**
- Partial update (status change, interview notes, AI summary, etc.)

**`DELETE /api/companies/{companyId}/candidates/{id}`**
- Deletes candidate doc

---

#### Routes 18-19: Jobs

**`GET /api/companies/{companyId}/jobs`**
- Query params: `?status=active&approval=pending`

**`POST /api/companies/{companyId}/jobs`**
- Input: Job object (title, salary, location, description, status, approval)

**`PATCH /api/companies/{companyId}/jobs/{id}`**
- Partial update (approval workflow: `{ "approval": "approved" }`)

**`DELETE /api/companies/{companyId}/jobs/{id}`**

---

#### Routes 20-21: Clients

**`GET /api/companies/{companyId}/clients`**
- Query params: `?status=active`

**`POST /api/companies/{companyId}/clients`**
- Input: Client object (name, contactName, contactEmail, status)

**`PATCH /api/companies/{companyId}/clients/{id}`**

**`DELETE /api/companies/{companyId}/clients/{id}`**

---

#### Routes 22-23: Master Resumes (NEW - replaces localStorage)

**`GET /api/resumes`**
- Returns resumes for authenticated user (filtered by `userId` from token)

**`POST /api/resumes`**
- Input: MasterResume object
- Stores in `/companies/{companyId}/resumes/{newId}`

**`GET /api/resumes/{id}`**

**`PATCH /api/resumes/{id}`**
- Partial update (title, text, avatar)

**`DELETE /api/resumes/{id}`**

---

### 4.4 Billing Routes

#### Route 24: `src/app/api/billing/checkout/route.ts`

```
POST /api/billing/checkout
```

**Input**:
```json
{
  "planId": "Premium",
  "successUrl": "https://app.recruited.ai/billing?success=true",
  "cancelUrl": "https://app.recruited.ai/billing?canceled=true"
}
```

**Output** (200):
```json
{ "checkoutUrl": "https://checkout.stripe.com/..." }
```

**Logic**: Creates Stripe Checkout Session. Requires `STRIPE_SECRET_KEY` env var.

---

#### Route 25: `src/app/api/billing/webhook/route.ts`

```
POST /api/billing/webhook
```

**Input**: Raw Stripe webhook payload (not JSON-parsed)

**Logic**:
1. Verify Stripe signature using `STRIPE_WEBHOOK_SECRET`
2. Handle events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Update `/subscriptions/{uid}` and `/users/{uid}.plan` accordingly

**Auth**: Stripe signature verification (no Firebase auth).

---

#### Route 26: `src/app/api/billing/subscription/route.ts`

```
GET /api/billing/subscription
```

**Output** (200):
```json
{
  "plan": "Premium",
  "status": "active",
  "currentPeriodEnd": "2026-04-07T00:00:00Z"
}
```

---

#### Route 27: `src/app/api/seed/route.ts`

```
POST /api/seed
```

**Auth**: Developer role only.

**Logic**: Seeds demo data into Firestore (candidates, jobs, clients) for the user's company. Mirrors the existing `SEED_DATA` in `src/app/settings/page.tsx`.

---

## 5. Firestore Security Rules

Create file: **`firestore.rules`**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if user is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Helper: get user profile
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // Helper: check user belongs to company
    function belongsToCompany(companyId) {
      return isAuth() && getUserData().companyId == companyId;
    }

    // Helper: check role
    function hasRole(role) {
      return isAuth() && getUserData().role == role;
    }

    function hasAnyRole(roles) {
      return isAuth() && getUserData().role in roles;
    }

    // Users collection
    match /users/{uid} {
      allow read: if isAuth() && (request.auth.uid == uid || hasAnyRole(['Admin', 'Developer']));
      allow create: if isAuth() && request.auth.uid == uid;
      allow update: if isAuth() && (request.auth.uid == uid || hasAnyRole(['Admin', 'Developer']));
      allow delete: if false;
    }

    // Companies
    match /companies/{companyId} {
      allow read: if belongsToCompany(companyId);
      allow update: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Developer']);
      allow create: if isAuth();
      allow delete: if false;

      // Candidates subcollection
      match /candidates/{candidateId} {
        allow read: if belongsToCompany(companyId);
        allow create: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Recruiter', 'Developer']);
        allow update: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Recruiter', 'Developer']);
        allow delete: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Developer']);
      }

      // Jobs subcollection
      match /jobs/{jobId} {
        allow read: if belongsToCompany(companyId);
        allow create: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
        allow update: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
        allow delete: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Developer']);
      }

      // Clients subcollection
      match /clients/{clientId} {
        allow read: if belongsToCompany(companyId);
        allow create: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Sales', 'Developer']);
        allow update: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Sales', 'Developer']);
        allow delete: if belongsToCompany(companyId) && hasAnyRole(['Admin', 'Developer']);
      }

      // Resumes subcollection
      match /resumes/{resumeId} {
        allow read: if belongsToCompany(companyId);
        allow create: if belongsToCompany(companyId);
        allow update: if belongsToCompany(companyId) && resource.data.userId == request.auth.uid;
        allow delete: if belongsToCompany(companyId) && resource.data.userId == request.auth.uid;
      }
    }

    // Subscriptions
    match /subscriptions/{uid} {
      allow read: if isAuth() && request.auth.uid == uid;
      allow write: if false; // Server-only via Admin SDK
    }

    // Model Registry
    match /modelRegistry/{docId} {
      allow read: if isAuth();
      allow write: if hasAnyRole(['Admin', 'Developer']);
    }
  }
}
```

---

## 6. Environment Variables

Create/update: **`.env.local`**

```bash
# Firebase (already configured via App Hosting, but needed for local dev)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBruvt6pO5DW38eShuv8U6-B3pBkBPWBWI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=studio-6739586953-52e1c.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-6739586953-52e1c
NEXT_PUBLIC_FIREBASE_APP_ID=1:166018757600:web:5f868945e7dc94e22ef185

# Google AI (Genkit)
GOOGLE_GENAI_API_KEY=<your-key>

# Stripe (billing)
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-signing-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>

# Firebase Admin (auto-injected in App Hosting; needed for local)
GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account.json>
```

---

## 7. Execution Order

### Phase 1: Foundation (Types + Helpers)

```bash
# Step 1: Create shared types
# CREATE: src/types/models.ts
# (contents from Section 2.2 above)

# Step 2: Install firebase-admin
npm install firebase-admin

# Step 3: Create Firebase Admin helper
# CREATE: src/lib/firebase-admin.ts
# (contents from Section 4.1 above)

# Step 4: Create API helper utilities
# CREATE: src/lib/api-helpers.ts
# (contents from Section 4.1 above)
```

### Phase 2: AI API Routes

```bash
# Step 5: Create all 12 AI route handlers
# CREATE: src/app/api/ai/reformat-resume/route.ts
# CREATE: src/app/api/ai/extract-cv-data/route.ts
# CREATE: src/app/api/ai/assess-job-match/route.ts
# CREATE: src/app/api/ai/tailor-resume/route.ts
# CREATE: src/app/api/ai/generate-cover-letter/route.ts
# CREATE: src/app/api/ai/generate-interview-questions/route.ts
# CREATE: src/app/api/ai/analyze-interview-response/route.ts
# CREATE: src/app/api/ai/analyze-interview/route.ts
# CREATE: src/app/api/ai/generate-candidate-profile/route.ts
# CREATE: src/app/api/ai/find-companies/route.ts
# CREATE: src/app/api/ai/find-smart-leads/route.ts
# CREATE: src/app/api/ai/list-models/route.ts
```

Each AI route follows the template:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, errorResponse } from "@/lib/api-helpers";
import { <flowFunction> } from "@/ai/flows/<flow-file>";

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  // Validate required fields...
  const result = await <flowFunction>(body);
  return NextResponse.json(result);
}
```

### Phase 3: Auth & User Routes

```bash
# Step 6: Create auth route
# CREATE: src/app/api/auth/signup/route.ts

# Step 7: Create user profile route
# CREATE: src/app/api/users/[uid]/route.ts

# Step 8: Create company route
# CREATE: src/app/api/companies/[companyId]/route.ts
```

### Phase 4: Resource CRUD Routes

```bash
# Step 9: Candidates CRUD
# CREATE: src/app/api/companies/[companyId]/candidates/route.ts
# CREATE: src/app/api/companies/[companyId]/candidates/[id]/route.ts

# Step 10: Jobs CRUD
# CREATE: src/app/api/companies/[companyId]/jobs/route.ts
# CREATE: src/app/api/companies/[companyId]/jobs/[id]/route.ts

# Step 11: Clients CRUD
# CREATE: src/app/api/companies/[companyId]/clients/route.ts
# CREATE: src/app/api/companies/[companyId]/clients/[id]/route.ts

# Step 12: Resumes CRUD (replaces localStorage)
# CREATE: src/app/api/resumes/route.ts
# CREATE: src/app/api/resumes/[id]/route.ts
```

### Phase 5: Billing

```bash
# Step 13: Install Stripe
npm install stripe

# Step 14: Create billing routes
# CREATE: src/app/api/billing/checkout/route.ts
# CREATE: src/app/api/billing/webhook/route.ts
# CREATE: src/app/api/billing/subscription/route.ts
```

### Phase 6: Security Rules & Seed

```bash
# Step 15: Deploy Firestore security rules
# CREATE: firestore.rules
# (contents from Section 5 above)

# Step 16: Create seed route (dev only)
# CREATE: src/app/api/seed/route.ts
```

### Phase 7: Client-Side Migration

```bash
# Step 17: Create API client helper
# CREATE: src/lib/api-client.ts
```

**`src/lib/api-client.ts`** - Thin wrapper for calling API routes with auth token:

```typescript
import { getAuth } from "firebase/auth";

async function getIdToken(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

export async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(path, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const token = await getIdToken();
  const res = await fetch(path, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
}
```

```bash
# Step 18: Update page components to use API routes instead of direct Genkit calls
# EDIT: src/app/targeted-resume/page.tsx     → replace direct flow calls with apiPost("/api/ai/...")
# EDIT: src/app/master-resume/page.tsx        → replace direct flow calls with apiPost("/api/ai/...")
# EDIT: src/app/interview-prep/page.tsx       → replace direct flow calls with apiPost("/api/ai/...")
# EDIT: src/app/interview-analysis/page.tsx   → replace direct flow calls with apiPost("/api/ai/...")
# EDIT: src/app/candidate-profiles/page.tsx   → replace direct flow calls with apiPost("/api/ai/...")
# EDIT: src/app/company-finder/page.tsx       → replace direct flow calls with apiPost("/api/ai/...")
# EDIT: src/app/ai-parser/page.tsx            → replace direct flow calls with apiPost("/api/ai/...")
# EDIT: src/app/debug/models/page.tsx         → replace direct flow call with apiGet("/api/ai/list-models")
# EDIT: src/app/settings/page.tsx             → replace direct flow call with apiGet("/api/ai/list-models")

# Step 19: Migrate localStorage to Firestore-backed API calls
# EDIT: src/app/master-resume/page.tsx        → save to /api/resumes on process
# EDIT: src/app/targeted-resume/page.tsx      → load from /api/resumes instead of localStorage
# EDIT: src/app/online-resume/page.tsx        → load from /api/resumes instead of localStorage
# EDIT: src/app/linktree-bio/page.tsx         → load from /api/resumes instead of localStorage
# EDIT: src/app/profile/page.tsx              → save/load company branding via /api/companies/{companyId}
# EDIT: src/app/ai-parser/page.tsx            → load company branding via /api/companies/{companyId}
# EDIT: src/app/interview-analysis/page.tsx   → load company branding via /api/companies/{companyId}

# Step 20: Update signup page to call API
# EDIT: src/app/signup/page.tsx               → call /api/auth/signup instead of placeholder

# Step 21: Update billing page to use Stripe
# EDIT: src/app/billing/page.tsx              → call /api/billing/checkout
# EDIT: src/components/feature/payment-dialog.tsx → integrate with Stripe Checkout
```

### Phase 8: Verification

```bash
# Step 22: Type-check the entire project
npx tsc --noEmit

# Step 23: Run dev server and verify
npm run dev

# Step 24: Test each API route
# Use curl or the app UI to verify:
# - POST /api/ai/reformat-resume with a PDF data URI
# - POST /api/ai/assess-job-match with resume + job spec
# - GET /api/billing/subscription
# - POST /api/auth/signup with test credentials
# - GET /api/companies/{companyId}/candidates
```

---

## 8. File Creation Checklist

| # | Action | File Path | Status |
|---|--------|-----------|--------|
| 1 | CREATE | `src/types/models.ts` | [ ] |
| 2 | CREATE | `src/lib/firebase-admin.ts` | [ ] |
| 3 | CREATE | `src/lib/api-helpers.ts` | [ ] |
| 4 | CREATE | `src/lib/api-client.ts` | [ ] |
| 5 | CREATE | `src/app/api/ai/reformat-resume/route.ts` | [ ] |
| 6 | CREATE | `src/app/api/ai/extract-cv-data/route.ts` | [ ] |
| 7 | CREATE | `src/app/api/ai/assess-job-match/route.ts` | [ ] |
| 8 | CREATE | `src/app/api/ai/tailor-resume/route.ts` | [ ] |
| 9 | CREATE | `src/app/api/ai/generate-cover-letter/route.ts` | [ ] |
| 10 | CREATE | `src/app/api/ai/generate-interview-questions/route.ts` | [ ] |
| 11 | CREATE | `src/app/api/ai/analyze-interview-response/route.ts` | [ ] |
| 12 | CREATE | `src/app/api/ai/analyze-interview/route.ts` | [ ] |
| 13 | CREATE | `src/app/api/ai/generate-candidate-profile/route.ts` | [ ] |
| 14 | CREATE | `src/app/api/ai/find-companies/route.ts` | [ ] |
| 15 | CREATE | `src/app/api/ai/find-smart-leads/route.ts` | [ ] |
| 16 | CREATE | `src/app/api/ai/list-models/route.ts` | [ ] |
| 17 | CREATE | `src/app/api/auth/signup/route.ts` | [ ] |
| 18 | CREATE | `src/app/api/users/[uid]/route.ts` | [ ] |
| 19 | CREATE | `src/app/api/companies/[companyId]/route.ts` | [ ] |
| 20 | CREATE | `src/app/api/companies/[companyId]/candidates/route.ts` | [ ] |
| 21 | CREATE | `src/app/api/companies/[companyId]/candidates/[id]/route.ts` | [ ] |
| 22 | CREATE | `src/app/api/companies/[companyId]/jobs/route.ts` | [ ] |
| 23 | CREATE | `src/app/api/companies/[companyId]/jobs/[id]/route.ts` | [ ] |
| 24 | CREATE | `src/app/api/companies/[companyId]/clients/route.ts` | [ ] |
| 25 | CREATE | `src/app/api/companies/[companyId]/clients/[id]/route.ts` | [ ] |
| 26 | CREATE | `src/app/api/resumes/route.ts` | [ ] |
| 27 | CREATE | `src/app/api/resumes/[id]/route.ts` | [ ] |
| 28 | CREATE | `src/app/api/billing/checkout/route.ts` | [ ] |
| 29 | CREATE | `src/app/api/billing/webhook/route.ts` | [ ] |
| 30 | CREATE | `src/app/api/billing/subscription/route.ts` | [ ] |
| 31 | CREATE | `src/app/api/seed/route.ts` | [ ] |
| 32 | CREATE | `firestore.rules` | [ ] |
| 33 | EDIT | `src/app/targeted-resume/page.tsx` | [ ] |
| 34 | EDIT | `src/app/master-resume/page.tsx` | [ ] |
| 35 | EDIT | `src/app/interview-prep/page.tsx` | [ ] |
| 36 | EDIT | `src/app/interview-analysis/page.tsx` | [ ] |
| 37 | EDIT | `src/app/candidate-profiles/page.tsx` | [ ] |
| 38 | EDIT | `src/app/company-finder/page.tsx` | [ ] |
| 39 | EDIT | `src/app/ai-parser/page.tsx` | [ ] |
| 40 | EDIT | `src/app/debug/models/page.tsx` | [ ] |
| 41 | EDIT | `src/app/settings/page.tsx` | [ ] |
| 42 | EDIT | `src/app/signup/page.tsx` | [ ] |
| 43 | EDIT | `src/app/billing/page.tsx` | [ ] |
| 44 | EDIT | `src/app/online-resume/page.tsx` | [ ] |
| 45 | EDIT | `src/app/linktree-bio/page.tsx` | [ ] |
| 46 | EDIT | `src/app/profile/page.tsx` | [ ] |
| 47 | EDIT | `src/components/feature/payment-dialog.tsx` | [ ] |
| 48 | INSTALL | `firebase-admin` | [ ] |
| 49 | INSTALL | `stripe` | [ ] |

---

## 9. Dependency Install Commands

```bash
npm install firebase-admin stripe
```

No other new dependencies are needed - the project already includes all required packages (Next.js, Firebase client SDK, Genkit, Zod, etc.).
