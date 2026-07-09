// src\services\ApiCenter\client\axiosFactory.js

/**
 * ==========================================================
 * Axios Factory
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Create isolated Axios instances
 *  - Apply global + per-API defaults
 *  - Attach interceptors (auth, refresh, retry, tracing, etc.)
 *
 * ❌ No request building
 * ❌ No business logic
 * ❌ No response parsing
 * ==========================================================
 */

import axios from 'axios';
import applyInterceptors from './interceptors';
import { GlobalConfig } from '../core/config';

/**
 * ==========================================================
 * createAxiosClient()
 * ----------------------------------------------------------
 * Creates a new Axios instance per API call / API group.
 *
 * Why per-instance?
 *  - Prevent interceptor pollution
 *  - Support per-API baseURL (multi-region)
 *  - Support per-API auth / headers / timeout
 * ==========================================================
 */
export function createAxiosClient(overrides = {}) {
  const DefaultHost = GlobalConfig.http?.hosts[GlobalConfig.http?.defaultHost] || {};
  /**
   * ------------------------------------------------------
   * AXIOS INSTANCE CONFIGURATION
   * ------------------------------------------------------
   */
  const instance = axios.create({
    /**
     * Base URL
     * - Resolved dynamically via multi-region routing
     * - Can be overridden per API
     */
    baseURL: overrides.baseURL || DefaultHost.baseURL,

    /**
     * Request timeout (ms)
     * - Sensible global default
     * - Override per API when needed
     */
    timeout: overrides.timeout ?? DefaultHost.timeout,

    /**
     * Cookie handling
     * - Required for session-based auth
     * - Can be disabled per API
     */
    withCredentials: overrides.withCredentials ?? DefaultHost.withCredentials,

    /**
     * Default headers
     * - Global headers (app, platform, content-type)
     * - API-specific overrides
     */
    headers: {
      ...DefaultHost.headers,
      ...(overrides.headers || {}),
    },

    /**
     * Axios transitional settings
     * - Improves timeout error clarity
     */
    transitional: {
      clarifyTimeoutError: true,
    },
  });

  /**
   * ------------------------------------------------------
   * APPLY INTERCEPTORS
   * ------------------------------------------------------
   * Interceptors handle:
   *  - Auth token injection
   *  - Refresh token flow
   *  - HMAC / request signing
   *  - Idempotency keys
   *  - Observability (OpenTelemetry)
   *  - Error normalization
   */
  applyInterceptors(instance, overrides);

  /**
   * ------------------------------------------------------
   * RETURN ISOLATED CLIENT
   * ------------------------------------------------------
   */
  return instance;
}
