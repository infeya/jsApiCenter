/**
 * ==========================================================
 * Region Resolver
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Decide which region should handle a request
 *  - Respect API-level pinning
 *  - Respect runtime context overrides
 *  - Prefer healthy regions
 *  - Fallback deterministically
 *
 * ❌ No request mutation
 * ❌ No network calls
 * ❌ No retries / circuit logic
 * ==========================================================
 */

// import { REGIONS } from './config/regions';
import { isHealthy } from './regionState';

const REGIONS = [];

/**
 * ==========================================================
 * resolveRegion()
 * ----------------------------------------------------------
 * Determines the best region for a given API call.
 *
 * Resolution priority (highest → lowest):
 *  1. API-level region pinning
 *  2. Runtime context override (user / tenant)
 *  3. Geo-based preference
 *  4. Priority-based healthy fallback
 *
 * @param {Object} api
 * @param {Object} context
 *   {
 *     region?: string,   // explicit region override
 *     geo?: string,      // geo hint (browser / IP)
 *     tenant?: string,  // reserved for future use
 *   }
 *
 * @returns {Object|null} region config
 * ==========================================================
 */
export function resolveRegion(api = {}, context = {}) {
  /**
   * ------------------------------------------------------
   * 1️⃣ API-LEVEL PINNING
   * ------------------------------------------------------
   * Strongest rule — API explicitly defines region
   */
  if (api.region && REGIONS[api.region]) {
    return REGIONS[api.region];
  }

  /**
   * ------------------------------------------------------
   * 2️⃣ CONTEXT OVERRIDE
   * ------------------------------------------------------
   * Used for:
   *  - user preference
   *  - tenant isolation
   *  - manual override
   */
  if (context.region && REGIONS[context.region]) {
    if (isHealthy(context.region)) {
      return REGIONS[context.region];
    }
  }

  /**
   * ------------------------------------------------------
   * 3️⃣ GEO-BASED PREFERENCE
   * ------------------------------------------------------
   * Non-authoritative hint (best-effort)
   */
  if (context.geo && REGIONS[context.geo]) {
    if (isHealthy(context.geo)) {
      return REGIONS[context.geo];
    }
  }

  /**
   * ------------------------------------------------------
   * 4️⃣ PRIORITY-BASED FALLBACK
   * ------------------------------------------------------
   * Select the highest-priority healthy region
   */
  const healthyRegions = Object.values(REGIONS)
    .filter((region) => isHealthy(region.code))
    .sort((a, b) => a.priority - b.priority);

  if (healthyRegions.length > 0) {
    return healthyRegions[0];
  }

  /**
   * ------------------------------------------------------
   * NO HEALTHY REGION AVAILABLE
   * ------------------------------------------------------
   * Let caller decide how to fail (circuit breaker)
   */
  return null;
}
