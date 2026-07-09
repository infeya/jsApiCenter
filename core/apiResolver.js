// src\services\ApiCenter\core\apiResolver.js

/**
 * ==========================================================
 * ApiResolver
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Resolve host configuration
 *  - Resolve effective auth configuration
 *  - Normalize apiBook entry for execution
 *
 * ❌ No network calls
 * ❌ No axios logic
 * ❌ No auth execution
 * ==========================================================
 */

import { GlobalConfig } from './config';

export function resolveApi(api = {}) {
  /**
   * ------------------------------------------------------
   * HOST RESOLUTION
   * ------------------------------------------------------
   */
  const host = api.host || GlobalConfig.http?.hosts[GlobalConfig.http?.defaultHost] || {};

  /**
   * ------------------------------------------------------
   * AUTH RESOLUTION
   * ------------------------------------------------------
   * Priority:
   *  1. api.auth === false
   *  2. api.auth object
   *  3. api.auth === true → inherit host.auth
   */
  let resolvedAuth = null;

  if (api.auth === false) {
    resolvedAuth = { strategy: 'none' };
  } else if (typeof api.auth === 'object') {
    resolvedAuth = api.auth;
  } else if (api.auth === true) {
    resolvedAuth = host.auth || null;
  }

  /**
   * ------------------------------------------------------
   * NORMALIZED API META
   * ------------------------------------------------------
   */
  return {
    ...api,

    /**
     * Resolved host
     */
    __host: host,

    /**
     * Resolved auth (for AuthEngine)
     */
    __resolvedAuth: resolvedAuth,

    /**
     * Static headers from host + api
     */
    __headers: {
      ...(host.headers || {}),
      ...(api.header || {}),
    },
  };
}
