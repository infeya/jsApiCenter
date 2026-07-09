// src/services/ApiCenter/auth/strategies/JwtStrategy.js

import AuthStrategy from '../AuthStrategy';
import { getAccessToken } from '../authManager'; // existing

export default class JwtStrategy extends AuthStrategy {
  apply(config, auth) {
    const token = getAccessToken();
    if (!token) {
      return config;
    }

    config.headers = config.headers || {};

    Object.entries(auth.headers || {}).forEach(([key, def]) => {
      config.headers[key] = def.scheme ? `${def.scheme} ${token}` : token;
    });

    return config;
  }
}
