// src/services/ApiCenter/auth/AuthRegistry.js

/**
 * ==========================================================
 * AuthRegistry
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Register auth strategies
 *  - Resolve strategy by name
 *
 * ❌ No execution logic
 * ==========================================================
 */

const registry = Object.create(null);

class AuthRegistry {
  static register(name, strategy) {
    registry[name] = strategy;
  }

  static get(name) {
    return registry[name];
  }

  static has(name) {
    return Boolean(registry[name]);
  }

  static snapshot() {
    return Object.keys(registry);
  }
}

export default AuthRegistry;
