/**
 * ==========================================================
 * Region State
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Track health of each region
 *  - Provide fast, synchronous health checks
 *  - Support automatic failover & recovery
 *
 * Design principles:
 *  - In-memory only (fast, deterministic)
 *  - Event-driven updates (no polling)
 *  - Executor-controlled state transitions
 *
 * ❌ No network calls
 * ❌ No retry logic
 * ❌ No region selection logic
 * ==========================================================
 */

/**
 * ----------------------------------------------------------
 * Internal region health registry
 * ----------------------------------------------------------
 * regionCode → {
 *   healthy: boolean,
 *   lastFailure: number | null,
 * }
 */
const regionHealth = Object.create(null);

/**
 * ==========================================================
 * markHealthy()
 * ----------------------------------------------------------
 * Marks a region as healthy.
 *
 * Called after a successful request execution.
 *
 * @param {string} regionCode
 * ==========================================================
 */
export function markHealthy(regionCode) {
  if (!regionCode) {
    return;
  }

  regionHealth[regionCode] = {
    healthy: true,
    lastFailure: null
  };
}

/**
 * ==========================================================
 * markUnhealthy()
 * ----------------------------------------------------------
 * Marks a region as unhealthy.
 *
 * Called when:
 *  - network error
 *  - repeated server errors
 *  - circuit breaker opens
 *
 * @param {string} regionCode
 * ==========================================================
 */
export function markUnhealthy(regionCode) {
  if (!regionCode) {
    return;
  }

  regionHealth[regionCode] = {
    healthy: false,
    lastFailure: Date.now()
  };
}

/**
 * ==========================================================
 * isHealthy()
 * ----------------------------------------------------------
 * Checks whether a region is considered healthy.
 *
 * Default behavior:
 *  - Unknown region → healthy (optimistic)
 *  - Known unhealthy region → unhealthy
 *
 * @param {string} regionCode
 * @returns {boolean}
 * ==========================================================
 */
export function isHealthy(regionCode) {
  if (!regionCode) {
    return false;
  }

  const state = regionHealth[regionCode];

  /**
   * Unknown region = optimistic healthy
   */
  if (!state) {
    return true;
  }

  return state.healthy !== false;
}

/**
 * ==========================================================
 * getRegionState()
 * ----------------------------------------------------------
 * Read-only access to a region's state.
 *
 * Useful for:
 *  - debugging
 *  - observability
 *
 * @param {string} regionCode
 * @returns {Object|null}
 * ==========================================================
 */
export function getRegionState(regionCode) {
  return regionHealth[regionCode] ? { ...regionHealth[regionCode] } : null;
}

/**
 * ==========================================================
 * resetRegion()
 * ----------------------------------------------------------
 * Clears health state for a single region.
 *
 * Use cases:
 *  - manual recovery
 *  - admin override
 *
 * @param {string} regionCode
 * ==========================================================
 */
export function resetRegion(regionCode) {
  if (regionHealth[regionCode]) {
    delete regionHealth[regionCode];
  }
}

/**
 * ==========================================================
 * resetAllRegions()
 * ----------------------------------------------------------
 * Clears ALL region health states.
 *
 * Use cases:
 *  - logout
 *  - app reset
 *  - environment switch
 * ==========================================================
 */
export function resetAllRegions() {
  Object.keys(regionHealth).forEach((key) => {
    delete regionHealth[key];
  });
}

/**
 * ==========================================================
 * getRegionSnapshot()
 * ----------------------------------------------------------
 * Read-only snapshot of all region states.
 *
 * Useful for:
 *  - diagnostics
 *  - telemetry export
 * ==========================================================
 */
export function getRegionSnapshot() {
  return Object.entries(regionHealth).map(([regionCode, state]) => ({
    region: regionCode,
    healthy: state.healthy,
    lastFailure: state.lastFailure
  }));
}
