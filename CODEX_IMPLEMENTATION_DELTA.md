# CODEX_IMPLEMENTATION_DELTA.md
# Corrective Overrides for CODEX_IMPLEMENTATION_SPEC.md

> This document SUPERSEDES conflicting sections of the original spec.
> Where this file is silent, the original spec remains valid.

---

## A. Final Architectural Decisions

| Decision | Original Spec (WRONG) | Corrected |
|----------|-----------------------|-----------|
| Auth | Firebase Auth (Anonymous + Email/Password) | **Supabase Auth** (Email/Password + OAuth) |
| Database | Firestore (NoSQL, subcollections) | **Supabase Postgres** (relational, RLS) |
| ORM | None (Firestore SDK direct) | **Supabase JS client** (`@supabase/supabase-js`) |
| Admin SDK | `firebase-admin` | **Supabase service-role key** (server-side only) |
| Security | `firestore.rules` | **Postgres RLS policies** |
| Auth middleware | None (manual Bearer token) | **`@supabase/ssr`** Next.js middleware |
| Client auth | `getAuth().currentUser.getIdToken()` | **Supabase session cookies** (automatic via `@supabase/ssr`) |
| AI flows | Genkit + Gemini 2.5 Flash | **UNCHANGED** - keep all 11 flows + 1 tool as-is |
| Hosting | Firebase App Hosting | Decision deferred - does not affect backend code |
| Router | Next.js App Router (`src/app/api/`) | **UNCHANGED** - all routes under `src/app/api/` |

**Delete from spec**: Section 5 (Firestore Security Rules), `src/lib/firebase-admin.ts`, `firestore.rules`.
**Delete from installs**: `firebase-admin`. Replace with `@supabase/supabase-js @supabase/ssr`.

---

## B. Final Canonical Table Names

The original spec used Firestore subcollection names. These are the Postgres table names. No aliases.

| Table | PK | Tenant FK | Notes |
|-------|----|-----------|-------|
| `profiles` | `id` (uuid, = `auth.uid()`) | `company_id` | Replaces Firestore `/users/{uid}` |
| `companies` | `id` (uuid) | - | Replaces `/companies/{companyId}` |
| `candidates` | `id` (uuid) | `company_id` | Not "cvs". Stores parsed resume data inline as JSONB |
| `jobs` | `id` (uuid) | `company_id` | |
| `clients` | `id` (uuid) | `company_id` | Employer/client orgs, not "accounts" |
| `master_resumes` | `id` (uuid) | `user_id` + `company_id` | Not "resumes" or "cv_versions". One active per user |
| `subscriptions` | `id` (uuid) | `user_id` | Stripe integration. Server-write only |

**There is no `cvs`, `master_cvs`, or `cv_versions` table.** The `candidates` table holds parsed CV data in JSONB columns. The `master_resumes` table holds the user's own resume.

---

## C. Final Canonical Auth Approach

### Install
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Files to create

**`src/lib/supabase/client.ts`** - Browser client (used in client components):
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`src/lib/supabase/server.ts`** - Server client (used in route handlers + server components):
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**`src/lib/supabase/admin.ts`** - Service-role client (server-only, bypasses RLS):
```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

**`src/middleware.ts`** - Auth session refresh (required by `@supabase/ssr`):
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

### Corrected `src/lib/api-helpers.ts`

Replaces the Firebase version entirely:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getAuthUser(req?: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { uid: user.id, email: user.email };
}

export async function getAuthProfile() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return profile;
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
```

### Corrected `src/lib/api-client.ts`

No Bearer token needed. Supabase cookies are sent automatically:
```typescript
export async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
}
```

---

## D. Final Canonical Route Structure

The original spec's route map is correct for App Router (`src/app/api/`). No `pages/api` anywhere.

**One correction**: The auth signup route is unnecessary. Supabase handles signup client-side via `supabase.auth.signUp()`. Replace it with a **profile-creation callback**.

| # | Original Route | Action |
|---|----------------|--------|
| 13 | `src/app/api/auth/signup/route.ts` | **DELETE**. Replace with `src/app/api/auth/callback/route.ts` for OAuth redirect |
| 14 | `src/app/api/users/[uid]/route.ts` | **RENAME** to `src/app/api/profile/route.ts` (GET/PATCH own profile, no uid param needed) |

All other routes (1-12, 15-27) keep the same paths from the original spec.

**Add**: `src/app/api/auth/callback/route.ts` - Supabase OAuth code exchange:
```typescript
import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

---

## E. Exact Execution Order for Codex (Phase 1 Only)

Codex should execute these in this exact sequence. Do NOT skip ahead.

```
STEP 1: npm install @supabase/supabase-js @supabase/ssr
STEP 2: CREATE src/lib/supabase/client.ts         (from Section C)
STEP 3: CREATE src/lib/supabase/server.ts          (from Section C)
STEP 4: CREATE src/lib/supabase/admin.ts           (from Section C)
STEP 5: CREATE src/middleware.ts                    (from Section C)
STEP 6: CREATE src/lib/api-helpers.ts              (from Section C - Supabase version)
STEP 7: CREATE src/lib/api-client.ts               (from Section C - no Bearer token)
STEP 8: CREATE src/types/models.ts                 (from original spec Section 2.2, BUT:
          - Replace all `Timestamp | FieldValue` with `string` (ISO 8601)
          - Remove `import { Timestamp, FieldValue } from "firebase/firestore"`
          - Add `export type` for all types)
STEP 9: CREATE src/app/api/auth/callback/route.ts  (from Section D)
STEP 10: CREATE src/app/api/profile/route.ts        (GET/PATCH own profile via Supabase)
STEP 11-22: CREATE all 12 AI route handlers          (same paths as original spec, but use
            `getAuthUser()` from corrected api-helpers instead of `verifyAuth()`)
```

Phases 2+ (CRUD routes, billing, client migration) proceed per original spec Sections 7.4-7.8, using Supabase client instead of Firestore calls.

---

## F. Exact Things Codex Must NOT Change

1. **`src/ai/`** - All Genkit flows, prompts, tools, and `genkit.ts` config. Zero edits.
2. **`src/components/ui/`** - All shadcn components. Zero edits.
3. **`src/components/layout/`** - Navbar, sidebar, header. Zero edits.
4. **`src/lib/utils.ts`** - Class merging utility. Zero edits.
5. **`src/lib/file-utils.ts`** - File-to-dataURI converters. Zero edits.
6. **`src/lib/nav-utils.ts`** - Navigation config. Zero edits.
7. **`src/hooks/`** - use-mobile, use-toast. Zero edits.
8. **`next.config.ts`** - Keep current config. Zero edits.
9. **`tailwind.config.ts`** and `src/app/globals.css` - Zero edits.
10. **`package.json` scripts** - Do not change `dev`, `build`, `start`, `genkit:*` scripts.
11. **Do NOT create** `firestore.rules` or `src/lib/firebase-admin.ts`.
12. **Do NOT install** `firebase-admin`.

---

## Env Vars (replaces original Section 6)

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
GOOGLE_GENAI_API_KEY=<your-google-ai-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-signing-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
```

Remove all `NEXT_PUBLIC_FIREBASE_*` and `GOOGLE_APPLICATION_CREDENTIALS` vars.
