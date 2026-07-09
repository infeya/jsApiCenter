/**
 * ==========================================================
 * Rate Limiter (Client-side)
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Prevent excessive API calls from UI / automation
 *  - Protect backend from request storms
 *  - Fail fast before network execution
 *
 * Strategy:
 *  - Token Bucket
 *  - Per-API isolation
 *  - Time-based refill
 *
 * ❌ No retries
 * ❌ No queuing (offlineQueue handles that)
 * ==========================================================
 */

/**
 * ----------------------------------------------------------
 * Internal bucket registry
 * ----------------------------------------------------------
 * key → {
 *   tokens,
 *   lastRefill
 * }
 */
const buckets = Object.create(null);

/**
 * ==========================================================
 * rateLimit()
 * ----------------------------------------------------------
 * Enforces rate limit for a given API key.
 *
 * @param {string} key - API key / route
 * @param {Object} options
 *   - limit    : max requests per interval
 *   - interval : time window in ms
 *
 * @throws Error when rate limit is exceeded
 * ==========================================================
 */
export function rateLimit(key, options = {}) {
  const { limit = 5, interval = 1000 } = options;

  const now = Date.now();

  /**
   * ------------------------------------------------------
   * INITIALIZE BUCKET
   * ------------------------------------------------------
   */
  if (!buckets[key]) {
    buckets[key] = {
      tokens: limit,
      lastRefill: now
    };
  }

  const bucket = buckets[key];

  /**
   * ------------------------------------------------------
   * REFILL TOKENS
   * ------------------------------------------------------
   * Tokens are refilled proportionally over time
   */
  const elapsed = now - bucket.lastRefill;
  const refillRate = limit / interval;

  bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  /**
   * ------------------------------------------------------
   * CHECK AVAILABILITY
   * ------------------------------------------------------
   */
  if (bucket.tokens < 1) {
    throw new Error('Client rate limit exceeded');
  }

  /**
   * ------------------------------------------------------
   * CONSUME TOKEN
   * ------------------------------------------------------
   */
  bucket.tokens -= 1;
}

/**
 * ==========================================================
 * resetRateLimit()
 * ----------------------------------------------------------
 * Clears rate limit state for a specific API key.
 *
 * Useful for:
 *  - Logout
 *  - Tenant change
 * ==========================================================
 */
export function resetRateLimit(key) {
  if (buckets[key]) {
    delete buckets[key];
  }
}

/**
 * ==========================================================
 * resetAllRateLimits()
 * ----------------------------------------------------------
 * Clears ALL rate limit buckets.
 * ==========================================================
 */
export function resetAllRateLimits() {
  Object.keys(buckets).forEach((key) => {
    delete buckets[key];
  });
}

/**
 * ==========================================================
 * getRateLimitSnapshot()
 * ----------------------------------------------------------
 * Read-only snapshot for debugging / observability
 * ==========================================================
 */
export function getRateLimitSnapshot() {
  return Object.entries(buckets).map(([key, bucket]) => ({
    key,
    tokens: Math.floor(bucket.tokens),
    lastRefill: bucket.lastRefill
  }));
}
