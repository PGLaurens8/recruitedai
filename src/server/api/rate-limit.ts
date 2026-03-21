import { Redis } from '@upstash/redis';

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
