// src\services\ApiCenter\core\executor.js

/**
 * ==========================================================
 * Executor
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Create axios client (per API / per region)
 *  - Enforce rate limiting
 *  - Deduplicate in-flight requests
 *  - Apply edge cache (read-through)
 *  - Apply retry with exponential backoff
 *  - Apply circuit breaker protection
 *  - Track region health
 *
 * ❌ No request building
 * ❌ No response formatting
 * ❌ No business logic
 * ==========================================================
 */

import { createAxiosClient } from '../client/axiosFactory';

import { retry } from './retryExecutor';
import { dedupe, requestKey } from './deduplicator';
import { rateLimit } from './rateLimiter';
import { circuit } from './circuitBreaker';

import { getCache, setCache } from '../cache/edgeCache';
import { markHealthy, markUnhealthy } from '../region/regionState';

/**
 * ==========================================================
 * executeRequest()
 * ----------------------------------------------------------
 * The single place where a network call is actually executed
 * ==========================================================
 */
export async function executeRequest(api, requestConfig) {
  /**
   * ------------------------------------------------------
   * RATE LIMIT (Client-side protection)
   * ------------------------------------------------------
   * Prevent UI / bot storms
   */
  if (api.rateLimit) {
    rateLimit(api.key || api.route, api.rateLimit);
  }

  /**
   * ------------------------------------------------------
   * EDGE CACHE (GET only)
   * ------------------------------------------------------
   * Ultra-fast client-side cache
   */
  const cacheKey = requestKey(requestConfig);

  if (api.cache && requestConfig.method === 'get') {
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }
  }

  /**
   * ------------------------------------------------------
   * CREATE AXIOS CLIENT
   * ------------------------------------------------------
   * Client is already configured with:
   *  - interceptors
   *  - auth / refresh flow
   *  - observability hooks
   *  - signing / HMAC
   */
  const client = createAxiosClient(api.config);

  /**
   * ------------------------------------------------------
   * EXECUTION PIPELINE
   * ------------------------------------------------------
   * Order matters:
   *  1. Deduplication (collapse identical inflight calls)
   *  2. Circuit breaker (protect backend)
   *  3. Retry with backoff
   */
  const execute = () =>
    circuit(
      api.key || api.route,
      () =>
        retry(() => client(requestConfig), {
          retries: api.retry?.count ?? 0,
          delay: api.retry?.delay ?? 300,
          shouldRetry: (err) => !err.response || err.response.status >= 500,
        }),
      api.circuit,
    );

  /**
   * ------------------------------------------------------
   * RUN WITH DEDUPLICATION
   * ------------------------------------------------------
   */
  try {
    const response = api.dedupe ? await dedupe(cacheKey, execute) : await execute();

    /**
     * --------------------------------------------------
     * MARK REGION HEALTHY
     * --------------------------------------------------
     */
    if (requestConfig.headers?.['X-Region']) {
      markHealthy(requestConfig.headers['X-Region']);
    }

    /**
     * --------------------------------------------------
     * SAVE TO CACHE (POST-SUCCESS)
     * --------------------------------------------------
     */
    if (api.cache && requestConfig.method === 'get') {
      setCache(cacheKey, response, api.cache.ttl);
    }

    return response;
  } catch (error) {
    /**
     * --------------------------------------------------
     * MARK REGION UNHEALTHY
     * --------------------------------------------------
     */
    if (requestConfig.headers?.['X-Region']) {
      markUnhealthy(requestConfig.headers['X-Region']);
    }

    throw error;
  }
}
