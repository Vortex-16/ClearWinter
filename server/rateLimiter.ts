export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  maxKeys?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Creates a bounded in-memory sliding-window rate limiter per client key.
 * Evicts the oldest entry when `maxKeys` is reached to cap memory under burst traffic.
 */
export function createRateLimiter({ windowMs, maxRequests, maxKeys = 2000 }: RateLimiterOptions) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function checkLimit(key: string, nowMs = Date.now()): RateLimitDecision {
    const safeKey = key || 'unknown';
    const current = buckets.get(safeKey);

    if (!current || nowMs >= current.resetAt) {
      if (buckets.size >= maxKeys) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) {
          buckets.delete(oldestKey);
        }
      }
      buckets.set(safeKey, { count: 1, resetAt: nowMs + windowMs });
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - 1),
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - nowMs) / 1000)),
      };
    }

    current.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - current.count),
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - nowMs) / 1000)),
    };
  };
}
