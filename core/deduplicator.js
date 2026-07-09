// src\services\ApiCenter\core\deduplicator.js

/**
 * ==========================================================
 * Request Deduplicator
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Prevent duplicate in-flight requests
 *  - Collapse identical requests into a single Promise
 *  - Automatically clean up after completion
 *
 * Use cases:
 *  - Rapid UI re-renders
 *  - Button double-clicks
 *  - Multiple components requesting same data
 *
 * ❌ No caching (edgeCache handles persistence)
 * ❌ No retry / auth logic
 * ==========================================================
 */

import stableStringify from 'fast-json-stable-stringify';

/**
 * ----------------------------------------------------------
 * Internal in-flight registry
 * ----------------------------------------------------------
 * key → Promise
 */
const inflight = new Map();

/**
 * ==========================================================
 * requestKey()
 * ----------------------------------------------------------
 * Generates a stable, deterministic key for a request.
 *
 * This ensures:
 *  - Same request → same key
 *  - Object order does not matter
 *
 * @param {Object} config - Axios request config
 * @returns {string}
 * ==========================================================
 */
export function requestKey(config) {
  return stableStringify({
    method: config.method,
    url: config.url,
    params: config.params,
    data: config.data,
    /**
     * baseURL intentionally excluded
     * (region is already resolved in url)
     */
  });
}

/**
 * ==========================================================
 * dedupe()
 * ----------------------------------------------------------
 * Executes the given function once per unique key.
 *
 * If another request with the same key is already in-flight,
 * the same Promise is returned.
 *
 * @param {string} key
 * @param {Function} executor - async function performing request
 * @returns {Promise<any>}
 * ==========================================================
 */
export function dedupe(key, executor) {
  /**
   * ------------------------------------------------------
   * EXISTING IN-FLIGHT REQUEST
   * ------------------------------------------------------
   */
  if (inflight.has(key)) {
    return inflight.get(key);
  }

  /**
   * ------------------------------------------------------
   * EXECUTE AND REGISTER PROMISE
   * ------------------------------------------------------
   */
  const promise = Promise.resolve()
    .then(executor)
    .finally(() => {
      /**
       * --------------------------------------------------
       * CLEANUP
       * --------------------------------------------------
       * Always remove key after resolution or rejection
       */
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * ==========================================================
 * clearDeduplication()
 * ----------------------------------------------------------
 * Clears ALL in-flight deduplication entries.
 *
 * Use cases:
 *  - Logout
 *  - App reset
 *  - Tenant switch
 * ==========================================================
 */
export function clearDeduplication() {
  inflight.clear();
}

/**
 * ==========================================================
 * getDeduplicationSnapshot()
 * ----------------------------------------------------------
 * Read-only snapshot for debugging / observability
 * ==========================================================
 */
export function getDeduplicationSnapshot() {
  return Array.from(inflight.keys());
}
