import { beforeEach, describe, expect, it } from 'vitest';

import { ApiRouteError } from '@/server/api/http';
import { enforceRateLimit } from './rate-limit';

function requestWithIp(ip: string) {
  return new Request('http://localhost/api/test', {
    headers: {
      'x-forwarded-for': ip,
    },
  });
}

describe('enforceRateLimit', () => {
  beforeEach(() => {
    const globalRef = globalThis as typeof globalThis & {
      __recruitedaiRateLimitStore?: Map<string, unknown>;
      __recruitedaiRateLimitRedisWarned?: boolean;
      __recruitedaiRateLimitRedis?: unknown;
    };
    globalRef.__recruitedaiRateLimitStore = new Map();
    globalRef.__recruitedaiRateLimitRedisWarned = false;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('allows requests under the configured limit', async () => {
    const request = requestWithIp('10.0.0.1');

    const first = await enforceRateLimit(request, {
      scope: 'test:scope',
      subject: 'user-1',
      limit: 2,
      windowMs: 60_000,
    });

    const second = await enforceRateLimit(request, {
      scope: 'test:scope',
      subject: 'user-1',
      limit: 2,
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('throws RATE_LIMITED when requests exceed limit', async () => {
    const request = requestWithIp('10.0.0.2');

    await enforceRateLimit(request, {
      scope: 'test:scope',
      subject: 'user-1',
      limit: 1,
      windowMs: 60_000,
    });

    await expect(
      enforceRateLimit(request, {
        scope: 'test:scope',
        subject: 'user-1',
        limit: 1,
        windowMs: 60_000,
      })
    ).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    } as Partial<ApiRouteError>);
  });

  it('isolates limits by subject and IP key', async () => {
    const requestA = requestWithIp('10.0.0.3');
    const requestB = requestWithIp('10.0.0.4');

    await enforceRateLimit(requestA, {
      scope: 'test:scope',
      subject: 'user-1',
      limit: 1,
      windowMs: 60_000,
    });

    await expect(
      enforceRateLimit(requestA, {
        scope: 'test:scope',
        subject: 'user-1',
        limit: 1,
        windowMs: 60_000,
      })
    ).rejects.toBeInstanceOf(ApiRouteError);

    const independent = await enforceRateLimit(requestB, {
      scope: 'test:scope',
      subject: 'user-1',
      limit: 1,
      windowMs: 60_000,
    });

    expect(independent.allowed).toBe(true);
  });
});
