// src\services\ApiCenter\core\errorMapper.js

/**
 * ==========================================================
 * Error Mapper
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Normalize Axios errors into a consistent shape
 *  - Distinguish between:
 *      • HTTP errors
 *      • Network errors
 *      • Abort / cancel errors
 *      • Unexpected runtime errors
 *  - Ensure downstream layers always receive
 *    a predictable error object
 *
 * ❌ No UI logic
 * ❌ No retries
 * ❌ No response formatting (responseParser handles that)
 * ==========================================================
 */

/**
 * ==========================================================
 * parseAxiosError()
 * ----------------------------------------------------------
 * Converts any Axios / runtime error into
 * a normalized "Axios-like" response object.
 *
 * This ensures:
 *  - executor
 *  - interceptors
 *  - responseParser
 * never have to guess error shape.
 *
 * @param {any} error
 * @returns {Object} normalized error object
 * ==========================================================
 */
export function parseAxiosError(error) {
  /**
   * ------------------------------------------------------
   * REQUEST WAS CANCELLED / ABORTED
   * ------------------------------------------------------
   * AbortController / axios cancellation
   */
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
    return {
      status: 499, // Client Closed Request (non-standard, widely used)
      data: {
        message: 'Request cancelled',
      },
      __cancelled: true,
    };
  }

  /**
   * ------------------------------------------------------
   * SERVER RESPONDED WITH ERROR STATUS
   * ------------------------------------------------------
   * Example: 400 / 401 / 403 / 500
   */
  if (error?.response) {
    return {
      status: error.response.status,
      data: error.response.data ?? {
        message: 'Request failed',
      },
      headers: error.response.headers,
    };
  }

  /**
   * ------------------------------------------------------
   * REQUEST MADE BUT NO RESPONSE RECEIVED
   * ------------------------------------------------------
   * Network error / CORS / timeout
   */
  if (error?.request) {
    return {
      status: 599, // Network Connect Timeout Error
      data: {
        message: 'Network error or no response from server',
      },
    };
  }

  /**
   * ------------------------------------------------------
   * UNEXPECTED / RUNTIME ERROR
   * ------------------------------------------------------
   */
  return {
    status: 500,
    data: {
      message: error?.message || 'Unexpected error occurred',
    },
  };
}
