/**
 * ==========================================================
 * Request Signer
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Cryptographically sign outgoing requests
 *  - Guarantee request integrity (no tampering)
 *  - Provide replay-attack protection
 *
 * Signature strategy:
 *  - SHA256 body hash
 *  - HMAC-SHA256 signature
 *  - Timestamp + nonce
 *
 * ❌ No network calls
 * ❌ No secret storage
 * ❌ No auth / refresh logic
 * ==========================================================
 */

import crypto from 'crypto-js';

/**
 * ==========================================================
 * signRequest()
 * ----------------------------------------------------------
 * Attaches request signature headers.
 *
 * Signed payload format:
 *   METHOD | URL | BODY_HASH | TIMESTAMP | NONCE
 *
 * Headers added:
 *   X-Signature
 *   X-Timestamp
 *   X-Nonce
 *
 * @param {Object} config  - Axios request config
 * @param {string} secret - Shared signing secret
 *
 * @returns {Object} config
 * ==========================================================
 */
export function signRequest(config, secret) {
  if (!secret) {
    return config;
  }

  /**
   * ------------------------------------------------------
   * TIMESTAMP & NONCE
   * ------------------------------------------------------
   * Timestamp → replay window validation
   * Nonce     → uniqueness guarantee
   */
  const timestamp = Date.now().toString();
  const nonce = crypto.lib.WordArray.random(16).toString();

  /**
   * ------------------------------------------------------
   * BODY HASH
   * ------------------------------------------------------
   * Ensures payload integrity
   */
  const body = config.data !== undefined ? JSON.stringify(config.data) : '';

  const bodyHash = crypto.SHA256(body).toString();

  /**
   * ------------------------------------------------------
   * PAYLOAD TO SIGN
   * ------------------------------------------------------
   * URL already includes:
   *  - resolved region
   *  - resolved version
   */
  const payload = [
    config.method?.toUpperCase(),
    config.url,
    bodyHash,
    timestamp,
    nonce
  ].join('|');

  /**
   * ------------------------------------------------------
   * GENERATE SIGNATURE
   * ------------------------------------------------------
   */
  const signature = crypto.HmacSHA256(payload, secret).toString();

  /**
   * ------------------------------------------------------
   * ATTACH SIGNATURE HEADERS
   * ------------------------------------------------------
   */
  config.headers = config.headers || {};
  config.headers['X-Signature'] = signature;
  config.headers['X-Timestamp'] = timestamp;
  config.headers['X-Nonce'] = nonce;

  /**
   * ------------------------------------------------------
   * OPTIONAL DEBUG / TRACE HEADERS
   * ------------------------------------------------------
   * Useful for observability and audits
   */
  config.headers['X-Signature-Alg'] = 'HMAC-SHA256';

  return config;
}
