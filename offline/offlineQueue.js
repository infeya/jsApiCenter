/**
 * ==========================================================
 * Offline Queue
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Persist API requests when the network is unavailable
 *  - Replay requests in FIFO order when connectivity returns
 *  - Guarantee write-safety via idempotency
 *
 * Design decisions:
 *  - Storage: localStorage (synchronous, predictable)
 *  - Ordering: FIFO (first user intent first)
 *  - Scope: write operations only (POST / PUT / PATCH / DELETE)
 *
 * ❌ No network calls
 * ❌ No retry logic (executor handles retry)
 * ❌ No deduplication (deduplicator handles in-flight)
 * ==========================================================
 */

import { GlobalConfig } from '../core/config';

const STORAGE_KEY = '__api_center_offline_queue__';

/**
 * ==========================================================
 * readQueue()
 * ----------------------------------------------------------
 * Internal helper to safely read queue from storage
 * ==========================================================
 */
function readQueue() {
  try {
    if (GlobalConfig.storageAdapter && typeof GlobalConfig.storageAdapter.getItem === 'function') {
      const raw = GlobalConfig.storageAdapter.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return [];
  }
}

/**
 * ==========================================================
 * writeQueue()
 * ----------------------------------------------------------
 * Internal helper to persist queue to storage
 * ==========================================================
 */
function writeQueue(queue) {
  if (GlobalConfig.storageAdapter && typeof GlobalConfig.storageAdapter.setItem === 'function') {
    GlobalConfig.storageAdapter.setItem(STORAGE_KEY, JSON.stringify(queue));
    return;
  }
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * ==========================================================
 * enqueue()
 * ----------------------------------------------------------
 * Add a request to the offline queue.
 *
 * @param {Object} item
 * {
 *   api,      // apiBook entry
 *   data,     // request data (slug / param / body)
 *   config,   // axios config (headers, timeout, etc.)
 *   context,  // runtime context (region, tenant, geo)
 * }
 *
 * @returns {number} queue length
 * ==========================================================
 */
export function enqueue(item) {
  const queue = readQueue();

  queue.push({
    ...item,
    /**
     * Metadata for observability / debugging
     */
    __queuedAt: Date.now()
  });

  writeQueue(queue);
  return queue.length;
}

/**
 * ==========================================================
 * dequeueAll()
 * ----------------------------------------------------------
 * Remove and return all queued requests.
 *
 * Called when:
 *  - browser goes online
 *  - app is reloaded while online
 *
 * @returns {Array}
 * ==========================================================
 */
export function dequeueAll() {
  const queue = readQueue();
  if (GlobalConfig.storageAdapter && typeof GlobalConfig.storageAdapter.removeItem === 'function') {
    GlobalConfig.storageAdapter.removeItem(STORAGE_KEY);
  } else if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return queue;
}

/**
 * ==========================================================
 * peekQueue()
 * ----------------------------------------------------------
 * Read-only access to queued requests.
 *
 * Useful for:
 *  - UI indicators ("3 actions pending")
 *  - Debugging
 * ==========================================================
 */
export function peekQueue() {
  return readQueue();
}

/**
 * ==========================================================
 * clearQueue()
 * ----------------------------------------------------------
 * Clears all queued requests.
 *
 * Use cases:
 *  - Logout
 *  - Hard reset
 *  - Tenant change
 * ==========================================================
 */
export function clearQueue() {
  if (GlobalConfig.storageAdapter && typeof GlobalConfig.storageAdapter.removeItem === 'function') {
    GlobalConfig.storageAdapter.removeItem(STORAGE_KEY);
  } else if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * ==========================================================
 * getQueueSize()
 * ----------------------------------------------------------
 * Returns number of queued requests
 * ==========================================================
 */
export function getQueueSize() {
  return readQueue().length;
}
