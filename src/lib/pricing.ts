import { formatPrice, type Currency } from '@/lib/currency';

export type BillingCycle = 'monthly' | 'annual';

export type PlanId =
  | 'starter'
  | 'agency'
  | 'scale'
  | 'candidate-free'
  | 'candidate-pro';

export type PlanAudience = 'agency' | 'candidate';

export interface PlanPrice {
  monthly: number;
  annual: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  audience: PlanAudience;
  price: { USD: PlanPrice; ZAR: PlanPrice } | null;
  highlight?: boolean;
  /**
   * True only for plans quoted per recruiter. The flat-rate launch plans
   * (Starter, Agency) are false/absent — their price is a single monthly
   * charge covering the whole team, matching the Paddle catalog, where those
   * prices are created with a quantity of exactly 1.
   */
  perSeat?: boolean;
  /** Only meaningful alongside `perSeat` — drives the "from N seats" line. */
  minimumSeats?: number;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

export const agencyPlans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Solo recruiters & 2–3 person firms',
    audience: 'agency',
    price: {
      USD: { monthly: 39, annual: 32 },
      ZAR: { monthly: 599, annual: 499 },
    },
    features: [
      'Flat monthly rate — no per-seat charges',
      '100 CV screenings / month',
      '25 job match assessments / month',
      '5 branded CV exports / month',
      '10 Smart Lead Finder queries / month',
      'Candidate pipeline & client CRM',
      'Email support (48hr response)',
    ],
    ctaLabel: 'Start 7-day free trial',
    ctaHref: '/signup?plan=starter',
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: '6–25 recruiter teams · Most popular',
    audience: 'agency',
    price: {
      USD: { monthly: 79, annual: 65 },
      ZAR: { monthly: 1199, annual: 999 },
    },
    highlight: true,
    features: [
      'Flat monthly rate — no per-seat charges',
      '500 CV screenings / month, shared across your team',
      '150 job match assessments / month',
      '50 branded CV exports / month',
      '100 Smart Lead Finder queries / month',
      'Branded PDF templates with agency logo',
      'Interview transcript analysis (10 / month)',
      'Sales pipeline + client linking',
      'Team reporting & placement analytics',
      'Priority email + chat support (24hr)',
    ],
    ctaLabel: 'Start 7-day free trial',
    ctaHref: '/signup?plan=agency',
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: '25+ recruiters · multi-office',
    audience: 'agency',
    price: {
      USD: { monthly: 129, annual: 109 },
      ZAR: { monthly: 1899, annual: 1599 },
    },
    perSeat: true,
    minimumSeats: 10,
    features: [
      '10 seats minimum',
      'Unlimited CV screenings & job matches',
      'Unlimited branded exports',
      'Unlimited Smart Lead Finder',
      'Unlimited transcript analysis',
      'Custom branding + custom CV templates',
      'SSO (Google Workspace, Microsoft Entra)',
      'Audit logs & admin console',
      'Dedicated CSM + SLA (4hr response)',
      'DPA & data residency on request',
    ],
    ctaLabel: 'Talk to sales',
    ctaHref: 'mailto:pglaurens@outlook.com?subject=RecruitedAI%20Scale%20plan%20enquiry',
  },
];

export const candidatePlans: Plan[] = [
  {
    id: 'candidate-free',
    name: 'Free',
    tagline: 'For job seekers getting started',
    audience: 'candidate',
    price: null,
    features: [
      '1 master resume',
      '3 targeted resume tailorings / month',
      'Watermarked online resume & LinkTree bio',
      'Basic interview prep (3 sessions / month)',
    ],
    ctaLabel: 'Sign up free',
    ctaHref: '/signup?plan=candidate-free',
  },
  {
    id: 'candidate-pro',
    name: 'Pro',
    tagline: 'For active job seekers',
    audience: 'candidate',
    price: {
      USD: { monthly: 19, annual: 15 },
      ZAR: { monthly: 299, annual: 249 },
    },
    highlight: true,
    features: [
      'Unlimited resume tailoring',
      'Unlimited AI interview prep with scoring',
      'Ad-free online resume with custom domain',
      'AI cover letter generation',
      'Lifetime deal: $149 (first 500 buyers)',
    ],
    ctaLabel: 'Upgrade to Pro',
    ctaHref: '/signup?plan=candidate-pro',
  },
];

// Per-currency price of an additional seat. NOT charged today — the launch is
// flat-rate per plan (roadmap section F(a)) and no plan's copy references it.
// Retained as the agreed commercial rate for the per-seat billing fast-follow,
// where it becomes a Paddle quantity price. No feature bullet currently uses
// the {seatPrice} placeholder that getPlanFeatures() resolves.
const ADDITIONAL_SEAT_PRICE: Record<Currency, number> = { USD: 29, ZAR: 529 };

// Per-CV rate for the planned metered-overage fast-follow. NOT charged today:
// quota enforcement hard-stops at the plan cap (see plan-limits.ts) and no
// metered billing exists, so this must not appear in customer-facing copy yet.
// ZAR mirrors the seat-price ratio (~18×) rather than a raw FX conversion, in
// line with the PPP-based ZAR pricing. Adjust here if the commercial rate changes.
export const CV_OVERAGE_PRICE: Record<Currency, number> = { USD: 0.05, ZAR: 0.9 };

/**
 * Returns a plan's feature bullets with currency-dependent placeholders (e.g.
 * the additional-seat price) resolved for the given currency.
 */
export function getPlanFeatures(plan: Plan, currency: Currency): string[] {
  const seatPrice = formatPrice(ADDITIONAL_SEAT_PRICE[currency], currency);
  return plan.features.map((feature) => feature.replace('{seatPrice}', seatPrice));
}

export function getPrice(plan: Plan, currency: Currency, cycle: BillingCycle): number | null {
  if (plan.price === null) return null;
  return plan.price[currency][cycle];
}

export function annualSavingsPercent(plan: Plan, currency: Currency): number | null {
  if (plan.price === null) return null;
  const m = plan.price[currency].monthly;
  const a = plan.price[currency].annual;
  if (m === 0) return null;
  return Math.round(((m - a) / m) * 100);
}
