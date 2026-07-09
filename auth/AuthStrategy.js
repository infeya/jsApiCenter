// src/services/ApiCenter/auth/AuthStrategy.js

/**
 * ==========================================================
 * AuthStrategy (Base Class)
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Apply authentication details to request config
 *
 * ❌ No token storage
 * ❌ No axios knowledge
 * ❌ No refresh logic
 * ==========================================================
 */

export default class AuthStrategy {
  apply(_requestConfig, _authConfig) {
    throw new Error('AuthStrategy.apply() must be implemented');
  }
}
