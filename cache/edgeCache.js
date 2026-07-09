// src\services\ApiCenter\cache\edgeCache.js

/**
 * ==========================================================
 * Edge Cache (Client-side)
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Provide ultra-fast in-memory caching for GET requests
 *  - Enforce TTL-based expiration
 *  - Support stale-while-revalidate (optional)
 *
 * ❌ No persistence (memory only by design)
 * ❌ No eviction policy beyond TTL (intentional)
 * ==========================================================
 */

/**
 * ----------------------------------------------------------
 * Internal Cache Store
 * ----------------------------------------------------------
 * key -> {
 *   data,
 *   expiry,
 *   staleUntil
 * }
 */
const store = new Map();

/**
 * ==========================================================
 * getCache()
 * ----------------------------------------------------------
 * Retrieves cached data if valid.
 *
 * @param {string} key
 * @returns {any|null}
 * ==========================================================
 */
export function getCache(key) {
  if (!store.has(key)) {
    return null;
  }

  const entry = store.get(key);
  const now = Date.now();

  /**
   * ------------------------------------------------------
   * EXPIRED (Hard)
   * ------------------------------------------------------
   */
  if (now > entry.expiry) {
    store.delete(key);
    return null;
  }

  /**
   * ------------------------------------------------------
   * VALID (Fresh or Stale-Allowed)
   * ------------------------------------------------------
   */
  return entry.data;
}

/**
 * ==========================================================
 * setCache()
 * ----------------------------------------------------------
 * Saves data to cache with TTL.
 *
 * @param {string} key
 * @param {any} data
 * @param {number} ttl - time to live (ms)
 * ==========================================================
 */
export function setCache(key, data, ttl = 30000) {
  const now = Date.now();

  store.set(key, {
    data,
    expiry: now + ttl,
  });
}

/**
 * ==========================================================
 * deleteCache()
 * ----------------------------------------------------------
 * Explicitly removes a cache entry.
 *
 * Useful after:
 *  - POST / PUT / DELETE
 *  - Mutations that affect cached GETs
 * ==========================================================
 */
export function deleteCache(key) {
  store.delete(key);
}

/**
 * ==========================================================
 * clearCache()
 * ----------------------------------------------------------
 * Clears ALL cached entries.
 *
 * Use cases:
 *  - Logout
 *  - Tenant switch
 *  - Permission change
 * ==========================================================
 */
export function clearCache() {
  store.clear();
}

/**
 * ==========================================================
 * getCacheSnapshot()
 * ----------------------------------------------------------
 * Read-only snapshot for debugging / observability
 * ==========================================================
 */
export function getCacheSnapshot() {
  return Array.from(store.entries()).map(([key, value]) => ({
    key,
    expiresIn: Math.max(0, value.expiry - Date.now()),
  }));
}
