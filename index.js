// src\services\ApiCenter\index.js

/* eslint-disable no-console */
/**
 * ==========================================================
 * ApiCenter – Public Entry Point
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Orchestrate API calls (NO business logic)
 *  - Resolve API metadata (host, auth, headers)
 *  - Handle offline queueing
 *  - Wire abort controller
 *  - Normalize responses
 *  - Expose raw axios client
 *
 * Everything else lives in dedicated layers.
 * ==========================================================
 */

import { resolveApi } from './core/apiResolver';
import { buildRequest } from './core/requestBuilder';
import { executeRequest } from './core/executor';
import { parseResponse } from './core/responseParser';

import { getSignal, abort, abortRouteRequests } from './abort/abortRegistry';
import { enqueue, dequeueAll } from './offline/offlineQueue';

import { GlobalConfig } from './core/config';

export { initApiCenter } from './core/config';
export { createAxiosClient } from './client/axiosFactory';

/**
 * ==========================================================
 * dial()
 * ----------------------------------------------------------
 * Main API execution function
 *
 * Supports:
 *  - apiBook-driven calls
 *  - host-based routing
 *  - multi-region routing
 *  - auth / refresh (via AuthEngine)
 *  - retry / circuit breaker
 *  - deduplication
 *  - idempotency
 *  - rate limiting
 *  - edge cache
 *  - observability
 *  - offline queue
 * ==========================================================
 */
export async function dial(apiBookIndex, data = {}, config = {}, context = {}) {
  /**
   * ------------------------------------------------------
   * RESOLVE API METADATA (ONCE)
   * ------------------------------------------------------
   * - host
   * - auth strategy
   * - static headers
   */
  const resolvedApi = resolveApi(apiBookIndex);

  try {
    /**
     * ------------------------------------------------------
     * OFFLINE HANDLING
     * ------------------------------------------------------
     * If offline & API supports offline queueing,
     * store request and return optimistic response
     */
    if (GlobalConfig.browserHelper && !GlobalConfig.browserHelper.isOnline() && resolvedApi.offlineQueue) {
      enqueue({
        api: resolvedApi,
        data,
        config,
        context,
      });

      return {
        success: true,
        queued: true,
        statusCode: 202,
        message: 'Request queued (offline)',
      };
    }

    /**
     * ------------------------------------------------------
     * BUILD REQUEST
     * ------------------------------------------------------
     * - merge host / api / runtime data
     * - resolve route slugs
     * - apply versioning
     * - apply region routing
     * - attach abort signal
     */
    const request = buildRequest(
      resolvedApi,
      data,
      {
        ...config,
        signal: config.abortKey ? getSignal(config.abortKey) : undefined,
      },
      context,
    );

    /**
     * ------------------------------------------------------
     * EXECUTE REQUEST
     * ------------------------------------------------------
     * Internally handles:
     *  - retry
     *  - circuit breaker
     *  - refresh token flow
     *  - deduplication
     *  - rate limiting
     *  - edge cache
     */
    const response = await executeRequest(resolvedApi, request);

    /**
     * ------------------------------------------------------
     * NORMALIZE RESPONSE
     * ------------------------------------------------------
     * UI never receives raw Axios response
     */
    return parseResponse(response);
  } catch (error) {
    console.error('Dial error:', error);

    /**
     * ------------------------------------------------------
     * NORMALIZE ERROR
     * ------------------------------------------------------
     * Guarantees ISO-style response contract
     */
    return parseResponse(error);
  }
}

/**
 * ==========================================================
 * OFFLINE REPLAY (AUTO)
 * ----------------------------------------------------------
 * When internet is restored, replay queued requests
 * in FIFO order (write-safety guaranteed by idempotency)
 * ==========================================================
 */
export async function replayOfflineQueue() {
  const queued = dequeueAll();

  for (const item of queued) {
    try {
      await dial(item.api, item.data, item.config, item.context);
    } catch (e) {
      // Fail silently – circuit breaker will protect backend
      console.error('Offline replay failed:', e);
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', replayOfflineQueue);
}

/**
 * ==========================================================
 * ABORT EXPORTS
 * ----------------------------------------------------------
 * Cancel in-flight requests by key
 *
 * Example:
 *   abort('profile-fetch')
 * ==========================================================
 */
export { abort, abortRouteRequests };
export { getSignal as signal };
