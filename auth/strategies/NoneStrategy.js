// src/services/ApiCenter/auth/strategies/NoneStrategy.js

import AuthStrategy from '../AuthStrategy';

export default class NoneStrategy extends AuthStrategy {
  apply(config) {
    return config;
  }
}
