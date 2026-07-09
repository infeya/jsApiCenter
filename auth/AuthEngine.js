// src/services/ApiCenter/auth/AuthEngine.js

/**
 * ==========================================================
 * AuthEngine
 * ----------------------------------------------------------
 * Responsibilities:
 *  - Resolve effective auth configuration
 *  - Select appropriate strategy
 *  - Apply auth to request config
 *
 * ❌ No token storage
 * ❌ No axios execution
 * ==========================================================
 */

import AuthRegistry from './AuthRegistry';

class AuthEngine {
  static apply({ apiMeta, requestConfig }) {
    if (!apiMeta) {
      return requestConfig;
    }

    /**
     * ------------------------------------------------------
     * AUTH DISABLED
     * ------------------------------------------------------
     */
    if (apiMeta.auth === false) {
      return requestConfig;
    }

    /**
     * ------------------------------------------------------
     * RESOLVE AUTH CONFIG
     * ------------------------------------------------------
     * apiMeta.__resolvedAuth is injected by ApiResolver
     * auth: true → inherit
     */
    const authConfig =
      apiMeta.auth === true
        ? apiMeta.__resolvedAuth
        : typeof apiMeta.auth === 'object'
          ? apiMeta.auth
          : apiMeta.__resolvedAuth;

    if (!authConfig || authConfig.strategy === 'none') {
      return requestConfig;
    }

    /**
     * ------------------------------------------------------
     * STRATEGY LOOKUP
     * ------------------------------------------------------
     */
    const strategy = AuthRegistry.get(authConfig.strategy);

    if (!strategy) {
      throw new Error(
        `AuthEngine: auth strategy "${authConfig.strategy}" not registered`,
      );
    }

    /**
     * ------------------------------------------------------
     * APPLY STRATEGY
     * ------------------------------------------------------
     */
    return strategy.apply(requestConfig, authConfig);
  }
}

export default AuthEngine;
