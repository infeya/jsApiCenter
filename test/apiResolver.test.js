import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveApi } from '../core/apiResolver.js';
import { initApiCenter } from '../core/config.js';

describe('API Resolver module', () => {
  it('should resolve host from GlobalConfig when not defined on api', () => {
    const dummyHost = { baseURL: 'https://default.com', auth: { strategy: 'jwt' } };
    initApiCenter({
      http: {
        hosts: {
          default: dummyHost,
        },
        defaultHost: 'default',
      },
    });

    const api = {};
    const resolved = resolveApi(api);

    assert.deepStrictEqual(resolved.__host, dummyHost);
  });

  it('should override host using api.host when specified', () => {
    const defaultHost = { baseURL: 'https://default.com' };
    const customHost = { baseURL: 'https://custom.com' };
    initApiCenter({
      http: {
        hosts: {
          default: defaultHost,
        },
        defaultHost: 'default',
      },
    });

    const api = { host: customHost };
    const resolved = resolveApi(api);

    assert.deepStrictEqual(resolved.__host, customHost);
  });

  it('should resolve auth correctly according to priorities', () => {
    const hostAuth = { strategy: 'oauth' };
    initApiCenter({
      http: {
        hosts: {
          default: { baseURL: 'https://default.com', auth: hostAuth },
        },
        defaultHost: 'default',
      },
    });

    // 1. api.auth === false -> { strategy: 'none' }
    const api1 = { auth: false };
    const resolved1 = resolveApi(api1);
    assert.deepStrictEqual(resolved1.__resolvedAuth, { strategy: 'none' });

    // 2. api.auth object -> overrides host auth
    const customAuth = { strategy: 'basic', username: 'foo' };
    const api2 = { auth: customAuth };
    const resolved2 = resolveApi(api2);
    assert.deepStrictEqual(resolved2.__resolvedAuth, customAuth);

    // 3. api.auth === true -> inherits host auth
    const api3 = { auth: true };
    const resolved3 = resolveApi(api3);
    assert.deepStrictEqual(resolved3.__resolvedAuth, hostAuth);

    // 4. api.auth undefined -> resolves to null (or fallback depending on host, but in resolver it checks api.auth explicitly)
    const api4 = {};
    const resolved4 = resolveApi(api4);
    assert.strictEqual(resolved4.__resolvedAuth, null);
  });

  it('should merge headers from host and api configurations', () => {
    initApiCenter({
      http: {
        hosts: {
          default: {
            baseURL: 'https://default.com',
            headers: {
              'X-Host-Header': 'host-value',
              'X-Overwritten-Header': 'host-will-be-overwritten',
            },
          },
        },
        defaultHost: 'default',
      },
    });

    const api = {
      header: {
        'X-Api-Header': 'api-value',
        'X-Overwritten-Header': 'api-overrides-host',
      },
    };

    const resolved = resolveApi(api);

    assert.deepStrictEqual(resolved.__headers, {
      'X-Host-Header': 'host-value',
      'X-Api-Header': 'api-value',
      'X-Overwritten-Header': 'api-overrides-host',
    });
  });
});
