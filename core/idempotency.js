/**
 * ==========================================================
 * Idempotency
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Ensure write operations are executed exactly once
 *  - Prevent duplicate writes during retries / replays
 *  - Provide stable idempotency keys across retries
 *
 * Applies to:
 *  - POST
 *  - PUT
 *  - PATCH
 *  - DELETE
 *
 * ❌ No network calls
 * ❌ No persistence (offlineQueue stores request state)
 * ==========================================================
 */

import { v4 as uuid } from 'uuid';

/**
 * ----------------------------------------------------------
 * Internal key store
 * ----------------------------------------------------------
 * requestKey → idempotencyKey
 *
 * Keeps idempotency keys stable across retries
 * within the same app lifecycle.
 */
const keyStore = Object.create(null);

/**
 * ==========================================================
 * attachIdempotency()
 * ----------------------------------------------------------
 * Attaches an Idempotency-Key header if required.
 *
 * Rules:
 *  - Enabled only if api.idempotent === true
 *  - Reuses same key across retries
 *  - Caller can override via config.headers
 *
 * @param {Object} config - Axios request config
 * @param {Object} api    - apiBook entry (apiMeta)
 *
 * @returns {Object} config
 * ==========================================================
 */
export function attachIdempotency(config, api = {}) {
  if (!api.idempotent) {
    return config;
  }

  const method = config.method?.toLowerCase();

  /**
   * ------------------------------------------------------
   * ONLY FOR WRITE OPERATIONS
   * ------------------------------------------------------
   */
  if (!['post', 'put', 'patch', 'delete'].includes(method)) {
    return config;
  }

  config.headers = config.headers || {};

  /**
   * ------------------------------------------------------
   * RESPECT EXPLICIT KEY (CALLER OVERRIDE)
   * ------------------------------------------------------
   */
  if (config.headers['Idempotency-Key']) {
    return config;
  }

  /**
   * ------------------------------------------------------
   * GENERATE STABLE REQUEST FINGERPRINT
   * ------------------------------------------------------
   * Same request → same idempotency key
   */
  const fingerprint = [method, config.url, JSON.stringify(config.data ?? {})].join('|');

  /**
   * ------------------------------------------------------
   * REUSE OR CREATE KEY
   * ------------------------------------------------------
   */
  if (!keyStore[fingerprint]) {
    keyStore[fingerprint] = uuid();
  }

  config.headers['Idempotency-Key'] = keyStore[fingerprint];

  return config;
}

/**
 * ==========================================================
 * clearIdempotency()
 * ----------------------------------------------------------
 * Clears all stored idempotency keys.
 *
 * Use cases:
 *  - Logout
 *  - App reset
 * ==========================================================
 */
export function clearIdempotency() {
  Object.keys(keyStore).forEach((key) => {
    delete keyStore[key];
  });
}

/**
 * ==========================================================
 * getIdempotencySnapshot()
 * ----------------------------------------------------------
 * Read-only snapshot for debugging / observability
 * ==========================================================
 */
export function getIdempotencySnapshot() {
  return Object.entries(keyStore).map(([fingerprint, key]) => ({
    fingerprint,
    key
  }));
}
