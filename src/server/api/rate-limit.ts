import { Redis } from '@upstash/redis';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getFeatureLimit, isPlan, type PlanFeature } from '@/lib/plan-limits';
import { isInternalUser } from '@/lib/internal-access';
import { ApiRouteError } from '@/server/api/http';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

type Store = Map<string, RateLimitBucket>;

interface RateLimitGlobalState {
  __recruitedaiRateLimitStore?: Store;
  __recruitedaiRateLimitRedis?: Redis;
  __recruitedaiRateLimitRedisWarned?: boolean;
}

function getGlobalState() {
  return globalThis as typeof globalThis & RateLimitGlobalState;
}

function getStore(): Store {
  const globalRef = getGlobalState();
  if (!globalRef.__recruitedaiRateLimitStore) {
    globalRef.__recruitedaiRateLimitStore = new Map();
  }
  return globalRef.__recruitedaiRateLimitStore;
}

function getRedisClient(): Redis | null {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  const globalRef = getGlobalState();
  if (!globalRef.__recruitedaiRateLimitRedis) {
    globalRef.__recruitedaiRateLimitRedis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  return globalRef.__recruitedaiRateLimitRedis;
}

function nowMs() {
  return Date.now();
}

function computeRateLimitLocal(config: RateLimitConfig): RateLimitResult {
  const store = getStore();
  const scopedKey = `${config.scope}:${config.key}`;
  const now = nowMs();

  const current = store.get(scopedKey);
  if (!current || current.resetAt <= now) {
    store.set(scopedKey, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(config.limit - 1, 0),
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  if (current.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }

  current.count += 1;
  store.set(scopedKey, current);

  return {
    allowed: true,
    remaining: Math.max(config.limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}

async function computeRateLimitDistributed(config: RateLimitConfig): Promise<RateLimitResult | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const key = `rl:${config.scope}:${config.key}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.max(Math.ceil(config.windowMs / 1000), 1));
    }

    const ttlSeconds = await redis.ttl(key);
    const retryAfterSeconds = ttlSeconds > 0 ? ttlSeconds : Math.max(Math.ceil(config.windowMs / 1000), 1);

    if (count > config.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(config.limit - count, 0),
      retryAfterSeconds,
    };
  } catch (error) {
    const globalRef = getGlobalState();
    if (!globalRef.__recruitedaiRateLimitRedisWarned) {
      globalRef.__recruitedaiRateLimitRedisWarned = true;
      console.warn('[rate-limit] Redis limiter unavailable, falling back to in-memory limiter.', error);
    }
    return null;
  }
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

export async function enforceRateLimit(
  request: Request,
  options: {
    scope: string;
    subject: string;
    limit: number;
    windowMs: number;
  }
) {
  const ip = getClientIp(request);
  const key = `${options.subject}:${ip}`;

  const result =
    (await computeRateLimitDistributed({
      scope: options.scope,
      key,
      limit: options.limit,
      windowMs: options.windowMs,
    })) ||
    computeRateLimitLocal({
      scope: options.scope,
      key,
      limit: options.limit,
      windowMs: options.windowMs,
    });

  if (!result.allowed) {
    throw new ApiRouteError(429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.', {
      retryAfterSeconds: result.retryAfterSeconds,
      scope: options.scope,
    });
  }

  return result;
}

function currentPeriodStart(now = new Date()): string {
  // First day of the current month, formatted as YYYY-MM-DD for Postgres `date`.
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

// Enforces per-company, per-month feature caps from src/lib/plan-limits.ts.
// Reads companies.plan, compares against usage_counters for the current period,
// and increments the counter on success. Throws 402 TRIAL_LIMIT_REACHED when
// the cap is hit so the client can surface the upgrade prompt. Uses the
// service-role admin client so the write bypasses the read-only RLS policy on
// usage_counters.
export async function enforceTrialQuota(
  _request: Request,
  feature: PlanFeature,
  companyId: string
): Promise<{ plan: string; current: number; limit: number }> {
  const supabase = createSupabaseAdminClient();

  // Internal/developer accounts are exempt from plan quotas so the team can
  // demo and dogfood without hitting trial caps. We check the *current* signed-in
  // user (not the company plan) — the internal email follows the person, and the
  // Developer role is a closed, server-assigned role that cannot be self-granted.
  try {
    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (user) {
      if (isInternalUser(user.email)) {
        return { plan: 'internal', current: 0, limit: Infinity };
      }
      const { data: profile } = await serverClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.role === 'Developer') {
        return { plan: 'developer', current: 0, limit: Infinity };
      }
    }
  } catch {
    // If the user lookup fails for any reason, fall through to normal quota
    // enforcement rather than accidentally granting an unlimited bypass.
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('plan')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) {
    throw new ApiRouteError(500, 'QUOTA_LOOKUP_FAILED', 'Could not load company plan for quota check.', companyError);
  }

  const plan = company?.plan && isPlan(company.plan) ? company.plan : 'trial';
  const limit = getFeatureLimit(plan, feature);

  // Unlimited plans (scale) short-circuit before touching the counter table.
  if (!Number.isFinite(limit)) {
    return { plan, current: 0, limit };
  }

  const periodStart = currentPeriodStart();

  const { data: existing, error: counterError } = await supabase
    .from('usage_counters')
    .select('count')
    .eq('company_id', companyId)
    .eq('period_start', periodStart)
    .eq('feature', feature)
    .maybeSingle();

  if (counterError) {
    throw new ApiRouteError(500, 'QUOTA_LOOKUP_FAILED', 'Could not load usage counter.', counterError);
  }

  const current = existing?.count ?? 0;

  if (current >= limit) {
    throw new ApiRouteError(
      402,
      'TRIAL_LIMIT_REACHED',
      'You have reached your plan limit for this feature. Upgrade to continue.',
      { feature, plan, limit, current }
    );
  }

  const nextCount = current + 1;
  const { error: upsertError } = await supabase
    .from('usage_counters')
    .upsert(
      {
        company_id: companyId,
        period_start: periodStart,
        feature,
        count: nextCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,period_start,feature' }
    );

  if (upsertError) {
    throw new ApiRouteError(500, 'QUOTA_WRITE_FAILED', 'Could not record usage.', upsertError);
  }

  return { plan, current: nextCount, limit };
}
