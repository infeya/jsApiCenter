// src\services\ApiCenter\core\circuitBreaker.js

/**
 * ==========================================================
 * Circuit Breaker
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Prevent repeated calls to a failing backend
 *  - Fail fast when a service is unhealthy
 *  - Automatically recover after cooldown
 *
 * States:
 *  - CLOSED   → normal operation
 *  - OPEN     → requests blocked
 *  - HALF-OPEN→ probe recovery
 *
 * ❌ No retries (executor handles retry)
 * ❌ No logging / UI logic
 * ==========================================================
 */

/**
 * ----------------------------------------------------------
 * Internal breaker registry
 * ----------------------------------------------------------
 * key → breaker state
 */
const breakers = Object.create(null);

/**
 * ==========================================================
 * getBreaker()
 * ----------------------------------------------------------
 * Initializes or retrieves a breaker for a given key
 * ==========================================================
 */
function getBreaker(key, options) {
  if (!breakers[key]) {
    breakers[key] = {
      state: 'CLOSED',
      failures: 0,
      lastFailureTime: 0,
      options,
    };
  }

  return breakers[key];
}

/**
 * ==========================================================
 * circuit()
 * ----------------------------------------------------------
 * Wraps a function call with circuit breaker protection
 *
 * @param {string} key - API key / route
 * @param {Function} fn - async function to execute
 * @param {Object} options
 *   - failureThreshold (number)
 *   - cooldown (ms)
 *
 * @returns {Promise<any>}
 * ==========================================================
 */
export async function circuit(key, fn, options = {}) {
  const { failureThreshold = 5, cooldown = 10000 } = options;

  const breaker = getBreaker(key, options);
  const now = Date.now();

  /**
   * ------------------------------------------------------
   * OPEN STATE
   * ------------------------------------------------------
   * Reject immediately until cooldown expires
   */
  if (breaker.state === 'OPEN') {
    if (now - breaker.lastFailureTime > cooldown) {
      /**
       * Move to HALF-OPEN and allow one probe request
       */
      breaker.state = 'HALF_OPEN';
    } else {
      throw new Error('Circuit breaker open');
    }
  }

  try {
    /**
     * --------------------------------------------------
     * EXECUTE PROTECTED FUNCTION
     * --------------------------------------------------
     */
    const result = await fn();

    /**
     * --------------------------------------------------
     * SUCCESS
     * --------------------------------------------------
     * Reset breaker on success
     */
    breaker.state = 'CLOSED';
    breaker.failures = 0;
    breaker.lastFailureTime = 0;

    return result;
  } catch (error) {
    /**
     * --------------------------------------------------
     * FAILURE
     * --------------------------------------------------
     */
    breaker.failures += 1;
    breaker.lastFailureTime = now;

    /**
     * --------------------------------------------------
     * TRANSITION TO OPEN
     * --------------------------------------------------
     */
    if (breaker.failures >= failureThreshold) {
      breaker.state = 'OPEN';
    }

    throw error;
  }
}

/**
 * ==========================================================
 * resetCircuit()
 * ----------------------------------------------------------
 * Manually reset a circuit breaker
 *
 * Useful for:
 *  - admin override
 *  - logout
 *  - environment switch
 * ==========================================================
 */
export function resetCircuit(key) {
  if (breakers[key]) {
    delete breakers[key];
  }
}

/**
 * ==========================================================
 * resetAllCircuits()
 * ----------------------------------------------------------
 * Clears ALL circuit breakers
 * ==========================================================
 */
export function resetAllCircuits() {
  Object.keys(breakers).forEach((key) => {
    delete breakers[key];
  });
}

/**
 * ==========================================================
 * getCircuitSnapshot()
 * ----------------------------------------------------------
 * Read-only state for debugging / observability
 * ==========================================================
 */
export function getCircuitSnapshot() {
  return Object.entries(breakers).map(([key, state]) => ({
    key,
    state: state.state,
    failures: state.failures,
    lastFailureTime: state.lastFailureTime,
  }));
}
