# Supabase Email Branding (RecruitedAI)

When email confirmation is re-enabled, Supabase sends auth emails (confirm signup,
invite, magic link, password reset). By default these are unbranded and the sender
shows as a generic Supabase address. This runbook makes them show **RecruitedAI**.

All of this is configured in the **Supabase dashboard** — there is no app code to
deploy. Changes take effect immediately (no Vercel redeploy needed).

## 1. Sender name and address

Two options, in increasing order of trust/deliverability:

- **Quick (built-in sender):** Dashboard → **Authentication → Emails → SMTP Settings**
  is off, so Supabase's shared sender is used. You can still set the **Sender name**
  to `RecruitedAI` under **Authentication → Emails → Templates** (the "From" name field
  where available). The address remains a Supabase one and is rate-limited (~2–4/hour) —
  fine for light testing only.
- **Recommended (custom SMTP):** Dashboard → **Authentication → Emails → SMTP Settings**
  → enable custom SMTP and point it at your provider (e.g. Resend, SendGrid, Postmark,
  Amazon SES). Set:
  - **Sender email:** `no-reply@recruitedai.com` (or your verified domain)
  - **Sender name:** `RecruitedAI`
  This removes the Supabase rate limit and the "from supabase" appearance entirely, and
  is required before any real (non-test) user signups.

## 2. Email templates

Dashboard → **Authentication → Emails → Templates**. For each template below, paste the
HTML into the template body. Supabase variables (`{{ .ConfirmationURL }}`, etc.) are
substituted server-side. The subject lines are set in the field above the body.

### Confirm signup

**Subject:** `Confirm your RecruitedAI account`

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:20px;margin:0 0 8px">Welcome to RecruitedAI</h1>
  <p style="font-size:14px;line-height:1.6;color:#444">
    Thanks for signing up. Confirm your email address to activate your account and start
    screening candidates with explainable, skills-first AI.
  </p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}"
       style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">
      Confirm my email
    </a>
  </p>
  <p style="font-size:12px;color:#777">
    If the button doesn't work, copy and paste this link into your browser:<br />
    <a href="{{ .ConfirmationURL }}" style="color:#4f46e5;word-break:break-all">{{ .ConfirmationURL }}</a>
  </p>
  <p style="font-size:12px;color:#aaa;margin-top:24px">
    You received this because someone signed up for RecruitedAI with this address.
    If that wasn't you, you can ignore this email.
  </p>
</div>
```

### Invite user

**Subject:** `You've been invited to RecruitedAI`

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:20px;margin:0 0 8px">You've been invited to RecruitedAI</h1>
  <p style="font-size:14px;line-height:1.6;color:#444">
    Your team has invited you to collaborate on RecruitedAI. Accept the invitation to
    set your password and join your company workspace.
  </p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}"
       style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">
      Accept invitation
    </a>
  </p>
  <p style="font-size:12px;color:#777">
    Or paste this link into your browser:<br />
    <a href="{{ .ConfirmationURL }}" style="color:#4f46e5;word-break:break-all">{{ .ConfirmationURL }}</a>
  </p>
</div>
```

### Magic link

**Subject:** `Your RecruitedAI sign-in link`

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:20px;margin:0 0 8px">Sign in to RecruitedAI</h1>
  <p style="font-size:14px;line-height:1.6;color:#444">Click below to sign in. This link expires shortly for your security.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}"
       style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">
      Sign in
    </a>
  </p>
</div>
```

### Reset password

**Subject:** `Reset your RecruitedAI password`

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:20px;margin:0 0 8px">Reset your password</h1>
  <p style="font-size:14px;line-height:1.6;color:#444">
    We received a request to reset your RecruitedAI password. Click below to choose a new
    one. If you didn't request this, you can safely ignore this email.
  </p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}"
       style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">
      Reset password
    </a>
  </p>
</div>
```

## 3. URL configuration (so links resolve, not "site can't be reached")

Dashboard → **Authentication → URL Configuration**:
- **Site URL:** your production URL (the Vercel domain).
- **Redirect URLs:** add the production URL and any preview/staging URLs you test from.

The `{{ .ConfirmationURL }}` Supabase generates is built from the Site URL — if it points
at localhost or an unreachable host, the confirmation link 404s, which is the
"site can't be reached" symptom seen during early testing.

## 4. Re-enabling confirmation later

Email confirmation is currently **disabled** for frictionless early testing
(Authentication → Sign In / Providers → Email → "Confirm email" is off). When you turn it
back on, verify the templates and Site URL above first so the very first confirmation
email is both branded and clickable.
