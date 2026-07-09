import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildRequest } from '../core/requestBuilder.js';
import { initApiCenter } from '../core/config.js';

describe('Request Builder module', () => {
  it('should build request config with correct method and url', () => {
    const api = {
      method: 'GET',
      route: '/users',
      __host: { baseURL: 'https://api.example.com' },
    };

    const config = buildRequest(api);

    assert.strictEqual(config.method, 'get');
    assert.strictEqual(config.url, '/users');
    assert.strictEqual(config.baseURL, 'https://api.example.com');
  });

  it('should interpolate route slugs correctly', () => {
    const api = {
      method: 'POST',
      route: '/users/:userId/posts/:postId',
      data: {
        slug: { userId: '123' },
      },
    };

    const runtimeData = {
      slug: { postId: '456' },
    };

    const config = buildRequest(api, runtimeData);

    assert.strictEqual(config.url, '/users/123/posts/456');
  });

  it('should merge data objects prioritizing runtime over api and host definitions', () => {
    const api = {
      method: 'PUT',
      route: '/update',
      __host: {
        body: {
          body: { hostVal: 'host', overwriteVal: 'host' },
          params: { hostParam: 'host' },
        },
      },
      data: {
        body: { apiVal: 'api', overwriteVal: 'api' },
        params: { apiParam: 'api' },
      },
    };

    const runtimeData = {
      body: { runtimeVal: 'runtime', overwriteVal: 'runtime' },
      params: { runtimeParam: 'runtime' },
    };

    const config = buildRequest(api, runtimeData);

    assert.deepEqual(config.data, {
      hostVal: 'host',
      apiVal: 'api',
      runtimeVal: 'runtime',
      overwriteVal: 'runtime',
    });

    assert.deepEqual(config.params, {
      hostParam: 'host',
      apiParam: 'api',
      runtimeParam: 'runtime',
    });
  });

  it('should serialize query params using qs', () => {
    const api = {
      method: 'GET',
      route: '/search',
    };
    const runtimeData = {
      params: { tags: ['admin', 'user'], filter: { active: true } },
    };

    const config = buildRequest(api, runtimeData);

    assert.ok(typeof config.paramsSerializer === 'function');
    const serialized = config.paramsSerializer(config.params);
    assert.strictEqual(serialized, 'tags[0]=admin&tags[1]=user&filter[active]=true');
  });

  it('should apply path-based versioning', () => {
    const api = {
      method: 'GET',
      route: '/users',
      version: { type: 'path', value: '2' },
    };

    const config = buildRequest(api);

    assert.strictEqual(config.url, '/v2/users');
  });

  it('should apply header-based versioning', () => {
    const api = {
      method: 'GET',
      route: '/users',
      version: { type: 'header', value: '3' },
    };

    const config = buildRequest(api);

    assert.strictEqual(config.url, '/users');
    assert.strictEqual(config.headers['X-API-Version'], '3');
  });

  it('should apply query-based versioning', () => {
    const api = {
      method: 'GET',
      route: '/users',
      version: { type: 'query', value: '4' },
    };

    const config = buildRequest(api);

    assert.strictEqual(config.url, '/users');
    assert.deepEqual(config.params, { api_version: '4' });
  });

  it('should pass API metadata (apiMeta) forward', () => {
    const api = {
      method: 'GET',
      route: '/users',
      someCustomConfig: 'value',
    };

    const config = buildRequest(api);

    assert.strictEqual(config.apiMeta, api);
  });
});
