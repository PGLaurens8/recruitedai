import type { Metadata } from "next";

import { LegalPageShell } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — RecruitedAI",
  description: "How RecruitedAI collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      lastUpdated="2 June 2026"
      intro="This policy explains what personal information RecruitedAI collects, how we use it, and the rights you have over your data. RecruitedAI is operated as a close corporation registered in South Africa."
    >
      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account data</strong> — your name, email address, and company details when you register.</li>
        <li><strong>CV and resume data</strong> — the candidate CVs and resumes you upload, including the personal information they contain.</li>
        <li><strong>Usage data</strong> — how you interact with the platform, such as features used, log data, and device/browser information.</li>
        <li><strong>Billing data</strong> — handled by Paddle, our merchant of record; we do not store full payment card numbers.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use personal information only to provide and improve the recruitment service, specifically to:</p>
      <ul>
        <li>Create and secure your account and authenticate access.</li>
        <li>Parse, score, and analyse CVs against job descriptions to produce AI-assisted screening results.</li>
        <li>Provide support, send service-related communications, and process billing through Paddle.</li>
        <li>Maintain security, prevent abuse, and meet legal obligations.</li>
      </ul>

      <h2>3. CV and Resume Data</h2>
      <p>
        CVs and resumes you upload are processed by <strong>Google Gemini AI</strong> to extract structured data
        and generate match scores and summaries, and are <strong>stored in Supabase</strong> (our database and
        storage provider). This data is used <strong>only for the stated recruitment purpose</strong> — screening
        and matching within your account. It is not used to train third-party AI models on your behalf and is not
        repurposed for advertising.
      </p>

      <h2>4. Data Processors</h2>
      <p>
        We use trusted sub-processors to run the service: <strong>Supabase</strong> (database, authentication,
        and file storage), <strong>Google</strong> (Gemini AI processing), and <strong>Paddle</strong> (payments
        as merchant of record). These providers process data on our instructions under their own data-protection
        commitments.
      </p>

      <h2>5. We Do Not Sell Your Data</h2>
      <p>
        We <strong>do not sell or rent personal information</strong> to third parties, and we do not share it for
        third-party marketing. We disclose data only to the processors above, or where required by law.
      </p>

      <h2>6. Legal Compliance (POPIA &amp; GDPR)</h2>
      <p>
        We process personal information in line with South Africa&apos;s Protection of Personal Information Act
        (POPIA) and, where it applies, the EU General Data Protection Regulation (GDPR). We process data lawfully,
        for the limited purposes described here, and apply reasonable technical and organisational safeguards,
        including row-level security and encryption at rest.
      </p>

      <h2>7. Data Retention</h2>
      <p>
        We keep personal information for as long as your account is active or as needed to provide the service.
        When you delete a record or close your account, we delete or anonymise the associated personal data within
        a reasonable period, except where we must retain it to meet legal, tax, or accounting obligations.
      </p>

      <h2>8. Your Rights</h2>
      <p>Subject to applicable law, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> — request a copy of the personal information we hold about you.</li>
        <li><strong>Deletion</strong> — request that we delete your personal information.</li>
        <li><strong>Portability</strong> — receive your data in a structured, commonly used format.</li>
        <li><strong>Correction and objection</strong> — correct inaccurate data or object to certain processing.</li>
      </ul>

      <h2>9. Contact for Privacy Requests</h2>
      <p>
        To exercise any of these rights or ask a privacy question, contact our privacy contact at{" "}
        <a href="mailto:pglaurens@outlook.com">pglaurens@outlook.com</a>. We will respond within the time frame
        required by applicable law.
      </p>
    </LegalPageShell>
  );
}
