/**
 * ==========================================================
 * API Version Router
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Apply API versioning to requests
 *  - Support multiple versioning strategies
 *  - Keep version logic isolated from execution logic
 *
 * Supported strategies:
 *  - Path-based     → /v1/users
 *  - Header-based   → X-API-Version: 1
 *  - Query-based    → ?api_version=1
 *
 * ❌ No network logic
 * ❌ No retries
 * ❌ No auth logic
 * ==========================================================
 */

/**
 * ==========================================================
 * applyVersion()
 * ----------------------------------------------------------
 * Mutates request config to include API version.
 *
 * @param {Object} config - Axios request config
 * @param {Object} api    - apiBook entry
 *
 * api.version example:
 * {
 *   type: 'path' | 'header' | 'query',
 *   value: '1'
 * }
 * ==========================================================
 */
export function applyVersion(config, api = {}) {
  if (!api.version) {
    return;
  }

  const { type, value } = api.version;

  /**
   * ------------------------------------------------------
   * PATH-BASED VERSIONING
   * ------------------------------------------------------
   * /users → /v1/users
   */
  if (type === 'path') {
    // Prevent double prefixing
    if (!config.url.startsWith(`/v${value}`)) {
      config.url = `/v${value}${config.url}`;
    }
  }

  /**
   * ------------------------------------------------------
   * HEADER-BASED VERSIONING
   * ------------------------------------------------------
   * X-API-Version: 1
   */
  if (type === 'header') {
    config.headers = config.headers || {};
    config.headers['X-API-Version'] = value;
  }

  /**
   * ------------------------------------------------------
   * QUERY-BASED VERSIONING
   * ------------------------------------------------------
   * ?api_version=1
   */
  if (type === 'query') {
    config.params = config.params || {};
    config.params.api_version = value;
  }
}
