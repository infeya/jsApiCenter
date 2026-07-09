/**
 * ==========================================================
 * HMAC Authorization
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Generate HMAC-based Authorization headers
 *  - Provide stateless request authentication
 *  - Prevent tampering and replay attacks
 *
 * Typical usage:
 *  - Internal APIs
 *  - Edge / IoT endpoints
 *  - Service-to-service calls
 *
 * ❌ No network calls
 * ❌ No key storage
 * ❌ No refresh logic
 * ==========================================================
 */

import crypto from 'crypto-js';

/**
 * ==========================================================
 * attachHmacAuth()
 * ----------------------------------------------------------
 * Attaches an HMAC Authorization header to the request.
 *
 * Header format:
 *   Authorization: HMAC <key>:<signature>:<timestamp>
 *
 * Signature payload:
 *   METHOD | URL | TIMESTAMP
 *
 * @param {Object} config  - Axios request config
 * @param {string} key     - Public API key / client id
 * @param {string} secret  - Shared secret (never sent)
 *
 * @returns {Object} config
 * ==========================================================
 */
export function attachHmacAuth(config, key, secret) {
  if (!key || !secret) {
    return config;
  }

  const timestamp = Date.now().toString();

  /**
   * ------------------------------------------------------
   * PAYLOAD TO SIGN
   * ------------------------------------------------------
   * Keep payload minimal & deterministic
   */
  const payload = [config.method?.toUpperCase(), config.url, timestamp].join('|');

  /**
   * ------------------------------------------------------
   * GENERATE SIGNATURE
   * ------------------------------------------------------
   */
  const signature = crypto.HmacSHA256(payload, secret).toString();

  /**
   * ------------------------------------------------------
   * ATTACH AUTHORIZATION HEADER
   * ------------------------------------------------------
   */
  config.headers = config.headers || {};
  config.headers.Authorization = `HMAC ${key}:${signature}:${timestamp}`;

  /**
   * ------------------------------------------------------
   * OPTIONAL TRACE HEADERS (DEBUG / OBSERVABILITY)
   * ------------------------------------------------------
   */
  config.headers['X-HMAC-Key'] = key;

  return config;
}
