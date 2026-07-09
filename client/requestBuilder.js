// src\services\ApiCenter\client\requestBuilder.js

/**
 * ==========================================================
 * Request Builder (Client Layer)
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Build a fully-normalized Axios request config
 *  - Resolve dynamic route slugs
 *  - Attach query params & body
 *  - Apply API versioning
 *  - Apply multi-region routing
 *  - Attach API metadata for interceptors
 *
 * ❌ No network calls
 * ❌ No retries / auth logic
 * ❌ No response parsing
 * ==========================================================
 */

import qs from 'qs';

import { applyVersion } from '../core/versionRouter';
import { applyRegion } from '../region/applyRegion';

/**
 * ==========================================================
 * buildRequest()
 * ----------------------------------------------------------
 * @param {Object} api      - apiBook entry
 * @param {Object} data     - { slug, param, body }
 * @param {Object} config   - axios overrides (timeout, signal, headers)
 * @param {Object} context  - runtime context (region, geo, tenant)
 * ==========================================================
 */
export function buildRequest(api, data = {}, config = {}, context = {}) {
  /**
   * ------------------------------------------------------
   * BASE ROUTE
   * ------------------------------------------------------
   */
  let url = api.route;

  /**
   * ------------------------------------------------------
   * SLUG REPLACEMENT
   * ------------------------------------------------------
   * Example:
   *   route: /users/:id
   *   slug: { id: 42 }
   *   → /users/42
   */
  if (data.slug) {
    Object.entries(data.slug).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    });
  }

  /**
   * ------------------------------------------------------
   * AXIOS REQUEST CONFIG
   * ------------------------------------------------------
   */
  const requestConfig = {
    /**
     * HTTP method
     */
    method: api.method.toLowerCase(),

    /**
     * Final resolved URL (without baseURL)
     */
    url,

    /**
     * Headers
     * - merged later by axios & interceptors
     */
    headers: {
      ...(config.headers || {}),
    },

    /**
     * Query params (?a=1&b=2)
     */
    params: data.param || undefined,

    /**
     * Safe query serialization
     */
    paramsSerializer: (params) => qs.stringify(params, { encode: false }),

    /**
     * Request body
     * (POST / PUT / PATCH)
     */
    data: data.body || undefined,

    /**
     * Axios runtime config
     * - timeout
     * - signal (AbortController)
     * - withCredentials
     */
    ...config,

    /**
     * API metadata
     * --------------------------------------------------
     * Used by interceptors for:
     *  - auth
     *  - refresh
     *  - idempotency
     *  - signing
     *  - HMAC
     *  - observability
     */
    apiMeta: api,
  };

  /**
   * ------------------------------------------------------
   * API VERSIONING
   * ------------------------------------------------------
   * - Path-based (/v1/users)
   * - Header-based (X-API-Version)
   */
  applyVersion(requestConfig, api);

  /**
   * ------------------------------------------------------
   * MULTI-REGION ROUTING
   * ------------------------------------------------------
   * Dynamically assigns:
   *  - baseURL
   *  - X-Region header
   */
  applyRegion(requestConfig, api, context);

  /**
   * ------------------------------------------------------
   * FINAL REQUEST CONFIG
   * ------------------------------------------------------
   */
  return requestConfig;
}
