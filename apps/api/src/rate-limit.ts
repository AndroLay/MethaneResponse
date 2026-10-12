export type FixedWindowRateLimitOptions = {
  limit: number;
  windowMs: number;
  maxEntries?: number;
  now?: () => number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  reason?: 'limit' | 'capacity';
};

/** A bounded, process-local limiter for low-volume prototype write endpoints. */
export function createFixedWindowRateLimiter(options: FixedWindowRateLimitOptions) {
  const { limit, windowMs, maxEntries = 4_096, now = Date.now } = options;
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) throw new RangeError('windowMs must be a positive integer');
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) throw new RangeError('maxEntries must be a positive integer');

  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    limit,
    consume(key: string): RateLimitDecision {
      const currentTime = now();
      let window = windows.get(key);
      if (window && window.resetAt <= currentTime) {
        windows.delete(key);
        window = undefined;
      }

      if (!window) {
        if (windows.size >= maxEntries) {
          for (const [existingKey, existing] of windows) {
            if (existing.resetAt <= currentTime) windows.delete(existingKey);
          }
        }
        if (windows.size >= maxEntries) {
          return { allowed: false, remaining: 0, resetAt: currentTime + windowMs, reason: 'capacity' };
        }
        window = { count: 0, resetAt: currentTime + windowMs };
        windows.set(key, window);
      }

      if (window.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: window.resetAt, reason: 'limit' };
      }
      window.count += 1;
      return { allowed: true, remaining: limit - window.count, resetAt: window.resetAt };
    },
  };
}
