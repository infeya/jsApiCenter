import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseResponse } from '../core/responseParser.js';

describe('Response Parser module', () => {
  it('should parse a successful response correctly', () => {
    const successResponse = {
      status: 200,
      data: {
        message: 'Success Message',
        data: { id: 100, name: 'Alice' },
      },
    };

    const parsed = parseResponse(successResponse);

    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.statusCode, 200);
    assert.strictEqual(parsed.message, 'Success Message');
    assert.deepEqual(parsed.data, { id: 100, name: 'Alice' });
    assert.strictEqual(parsed.uiClass, 'success');
    assert.strictEqual(parsed.uiVariant, 'success');
    assert.ok(parsed.meta.timestamp);
  });

  it('should handle raw payloads without a nested data key', () => {
    const rawSuccessResponse = {
      status: 201,
      data: { id: 200, item: 'Book' },
    };

    const parsed = parseResponse(rawSuccessResponse);

    assert.strictEqual(parsed.success, true);
    assert.deepEqual(parsed.data, { id: 200, item: 'Book' });
  });

  it('should map client-side cancellation correctly', () => {
    const cancelledResponse = {
      __cancelled: true,
    };

    const parsed = parseResponse(cancelledResponse);

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.statusCode, 499);
    assert.strictEqual(parsed.message, 'Request cancelled by client');
    assert.strictEqual(parsed.uiClass, 'cancelled');
    assert.strictEqual(parsed.uiVariant, null);
  });

  it('should map bad requests and validation errors (400, 422)', () => {
    const validationError = {
      status: 422,
      data: {
        message: 'Invalid input data',
        errors: { email: 'Email is invalid' },
      },
    };

    const parsed = parseResponse(validationError);

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.statusCode, 422);
    assert.strictEqual(parsed.message, 'Invalid input data');
    assert.deepEqual(parsed.errors, { email: 'Email is invalid' });
    assert.strictEqual(parsed.uiClass, 'warning');
    assert.strictEqual(parsed.uiVariant, 'warning');
  });

  it('should map auth errors (401, 403) and nest authorization error message', () => {
    const authError = {
      status: 401,
      data: {
        message: 'Invalid credentials',
      },
    };

    const parsed = parseResponse(authError);

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.statusCode, 401);
    assert.strictEqual(parsed.message, 'Invalid credentials');
    assert.deepEqual(parsed.errors, { authorization: 'Invalid credentials' });
    assert.strictEqual(parsed.uiClass, 'error');
    assert.strictEqual(parsed.uiVariant, 'danger');
  });

  it('should map resource not found (404) correctly', () => {
    const notFoundError = {
      status: 404,
      data: {
        message: 'User not found',
      },
    };

    const parsed = parseResponse(notFoundError);

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.statusCode, 404);
    assert.strictEqual(parsed.uiClass, 'info');
    assert.strictEqual(parsed.uiVariant, 'info');
  });

  it('should map conflicts (409) and rate limits (429)', () => {
    const rateLimitError = {
      status: 429,
      data: {
        message: 'Too many requests',
      },
    };

    const parsed = parseResponse(rateLimitError);

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.statusCode, 429);
    assert.strictEqual(parsed.uiClass, 'warning');
    assert.strictEqual(parsed.uiVariant, 'warning');
  });

  it('should map network/timeout errors (599) with fallback message', () => {
    const networkError = {
      status: 599,
    };

    const parsed = parseResponse(networkError);

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.statusCode, 599);
    assert.strictEqual(parsed.message, 'Network error or server unavailable');
    assert.strictEqual(parsed.uiClass, 'network');
    assert.strictEqual(parsed.uiVariant, 'warning');
  });

  it('should handle general server/unknown errors (500) with a default message fallback', () => {
    const serverError = {
      status: 500,
    };

    const parsed = parseResponse(serverError);

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.statusCode, 500);
    assert.strictEqual(parsed.message, 'Internal server error');
    assert.strictEqual(parsed.uiClass, 'error');
    assert.strictEqual(parsed.uiVariant, 'danger');
  });
});
