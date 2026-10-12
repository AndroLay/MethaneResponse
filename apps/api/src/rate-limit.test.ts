import { describe, expect, test } from 'bun:test';
import { createFixedWindowRateLimiter } from './rate-limit';

describe('audit write rate limit', () => {
  test('limits one client in a fixed window and resets at the boundary', () => {
    let now = 1_000;
    const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1_000, now: () => now });

    expect(limiter.consume('client-a')).toMatchObject({ allowed: true, remaining: 1, resetAt: 2_000 });
    expect(limiter.consume('client-a')).toMatchObject({ allowed: true, remaining: 0, resetAt: 2_000 });
    expect(limiter.consume('client-a')).toMatchObject({ allowed: false, remaining: 0, resetAt: 2_000 });
    expect(limiter.consume('client-b').allowed).toBe(true);
    now = 2_000;
    expect(limiter.consume('client-a')).toMatchObject({ allowed: true, remaining: 1, resetAt: 3_000 });
  });

  test('bounds client state and prunes expired windows before rejecting new keys', () => {
    let now = 1_000;
    const limiter = createFixedWindowRateLimiter({ limit: 1, windowMs: 1_000, maxEntries: 1, now: () => now });
    expect(limiter.consume('client-a').allowed).toBe(true);
    expect(limiter.consume('client-b')).toMatchObject({ allowed: false, reason: 'capacity' });
    now = 2_000;
    expect(limiter.consume('client-b')).toMatchObject({ allowed: true, remaining: 0 });
  });
});
