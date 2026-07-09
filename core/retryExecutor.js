/**
 * ==========================================================
 * Retry Executor
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Retry transient failures with backoff
 *  - Keep retry logic isolated from execution logic
 *  - Fail fast when retry conditions are not met
 *
 * Design principles:
 *  - Deterministic
 *  - No timers running in background
 *  - No retry storms
 *
 * ❌ No circuit breaker (handled outside)
 * ❌ No logging / observability
 * ❌ No auth / refresh logic
 * ==========================================================
 */

/**
 * ==========================================================
 * retry()
 * ----------------------------------------------------------
 * Executes the provided async function with retry logic.
 *
 * @param {Function} fn - async function to execute
 * @param {Object} options
 *   - retries      : number of retry attempts
 *   - delay        : base delay in ms
 *   - factor       : exponential backoff factor
 *   - shouldRetry  : function(error) => boolean
 *
 * @returns {Promise<any>}
 * ==========================================================
 */
export async function retry(fn, options = {}) {
  const { retries = 0, delay = 300, factor = 2, shouldRetry = () => true } = options;

  let attempt = 0;

  while (true) {
    try {
      /**
       * --------------------------------------------------
       * EXECUTE FUNCTION
       * --------------------------------------------------
       */
      return await fn();
    } catch (error) {
      /**
       * --------------------------------------------------
       * CHECK RETRY CONDITIONS
       * --------------------------------------------------
       */
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }

      /**
       * --------------------------------------------------
       * BACKOFF CALCULATION
       * --------------------------------------------------
       * Exponential backoff:
       * delay * factor^attempt
       */
      const backoff = delay * Math.pow(factor, attempt);

      attempt += 1;

      /**
       * --------------------------------------------------
       * WAIT BEFORE NEXT ATTEMPT
       * --------------------------------------------------
       */
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}
