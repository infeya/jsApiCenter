// src/services/ApiCenter/auth/strategies/CookieStrategy.js

import AuthStrategy from '../AuthStrategy';

export default class CookieStrategy extends AuthStrategy {
  apply(config) {
    config.withCredentials = true;
    return config;
  }
}
