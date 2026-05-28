// Plan / trial usage caps. Numbers come from PRICING_STRATEGY.md section 4
// (plan ladder) and section 4.2 (trial limits). The trial column doubles as
// the default for any new signup until billing flips the plan field.
//
// `Infinity` is used for "unlimited" so the quota helper's `count >= limit`
// check naturally short-circuits — we never serialise these across JSON.

export type Plan = 'trial' | 'starter' | 'agency' | 'scale';

export type PlanFeature =
  | 'CV_PARSE'
  | 'JOB_MATCH'
  | 'COVER_LETTER'
  | 'CANDIDATE_PROFILE'
  | 'INTERVIEW_ANALYSIS'
  | 'LEAD_FINDER'
  | 'BRANDED_EXPORT';

const PLAN_LIMITS: Record<Plan, Record<PlanFeature, number>> = {
  trial: {
    CV_PARSE: 2,
    JOB_MATCH: 3,
    COVER_LETTER: 1,
    CANDIDATE_PROFILE: 1,
    INTERVIEW_ANALYSIS: 1,
    LEAD_FINDER: 2,
    BRANDED_EXPORT: 3,
  },
  starter: {
    CV_PARSE: 100,
    JOB_MATCH: 25,
    COVER_LETTER: 25,
    CANDIDATE_PROFILE: 25,
    INTERVIEW_ANALYSIS: 5,
    LEAD_FINDER: 10,
    BRANDED_EXPORT: 5,
  },
  agency: {
    CV_PARSE: 500,
    JOB_MATCH: 150,
    COVER_LETTER: 150,
    CANDIDATE_PROFILE: 150,
    INTERVIEW_ANALYSIS: 10,
    LEAD_FINDER: 100,
    BRANDED_EXPORT: 50,
  },
  scale: {
    CV_PARSE: Infinity,
    JOB_MATCH: Infinity,
    COVER_LETTER: Infinity,
    CANDIDATE_PROFILE: Infinity,
    INTERVIEW_ANALYSIS: Infinity,
    LEAD_FINDER: Infinity,
    BRANDED_EXPORT: Infinity,
  },
};

export function isPlan(value: string): value is Plan {
  return value === 'trial' || value === 'starter' || value === 'agency' || value === 'scale';
}

export function getPlanLimits(plan: string): Record<PlanFeature, number> {
  return isPlan(plan) ? PLAN_LIMITS[plan] : PLAN_LIMITS.trial;
}

export function getFeatureLimit(plan: string, feature: PlanFeature): number {
  return getPlanLimits(plan)[feature];
}

// Stub. Replaced by a Paddle subscription lookup in Phase 3. Returning false
// keeps every account on trial-grade caps until the real billing wiring lands.
export async function isActivePaidPlan(_companyId: string): Promise<boolean> {
  return false;
}
