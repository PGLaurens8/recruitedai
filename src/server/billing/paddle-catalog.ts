// Paddle catalog → plan mapping (roadmap section F, chunk 0).
//
// This is the **trusted server-side table** referenced by chunk C: the webhook
// handler resolves entitlement by looking a `price_id` up here, never from
// client input or from anything in the checkout-success redirect. Keep this
// module server-only — it must not be imported from a client component.
//
// Launch scope is flat-rate (roadmap F(a)): one unit per subscription, no
// per-seat quantity. Every price below is created with quantity 1-1 in Paddle,
// so a subscription can only ever carry a single unit.
//
// Amounts are recorded here as a cross-check against the Paddle catalog. They
// are **not** used for display — the pricing page renders from
// `src/lib/pricing.ts`. If the two ever disagree, Paddle is authoritative for
// what a customer is actually charged; fix the page.

import { isPlan, type Plan } from '@/lib/plan-limits';

export type BillingCycle = 'monthly' | 'annual';

/** The subset of plans that are self-serve purchasable at launch. */
export type PurchasablePlan = Extract<Plan, 'starter' | 'agency'>;

export type PaddleEnvironment = 'sandbox' | 'production';

export interface CatalogPrice {
  priceId: string;
  productId: string;
  plan: PurchasablePlan;
  cycle: BillingCycle;
  /** Base (USD) amount in the lowest denomination, for reconciliation only. */
  baseAmount: number;
  baseCurrency: 'USD';
}

/**
 * Sandbox catalog, created 2026-08-05. Products carry `custom_data.plan` and
 * prices carry `custom_data.{plan,cycle}` in Paddle as well, but resolution
 * goes through this table — `custom_data` is editable in the dashboard and is
 * therefore treated as a convenience label, not a source of truth.
 */
const SANDBOX_PRICES: CatalogPrice[] = [
  {
    priceId: 'pri_01kz9e98ehk8hxs0jw8jncvb5b',
    productId: 'pro_01kz9e984t6sz6y02me5hh9x4h',
    plan: 'starter',
    cycle: 'monthly',
    baseAmount: 3900,
    baseCurrency: 'USD',
  },
  {
    priceId: 'pri_01kz9e98jymvt1gb85p38ntena',
    productId: 'pro_01kz9e984t6sz6y02me5hh9x4h',
    plan: 'starter',
    cycle: 'annual',
    baseAmount: 38400,
    baseCurrency: 'USD',
  },
  {
    priceId: 'pri_01kz9e98px8c0vtry3rwjcd2j1',
    productId: 'pro_01kz9e98av6vvfq1eft53c5e64',
    plan: 'agency',
    cycle: 'monthly',
    baseAmount: 7900,
    baseCurrency: 'USD',
  },
  {
    priceId: 'pri_01kz9e98v7xemzbf7xhx25ma19',
    productId: 'pro_01kz9e98av6vvfq1eft53c5e64',
    plan: 'agency',
    cycle: 'annual',
    baseAmount: 78000,
    baseCurrency: 'USD',
  },
];

/**
 * Production catalog. Empty until the live Paddle account is set up — the
 * sandbox IDs above are **not** valid in production, so resolution against an
 * empty production table fails loudly rather than silently granting a plan.
 */
const PRODUCTION_PRICES: CatalogPrice[] = [];

const CATALOG: Record<PaddleEnvironment, CatalogPrice[]> = {
  sandbox: SANDBOX_PRICES,
  production: PRODUCTION_PRICES,
};

/**
 * Which Paddle account this deployment talks to. Defaults to `sandbox` so a
 * missing env var can never point real money at an unverified catalog.
 */
export function getPaddleEnvironment(): PaddleEnvironment {
  return process.env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
}

export function getCatalog(environment: PaddleEnvironment = getPaddleEnvironment()): CatalogPrice[] {
  return CATALOG[environment];
}

/**
 * Resolves a Paddle `price_id` to the plan it grants. Returns `null` for any
 * unknown ID — callers must treat that as "grant nothing" and log it, since it
 * means the catalog and this table have drifted.
 */
export function resolvePriceId(
  priceId: string,
  environment: PaddleEnvironment = getPaddleEnvironment()
): CatalogPrice | null {
  return getCatalog(environment).find((entry) => entry.priceId === priceId) ?? null;
}

/** Looks up the price to open checkout with for a given plan and cycle. */
export function findPriceFor(
  plan: PurchasablePlan,
  cycle: BillingCycle,
  environment: PaddleEnvironment = getPaddleEnvironment()
): CatalogPrice | null {
  return getCatalog(environment).find((e) => e.plan === plan && e.cycle === cycle) ?? null;
}

/** Narrows an arbitrary string to a plan that can be bought self-serve. */
export function isPurchasablePlan(value: string): value is PurchasablePlan {
  return isPlan(value) && (value === 'starter' || value === 'agency');
}
