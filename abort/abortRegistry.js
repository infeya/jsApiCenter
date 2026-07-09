// src\services\ApiCenter\abort\abortRegistry.js

/**
 * ==========================================================
 * Abort Registry
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Manage AbortController instances by key
 *  - Provide AbortSignal for Axios / Fetch
 *  - Allow cancellation of in-flight requests
 *
 * Use cases:
 *  - Component unmount
 *  - Tab switch
 *  - Step change (DataModel)
 *  - Duplicate request prevention
 *
 * ❌ No network logic
 * ❌ No retries / auth logic
 * ==========================================================
 */

/**
 * ----------------------------------------------------------
 * Internal registry
 * ----------------------------------------------------------
 * Key → AbortController
 */
const controllers = Object.create(null);

/**
 * ==========================================================
 * getSignal()
 * ----------------------------------------------------------
 * Returns an AbortSignal for a given key.
 *
 * If the controller does not exist, it is created.
 *
 * @param {string} key - Unique identifier for request group
 * @returns {AbortSignal}
 *
 * Example:
 *   signal: getSignal('profile-load')
 * ==========================================================
 */
export function getSignal(key) {
  if (!key) {
    return undefined;
  }

  if (!controllers[key]) {
    controllers[key] = new AbortController();
  }

  return controllers[key].signal;
}

/**
 * ==========================================================
 * abort()
 * ----------------------------------------------------------
 * Aborts all requests associated with the given key.
 * Cleans up the controller to prevent memory leaks.
 *
 * @param {string} key - Same key used in getSignal()
 *
 * Example:
 *   abort('profile-load');
 * ==========================================================
 */
export function abort(key) {
  if (!key) {
    return;
  }

  const controller = controllers[key];
  if (controller) {
    controller.abort();
    delete controllers[key];
  }
}

/**
 * ==========================================================
 * abortAll()
 * ----------------------------------------------------------
 * Emergency / global abort.
 * Cancels ALL in-flight requests.
 *
 * Useful for:
 *  - Logout
 *  - App reset
 *  - Permission change
 * ==========================================================
 */
export function abortAll() {
  Object.keys(controllers).forEach((key) => {
    controllers[key].abort();
    delete controllers[key];
  });
}

/**
 * ==========================================================
 * abortRouteRequests()
 * ----------------------------------------------------------
 * Aborts standard in-flight requests during route navigation.
 * Preserves requests whose key starts with 'bg:'
 * ==========================================================
 */
export function abortRouteRequests() {
  Object.keys(controllers).forEach((key) => {
    if (!key.startsWith('bg:')) {
      controllers[key].abort();
      delete controllers[key];
    }
  });
}
