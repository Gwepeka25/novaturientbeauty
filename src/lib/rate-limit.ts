// Simple in-memory rate limiter. Fine for a single Node instance (this
// project's deploy target); if you later run multiple instances behind a
// load balancer, replace this with a shared store (e.g. Redis).

type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets: Map<string, Bucket> | undefined;
  rateLimitCleanupStarted: boolean | undefined;
};

const buckets = globalForRateLimit.rateLimitBuckets ?? new Map<string, Bucket>();
globalForRateLimit.rateLimitBuckets = buckets;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

// Periodically forget old buckets so this doesn't grow unbounded.
if (!globalForRateLimit.rateLimitCleanupStarted) {
  globalForRateLimit.rateLimitCleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 5 * 60_000);
}
