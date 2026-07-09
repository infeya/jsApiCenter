import { GlobalConfig } from './config';

/**
 * ==========================================================
 * Response Parser
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Convert ANY response (success / error / cancel)
 *    into a single ISO-style response contract
 *  - Provide semantic UI intent (`uiClass`)
 *  - Provide framework-ready UI variant (`uiVariant`)
 *  - Shield UI from HTTP / Axios / transport details
 *  - Guarantee predictable fields everywhere
 *
 * ❌ No network logic
 * ❌ No retries
 * ❌ No auth logic
 * ==========================================================
 */

/**
 * ==========================================================
 * parseResponse()
 * ----------------------------------------------------------
 * Normalizes both success & error responses.
 *
 * UI MUST rely only on:
 *  - success
 *  - statusCode
 *  - message
 *  - data
 *  - errors
 *  - uiClass     (semantic intent)
 *  - uiVariant   (bootstrap-ready)
 *
 * @param {Object} response
 * @returns {Object} normalized response object
 * ==========================================================
 */
export function parseResponse(response = {}) {
  /**
   * ------------------------------------------------------
   * STATUS CODE RESOLUTION
   * ------------------------------------------------------
   * Supports:
   *  - Axios response (response.status)
   *  - Normalized error (response.statusCode)
   */
  const statusCode = response.status ?? response.statusCode ?? 500;

  /**
   * ------------------------------------------------------
   * BASE RESPONSE SHAPE (ISO STYLE)
   * ------------------------------------------------------
   * This structure NEVER changes.
   */
  const result = {
    success: statusCode >= 200 && statusCode < 300,
    statusCode,

    message: null,
    data: null,
    errors: null,

    /**
     * uiClass
     * --------------------------------------------------
     * Semantic intent for UI behavior
     *
     * Possible values:
     *  - success
     *  - warning
     *  - error
     *  - info
     *  - network
     *  - cancelled
     */
    uiClass: null,

    /**
     * uiVariant
     * --------------------------------------------------
     * UI framework mapping (Bootstrap compatible)
     *
     * Possible values:
     *  - success
     *  - warning
     *  - danger
     *  - info
     *  - secondary
     *  - null (no UI)
     */
    uiVariant: null,

    meta: {
      timestamp: Date.now(),
    },
  };

  /**
   * ------------------------------------------------------
   * REQUEST CANCELLED (CLIENT SIDE)
   * ------------------------------------------------------
   * Example:
   *  - AbortController
   *  - Component unmount
   */
  if (response.__cancelled) {
    result.success = false;
    result.statusCode = 499;
    result.message = 'Request cancelled by client';
    result.uiClass = 'cancelled';
    result.uiVariant = resolveUiVariant(result.uiClass);
    return result;
  }

  /**
   * ------------------------------------------------------
   * SUCCESS RESPONSE (2xx)
   * ------------------------------------------------------
   */
  if (result.success) {
    const payload = response.data ?? {};

    result.message = payload.message ?? payload.msg ?? 'Request successful';

    /**
     * Support APIs that return:
     *  - { data: {...} }
     *  - raw object {...}
     */
    const isSet = GlobalConfig.utilsHelper?.isset
      ? GlobalConfig.utilsHelper.isset(payload.data)
      : payload.data !== undefined && payload.data !== null;
    result.data = isSet ? payload.data : payload;

    result.uiClass = 'success';
    result.uiVariant = resolveUiVariant(result.uiClass);
    return result;
  }

  /**
   * ------------------------------------------------------
   * ERROR RESPONSE (Non-2xx)
   * ------------------------------------------------------
   */
  const errorPayload = response.data ?? {};

  result.message =
    errorPayload.message ?? errorPayload.error ?? defaultMessage(statusCode);

  /**
   * ------------------------------------------------------
   * VALIDATION / DOMAIN ERRORS
   * ------------------------------------------------------
   */
  if (statusCode === 400 || statusCode === 422) {
    result.errors = errorPayload.errors ?? errorPayload.data ?? null;

    result.uiClass = 'warning';
    result.uiVariant = resolveUiVariant(result.uiClass);
    return result;
  }

  /**
   * ------------------------------------------------------
   * AUTH / PERMISSION ERRORS
   * ------------------------------------------------------
   */
  if (statusCode === 401 || statusCode === 403) {
    result.errors = {
      authorization: result.message,
    };

    result.uiClass = 'error';
    result.uiVariant = resolveUiVariant(result.uiClass);
    return result;
  }

  /**
   * ------------------------------------------------------
   * RESOURCE NOT FOUND / INFORMATIONAL
   * ------------------------------------------------------
   */
  if (statusCode === 404) {
    result.uiClass = 'info';
    result.uiVariant = resolveUiVariant(result.uiClass);
    return result;
  }

  /**
   * ------------------------------------------------------
   * CONFLICT / RATE LIMIT
   * ------------------------------------------------------
   */
  if (statusCode === 409 || statusCode === 429) {
    result.uiClass = 'warning';
    result.uiVariant = resolveUiVariant(result.uiClass);
    return result;
  }

  /**
   * ------------------------------------------------------
   * NETWORK / TIMEOUT ERRORS
   * ------------------------------------------------------
   */
  if (statusCode === 599) {
    result.message = 'Network error or server unavailable';
    result.uiClass = 'network';
    result.uiVariant = resolveUiVariant(result.uiClass);
    return result;
  }

  /**
   * ------------------------------------------------------
   * SERVER / UNKNOWN ERRORS
   * ------------------------------------------------------
   */
  result.uiClass = 'error';
  result.uiVariant = resolveUiVariant(result.uiClass);
  return result;
}

/**
 * ==========================================================
 * resolveUiVariant()
 * ----------------------------------------------------------
 * Maps semantic uiClass to UI framework variant.
 *
 * NOTE:
 *  - This is the ONLY place aware of Bootstrap
 *  - UI components should NEVER map this themselves
 * ==========================================================
 */
function resolveUiVariant(uiClass) {
  switch (uiClass) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    case 'info':
      return 'info';
    case 'network':
      return 'warning';
    case 'cancelled':
      return null;
    default:
      return 'warning';
  }
}

/**
 * ==========================================================
 * defaultMessage()
 * ----------------------------------------------------------
 * Fallback messages by HTTP status code
 * ==========================================================
 */
function defaultMessage(statusCode) {
  switch (statusCode) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Resource not found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation failed';
    case 429:
      return 'Too many requests';
    case 500:
      return 'Internal server error';
    case 503:
      return 'Service unavailable';
    case 599:
      return 'Network unavailable';
    default:
      return 'Unexpected error';
  }
}
