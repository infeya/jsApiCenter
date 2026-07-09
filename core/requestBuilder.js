/**
 * ==========================================================
 * Request Builder
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Build a normalized Axios request config
 *  - Merge data from:
 *      1. Host defaults (HttpConfig)
 *      2. ApiBook definitions
 *      3. Runtime request data
 *  - Resolve route slugs
 *  - Apply versioning & region routing
 *  - Pass API metadata forward
 *
 * ❌ No network execution
 * ❌ No auth logic
 * ❌ No retries / response formatting
 * ==========================================================
 */

import qs from 'qs';
import { applyVersion } from './versionRouter';
import { applyRegion } from '../region/applyRegion';

/**
 * ==========================================================
 * buildRequest()
 * ==========================================================
 */
export function buildRequest(api, data = {}, config = {}, context = {}) {
  /**
   * ------------------------------------------------------
   * HOST / API DEFAULT DATA
   * ------------------------------------------------------
   */
  const host = api.__host || {};
  const hostData = api.__host?.body || {};
  const apiData = api.data || {};

  /**
   * ------------------------------------------------------
   * MERGE DATA (LOW → HIGH PRIORITY)
   * ------------------------------------------------------
   */
  const mergedSlug = {
    ...(hostData.slug || {}),
    ...(apiData.slug || {}),
    ...(data.slug || {}),
  };

  const mergedParams = {
    ...(hostData.params || {}),
    ...(apiData.params || {}),
    ...(data.params || {}),
  };

  const mergedBody = {
    ...(hostData.body || {}),
    ...(apiData.body || {}),
    ...(data.body || {}),
  };

  /**
   * ------------------------------------------------------
   * RESOLVE ROUTE
   * ------------------------------------------------------
   */
  let url = api.route || api.url;

  Object.entries(mergedSlug).forEach(([key, value]) => {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  });

  /**
   * ------------------------------------------------------
   * BUILD AXIOS REQUEST CONFIG
   * ------------------------------------------------------
   */
  const requestConfig = {
    baseURL: host.baseURL || null,
    /**
     * HTTP method
     */
    method: api.method.toLowerCase(),

    /**
     * Final URL (baseURL applied later)
     */
    url,

    /**
     * HEADERS MERGE
     * --------------------------------------------------
     * host → api → runtime
     */
    headers: {
      ...(api.__host?.headers || {}),
      ...(api.header || {}),
      ...(config.headers || {}),
    },

    /**
     * QUERY PARAMS
     */
    params: Object.keys(mergedParams).length ? mergedParams : undefined,

    /**
     * SAFE PARAM SERIALIZATION
     */
    paramsSerializer: (params) => qs.stringify(params, { encode: false }),

    /**
     * REQUEST BODY
     */
    data: Object.keys(mergedBody).length ? mergedBody : undefined,

    /**
     * TRANSPORT WIRES
     */
    onUploadProgress: config.onUpload,
    onDownloadProgress: config.onDownload,

    /**
     * ABORT SUPPORT
     */
    signal: config.signal,

    /**
     * PASSTHROUGH AXIOS OPTIONS
     */
    ...config,

    /**
     * API METADATA (CRITICAL)
     * Used by:
     *  - AuthEngine
     *  - Idempotency
     *  - Signing / HMAC
     *  - Observability
     */
    apiMeta: api,
  };

  /**
   * ------------------------------------------------------
   * APPLY API VERSIONING
   * ------------------------------------------------------
   */
  applyVersion(requestConfig, api);

  /**
   * ------------------------------------------------------
   * APPLY MULTI-REGION ROUTING
   * ------------------------------------------------------
   */
  applyRegion(requestConfig, api, context);

  /**
   * ------------------------------------------------------
   * FINAL REQUEST CONFIG
   * ------------------------------------------------------
   */
  return requestConfig;
}
