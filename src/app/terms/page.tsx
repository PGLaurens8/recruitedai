import type { Metadata } from "next";

import { LegalPageShell } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — RecruitedAI",
  description: "The terms governing your use of the RecruitedAI recruitment platform.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      lastUpdated="2 June 2026"
      intro="These terms govern your access to and use of RecruitedAI. Please read them carefully — by using the service you agree to them."
    >
      <h2>1. Acceptance of Terms</h2>
      <p>
        RecruitedAI is operated as a close corporation registered in South Africa (&ldquo;RecruitedAI&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account, accessing, or using the platform you agree
        to be bound by these Terms of Service. If you are using RecruitedAI on behalf of an organisation, you
        confirm that you have authority to bind that organisation to these terms. If you do not agree, do not
        use the service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        RecruitedAI is an AI-powered recruitment software-as-a-service (SaaS) platform. It helps recruiters and
        job seekers screen CVs, score candidates against job descriptions, generate branded candidate documents,
        analyse interviews, and manage the hiring pipeline. We may add, change, or remove features over time to
        improve the service.
      </p>

      <h2>3. User Accounts</h2>
      <p>
        You must provide accurate account information and keep it up to date. You are responsible for
        safeguarding your login credentials and for all activity that occurs under your account. Notify us
        promptly if you suspect any unauthorised use. Accounts are intended for use by the registered user or
        organisation and may not be shared across separate businesses or resold.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Upload data you do not have the right or consent to process, including candidate CVs.</li>
        <li>Use the service to discriminate unlawfully against candidates or to violate employment law.</li>
        <li>Attempt to reverse-engineer, scrape, overload, or disrupt the platform or its AI systems.</li>
        <li>Use the service for any unlawful, fraudulent, or abusive purpose.</li>
      </ul>

      <h2>5. AI-Generated Content</h2>
      <p>
        Match scores, skill assessments, summaries, interview analysis, and other outputs are
        <strong> AI-assisted and provided for guidance only</strong>. They can be incomplete or wrong and must
        be reviewed by a human before any hiring decision is made. RecruitedAI does not make employment
        decisions for you, and you remain solely responsible for your hiring choices and for complying with all
        applicable laws, including those on fair and non-discriminatory recruitment.
      </p>

      <h2>6. Payment and Billing</h2>
      <p>
        Paid plans are sold through <strong>Paddle, which acts as the merchant of record</strong> for all
        purchases. Paddle handles payment processing, billing, sales tax/VAT, and payment-related support.
        Subscriptions renew automatically for the chosen billing cycle until cancelled. By subscribing you also
        agree to Paddle&apos;s buyer terms. Refunds are handled in line with our{" "}
        <a href="/refunds">Refund Policy</a>.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        RecruitedAI and all related software, branding, and content are owned by us and our licensors. We grant
        you a limited, non-exclusive, non-transferable right to use the service during your subscription. You
        retain ownership of the data and documents you upload; you grant us the limited licence needed to process
        that content to provide the service to you.
      </p>

      <h2>8. Data and Privacy</h2>
      <p>
        Our handling of personal information is described in our <a href="/privacy">Privacy Policy</a>. We
        process data in line with the Protection of Personal Information Act (POPIA) and, where applicable, the
        GDPR. You are responsible for ensuring you have a lawful basis to upload any candidate or third-party
        personal data to the platform.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, RecruitedAI is provided &ldquo;as is&rdquo; without warranties of
        any kind. We are not liable for indirect, incidental, or consequential damages, or for hiring outcomes
        based on AI-assisted outputs. Our total liability for any claim relating to the service is limited to the
        amount you paid us in the twelve months before the claim arose.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may cancel your subscription at any time. We may suspend or terminate access if you breach these
        terms or use the service in a way that creates risk or legal exposure. On termination your right to use
        the service ends; you may request export or deletion of your data as set out in the Privacy Policy.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These terms are governed by the laws of the Republic of South Africa, and the South African courts have
        jurisdiction over any dispute, without regard to conflict-of-laws rules.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms can be sent to{" "}
        <a href="mailto:pglaurens@outlook.com">pglaurens@outlook.com</a>.
      </p>
    </LegalPageShell>
  );
}
