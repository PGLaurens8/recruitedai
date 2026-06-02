import type { Metadata } from "next";

import { LegalPageShell } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy — RecruitedAI",
  description: "How trials, subscriptions, cancellations, and refunds work at RecruitedAI.",
};

export default function RefundsPage() {
  return (
    <LegalPageShell
      title="Refund Policy"
      lastUpdated="2 June 2026"
      intro="This policy explains how our free trial, subscriptions, and refunds work. Payments are processed by Paddle, our merchant of record."
    >
      <h2>1. Free Trial</h2>
      <p>
        RecruitedAI offers a <strong>7-day free trial with no charge</strong> and no credit card required. You
        can explore the platform during the trial and will only be billed if you choose to subscribe to a paid
        plan.
      </p>

      <h2>2. Monthly Subscriptions</h2>
      <p>
        You can <strong>cancel a monthly subscription at any time</strong>, and your access continues until the
        end of the current billing period. We do <strong>not provide refunds for partial months</strong> — once a
        monthly period has started, that month is non-refundable.
      </p>

      <h2>3. Annual Subscriptions</h2>
      <p>
        For annual plans, you may request a <strong>pro-rata refund within 14 days</strong> of the payment date.
        If requested within that window, we refund the unused portion of the annual term. After 14 days, annual
        subscriptions are non-refundable, but you keep access for the full term you paid for.
      </p>

      <h2>4. How to Request a Refund</h2>
      <p>
        To request a refund or cancel, email{" "}
        <a href="mailto:pglaurens@outlook.com">pglaurens@outlook.com</a> with your account email and the reason
        for the request. Eligible refunds are issued to your original payment method.
      </p>

      <h2>5. Payment Processing</h2>
      <p>
        All payments and refunds are processed by <strong>Paddle, our merchant of record</strong>. Refunds are
        returned via Paddle to the original payment method and may take a few business days to appear, depending
        on your bank or card provider.
      </p>
    </LegalPageShell>
  );
}
