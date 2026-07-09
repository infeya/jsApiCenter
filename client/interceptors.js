//src\services\ApiCenter\client\interceptors.js

/**
 * ==========================================================
 * Axios Interceptors
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Apply authentication via AuthEngine
 *  - Handle refresh-token retry flow (strategy-driven)
 *  - Attach idempotency keys
 *  - Apply HMAC / request signing
 *  - Emit observability events
 *  - Normalize low-level errors
 *
 * ❌ No retry logic (executor handles it)
 * ❌ No circuit breaking
 * ❌ No response formatting
 * ==========================================================
 */

import { GlobalConfig } from '../core/config';

import { attachIdempotency } from '../core/idempotency';
import { signRequest } from '../security/requestSigner';
import { attachHmacAuth } from '../security/hmacAuth';

import { trace } from '../observability/tracer';
import { parseAxiosError } from '../core/errorMapper';

const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

/**
 * ==========================================================
 * applyInterceptors()
 * ----------------------------------------------------------
 * Applies request & response interceptors to an Axios instance
 * ==========================================================
 */
export default function applyInterceptors(client, _overrides = {}) {
  /**
   * ======================================================
   * REQUEST INTERCEPTOR
   * ======================================================
   */
  client.interceptors.request.use(
    (config) => {
      const api = config.apiMeta || {};

      /**
       * --------------------------------------------------
       * OBSERVABILITY (REQUEST START)
       * --------------------------------------------------
       */
      config.__traceStart = getNow();
      trace('api.request.start', {
        method: config.method,
        url: config.url,
        region: config.headers?.['X-Region'],
      });

      /**
       * --------------------------------------------------
       * APPLY AUTH ENGINE
       * --------------------------------------------------
       * Strategy-based auth attachment
       */
      GlobalConfig.authEngine?.applyAuth?.(config, api);

      /**
       * --------------------------------------------------
       * IDEMPOTENCY KEY
       * --------------------------------------------------
       * Ensures safe retries for write operations
       */
      attachIdempotency(config, api);

      /**
       * --------------------------------------------------
       * REQUEST SIGNATURE
       * --------------------------------------------------
       * Integrity + replay protection
       */
      if (api.signing) {
        signRequest(config, api.signing.secret);
      }

      /**
       * --------------------------------------------------
       * HMAC AUTH (Optional)
       * --------------------------------------------------
       * Used for internal / edge / IoT APIs
       */
      if (api.hmac) {
        attachHmacAuth(config, api.hmac.key, api.hmac.secret);
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  /**
   * ======================================================
   * RESPONSE INTERCEPTOR (SUCCESS)
   * ======================================================
   */
  client.interceptors.response.use(
    (response) => {
      /**
       * --------------------------------------------------
       * OBSERVABILITY (SUCCESS)
       * --------------------------------------------------
       */
      trace('api.request.success', {
        method: response.config.method,
        url: response.config.url,
        status: response.status,
        duration: getNow() - response.config.__traceStart,
        region: response.config.headers?.['X-Region'],
      });

      return response;
    },

    /**
     * ==================================================
     * RESPONSE INTERCEPTOR (ERROR)
     * ==================================================
     */
    async (error) => {
      const originalRequest = error.config;
      const api = originalRequest?.apiMeta || {};

      /**
       * --------------------------------------------------
       * OBSERVABILITY (ERROR)
       * --------------------------------------------------
       */
      trace('api.request.error', {
        method: originalRequest?.method,
        url: originalRequest?.url,
        status: error.response?.status,
        region: originalRequest?.headers?.['X-Region'],
      });

      /**
       * --------------------------------------------------
       * AUTH ERROR HANDLING (STRATEGY-DRIVEN)
       * --------------------------------------------------
       * Delegates refresh / retry decision to AuthEngine
       */
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const updatedConfig = await GlobalConfig.authEngine?.handleAuthError?.(error, originalRequest, api);

          if (updatedConfig) {
            return client(updatedConfig);
          }
        } catch (authError) {
          return Promise.reject(parseAxiosError(authError));
        }
      }

      /**
       * --------------------------------------------------
       * FINAL ERROR NORMALIZATION
       * --------------------------------------------------
       */
      return Promise.reject(parseAxiosError(error));
    },
  );
}
