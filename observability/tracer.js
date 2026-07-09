/* eslint-disable no-console */
/**
 * ==========================================================
 * Tracer (Observability Layer)
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Emit structured telemetry events
 *  - Act as a thin abstraction over OpenTelemetry / APM tools
 *  - Never break application flow if telemetry fails
 *
 * Supported backends (plug-in style):
 *  - OpenTelemetry
 *  - Datadog
 *  - New Relic
 *  - Elastic APM
 *  - Custom in-house collectors
 *
 * ❌ No business logic
 * ❌ No network calls
 * ❌ No assumptions about telemetry provider
 * ==========================================================
 */

/**
 * ----------------------------------------------------------
 * Internal tracer reference
 * ----------------------------------------------------------
 * This is injected at runtime by the host application.
 *
 * Example:
 *   window.__OTEL__ = {
 *     emit: (event, payload) => { ... }
 *   }
 */
let tracer = null;

const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

/**
 * ==========================================================
 * setTracer()
 * ----------------------------------------------------------
 * Register a telemetry provider at runtime.
 *
 * @param {Object} provider
 *   - emit(eventName: string, payload: object)
 *
 * This keeps ApiCenter decoupled from observability vendors.
 * ==========================================================
 */
export function setTracer(provider) {
  tracer = provider;
}

/**
 * ==========================================================
 * trace()
 * ----------------------------------------------------------
 * Emit a telemetry event in a safe, non-blocking way.
 *
 * @param {string} event - Event name
 * @param {Object} payload - Structured metadata
 *
 * This function:
 *  - Never throws
 *  - Never blocks execution
 *  - Silently no-ops if no tracer is registered
 * ==========================================================
 */
export function trace(event, payload = {}) {
  try {
    if (tracer && typeof tracer.emit === 'function') {
      tracer.emit(event, {
        ...payload,
        timestamp: Date.now()
      });
    }
  } catch (err) {
    console.error(err);
    // Observability must NEVER break application flow
  }
}

/**
 * ==========================================================
 * traceSpan()
 * ----------------------------------------------------------
 * Utility helper for span-like measurements.
 *
 * @param {string} event
 * @param {Function} fn - async function to measure
 * @param {Object} meta
 *
 * Example:
 *   await traceSpan('api.call', () => dial(...))
 * ==========================================================
 */
export async function traceSpan(event, fn, meta = {}) {
  const start = getNow();

  try {
    const result = await fn();

    trace(`${event}.success`, {
      ...meta,
      duration: getNow() - start
    });

    return result;
  } catch (error) {
    trace(`${event}.error`, {
      ...meta,
      duration: getNow() - start,
      error: error?.message
    });
    throw error;
  }
}

/**
 * ==========================================================
 * getTracer()
 * ----------------------------------------------------------
 * Read-only access (debug / inspection)
 * ==========================================================
 */
export function getTracer() {
  return tracer;
}
