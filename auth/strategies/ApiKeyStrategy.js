// src/services/ApiCenter/auth/strategies/ApiKeyStrategy.js

import AuthStrategy from '../AuthStrategy';
import { getApiKey } from '../authManager'; // existing or future

export default class ApiKeyStrategy extends AuthStrategy {
  apply(config, auth) {
    const apiKey = getApiKey();
    if (!apiKey) {
      return config;
    }

    config.headers = config.headers || {};

    Object.keys(auth.headers || {}).forEach((header) => {
      config.headers[header] = apiKey;
    });

    return config;
  }
}
