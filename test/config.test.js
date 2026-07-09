import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GlobalConfig, initApiCenter } from '../core/config.js';

describe('Configuration module', () => {
  it('should initialize GlobalConfig with provided options', () => {
    const dummyHttp = { hosts: { default: { baseURL: 'https://api.example.com' } }, defaultHost: 'default' };
    const dummyAuth = { applyAuth: () => {} };

    initApiCenter({
      http: dummyHttp,
      authEngine: dummyAuth,
    });

    assert.strictEqual(GlobalConfig.http, dummyHttp);
    assert.strictEqual(GlobalConfig.authEngine, dummyAuth);
  });

  it('should auto-detect environment and fallback for browserHelper and storageAdapter in Node.js', () => {
    // Re-initialize to trigger default fallbacks
    initApiCenter({
      browserHelper: null,
      storageAdapter: null,
    });

    assert.ok(GlobalConfig.browserHelper);
    assert.strictEqual(GlobalConfig.browserHelper.isOnline(), true, 'Node.js env should default to online');

    assert.ok(GlobalConfig.storageAdapter);
    
    // Test the in-memory storage adapter fallback
    GlobalConfig.storageAdapter.setItem('test-key', 'test-value');
    assert.strictEqual(GlobalConfig.storageAdapter.getItem('test-key'), 'test-value');
    
    GlobalConfig.storageAdapter.removeItem('test-key');
    assert.strictEqual(GlobalConfig.storageAdapter.getItem('test-key'), null);
  });
});
