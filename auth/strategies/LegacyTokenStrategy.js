// src/services/ApiCenter/auth/strategies/LegacyTokenStrategy.js

import AuthStrategy from '../AuthStrategy';
import { getLegacyToken } from '../authManager';

export default class LegacyTokenStrategy extends AuthStrategy {
  apply(config, auth) {
    const token = getLegacyToken();
    if (!token) {
      return config;
    }

    config.headers = config.headers || {};

    Object.keys(auth.headers || {}).forEach((header) => {
      config.headers[header] = token;
    });

    return config;
  }
}
