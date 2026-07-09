import { GlobalConfig } from '../core/config';

/**
 * ==========================================================
 * Apply Region
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Resolve the best region for a request
 *  - Apply region-specific baseURL
 *  - Tag request with region metadata
 *
 * ❌ No network calls
 * ❌ No retries / circuit logic
 * ❌ No health checks (handled elsewhere)
 * ==========================================================
 */

import { resolveRegion } from './regionResolver';

/**
 * ==========================================================
 * applyRegion()
 * ----------------------------------------------------------
 * Mutates Axios request config to apply region routing.
 *
 * @param {Object} config  - Axios request config
 * @param {Object} api     - apiBook entry
 * @param {Object} context - runtime context
 *   {
 *     region?: string,   // explicit region pin
 *     geo?: string,      // geo-based preference
 *     tenant?: string,  // tenant-based routing (future)
 *   }
 *
 * @throws Error if no healthy region is available
 * ==========================================================
 */
export function applyRegion(config, api = {}, context = {}) {
  /**
   * ------------------------------------------------------
   * RESOLVE REGION
   * ------------------------------------------------------
   * Resolution order (handled by resolver):
   *  1. API-level pinning
   *  2. Context override (user / tenant)
   *  3. Geo preference
   *  4. Priority-based healthy fallback
   */
  const region = resolveRegion(api, context);

  if (!region) {
    /**
     * Hard failure: no healthy region available
     * Circuit breaker + retry will prevent storms
     */
    // throw new Error('No healthy region available');
    config.baseURL = config.baseURL || GlobalConfig.http?.baseURL;

    return config;
  }

  /**
   * ------------------------------------------------------
   * APPLY BASE URL
   * ------------------------------------------------------
   * Overrides axios baseURL dynamically
   */
  config.baseURL = region.baseURL;

  /**
   * ------------------------------------------------------
   * TAG REGION HEADER
   * ------------------------------------------------------
   * Used for:
   *  - observability
   *  - backend routing
   *  - debugging
   *  - signature / HMAC protection
   */
  config.headers = config.headers || {};
  config.headers['X-Region'] = region.code;

  /**
   * ------------------------------------------------------
   * ATTACH REGION METADATA (INTERNAL)
   * ------------------------------------------------------
   * Not sent to backend
   * Useful for tracing / debugging
   */
  config.__region = region.code;

  return config;
}
