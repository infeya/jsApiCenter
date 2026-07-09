# ApiCenter (@infeya/api-center)

`ApiCenter` is an isomorphic (universal), enterprise-grade API orchestration engine built on top of Axios. It runs natively on both **Frontend (React, Vue, Angular)** and **Backend (Node.js, Express, NestJS)** environments with zero configuration! 

It serves as a central gateway for executing, securing, and managing HTTP requests, ensuring that developers can focus entirely on business logic and interfaces without worrying about network resilience, caching, circuit breaking, offline synchronization, or authentication flows.

> [!IMPORTANT]
> **Architectural Rule:** Developers should never import or invoke Axios directly. All API operations must route through `ApiCenter` via the `dial` function to ensure consistency, security, and stability across platforms.

---

## 🌟 Advantages

*   **Zero UI-to-Network Coupling:** UI components and business logic are completely isolated from low-level Axios instances, status codes, and HTTP configurations.
*   **Isomorphic (Universal) Auto-Detection:** Works seamlessly on Frontend and Backend out of the box. It automatically detects the environment and wires up native `localStorage` and network detection for browsers, while safely falling back to In-Memory queues for Node.js servers.
*   **Built-in Resilience:** Automatic retries (with backoff) and circuit breakers prevent network storms and protect backend services when they are unhealthy.
*   **Automatic Performance Gains:** Memory-based client-side caching and concurrent request deduplication are applied out-of-the-box, saving bandwidth and reducing server load.
*   **Write Safety:** Automatic, stable idempotency key generation prevents duplicate writes (e.g., duplicate payments or entities) during retries or network replays.
*   **Offline First:** Mutative requests (POST/PUT/PATCH/DELETE) can be automatically queued when the client is offline and replayed in FIFO order once connection is restored.
*   **Multi-Region Resilience:** Automatically resolves and falls back to the healthiest geographical region or client-pinned server.
*   **Unified Response Contract:** standardizes every request (success, failure, or timeout) into a predictable, type-safe JSON structure featuring contextual UI helpers.

---

## 🛠️ Initialization & Setup

Before using `ApiCenter`, initialize it with your API configuration. Thanks to **Environment Auto-Detection**, it will automatically configure the best storage and network defaults whether you are running in a Browser or Node.js!

```javascript
import { initApiCenter } from '@infeya/api-center';

// Zero-Config Initialization!
initApiCenter({
  http: {
    hosts: {
      primary: {
        baseURL: 'https://api.mycompany.com',
        auth: { strategy: 'bearer' },
        headers: { 'X-App-Client': 'web-portal' }
      },
      secondary: {
        baseURL: 'https://api-backup.mycompany.com',
        auth: { strategy: 'bearer' }
      }
    },
    defaultHost: 'primary'
  },
  authEngine: {
    applyAuth: (config, api) => {
      // Inject Authorization headers based on API requirements
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
    },
    handleAuthError: async (error, originalRequest, api) => {
      // Execute token refresh, then return updated config to retry the request
      const freshToken = await performTokenRefresh();
      originalRequest.headers['Authorization'] = `Bearer ${freshToken}`;
      return originalRequest;
    }
  }
});
```

> [!TIP]
> **Node.js Advanced Usage:** By default, Node.js uses an in-memory fallback for the offline queue. If you want persistent queuing across server restarts, simply inject a custom `storageAdapter` (e.g., Redis).

---

## 📖 API Book Specification & Properties

API Endpoints are defined declaratively in an **API Book**. Each entry represents a configured endpoint supporting several orchestration settings:

### Endpoint Schema Reference Table

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`key`** | `string` | *Required* | Unique identifier used for rate-limiting, deduplication, and circuit breaker states. |
| **`route`** | `string` | *Required* | Path of the endpoint. Supports dynamic slugs (e.g. `/users/:id`). |
| **`method`** | `string` | `'GET'` | HTTP Verb (e.g. `GET`, `POST`, `PUT`, `PATCH`, `DELETE`). |
| **`auth`** | `boolean \| Object` | `true` | `true` (inherits host auth), `false` (no auth), or `Object` specifying target auth strategy settings. |
| **`retry`** | `Object` | `undefined` | `{ count: number, delay: number }`. Max retry attempts on transient network/5xx errors and base delay in ms. |
| **`circuit`** | `Object` | `undefined` | `{ failureThreshold: number, cooldown: number }`. Automatically fails fast after threshold is met; retries after cooldown. |
| **`cache`** | `Object` | `undefined` | `{ ttl: number }`. In-memory response caching duration in milliseconds (GET only). |
| **`dedupe`** | `boolean` | `false` | Collapses concurrent identical requests into a single flight, resolving them with the same promise. |
| **`idempotent`** | `boolean` | `false` | Generates a stable `Idempotency-Key` header for write operations. Reuses keys during retry blocks. |
| **`rateLimit`** | `Object` | `undefined` | `{ limit: number, interval: number }`. Token bucket rate limits client calls (e.g., max 5 requests per 1000ms). |
| **`offlineQueue`** | `boolean` | `false` | Queues requests in LocalStorage if offline. Replays requests in FIFO order when connectivity returns. |
| **`version`** | `Object` | `undefined` | `{ type: 'path'\|'header'\|'query', value: string }`. Adds API versioning (e.g., `/v1/users`, `X-API-Version: 1`). |
| **`signing`** | `Object` | `undefined` | `{ secret: string }`. Automatically calculates HMAC/SHA256 signature hashes and injects signature headers. |
| **`hmac`** | `Object` | `undefined` | `{ key: string, secret: string }`. Injects secure HMAC authorization signatures for internal or API Gateway verification. |

---

## 🚀 Usage & Examples

### 1. Declaring your endpoints (e.g. `apiBook.js`)
```javascript
export const GET_USER = {
  key: 'get-user',
  route: '/users/:userId',
  method: 'GET',
  auth: true,
  cache: { ttl: 15000 }, // Cache response for 15s
  dedupe: true,          // Collapse duplicate calls
};

export const CREATE_PAYMENT = {
  key: 'create-payment',
  route: '/payments',
  method: 'POST',
  auth: true,
  idempotent: true,      // Safe retries without duplicate charges
  retry: { count: 3, delay: 500 },
  circuit: { failureThreshold: 3, cooldown: 15000 },
};

export const UPDATE_STATUS_OFFLINE = {
  key: 'update-status-offline',
  route: '/users/:userId/status',
  method: 'PATCH',
  auth: true,
  offlineQueue: true,    // Enqueues request if browser is offline
};
```

### 2. Basic GET Request (with parameters and caching)
```javascript
import { dial } from '@infeya/api-center';
import { GET_USER } from './apiBook';

async function fetchUser(userId) {
  const result = await dial(
    GET_USER,
    { slug: { userId } } // Replaces ':userId' in route
  );

  if (result.success) {
    console.log('User data:', result.data);
  } else {
    console.error('Error fetching user:', result.message);
  }
}
```

### 3. POST Request with Idempotency & Resiliency
```javascript
import { dial } from '@infeya/api-center';
import { CREATE_PAYMENT } from './apiBook';

async function submitPayment(amount, currency) {
  const result = await dial(
    CREATE_PAYMENT,
    {
      body: { amount, currency }
    }
  );

  if (result.success) {
    console.log('Payment successful. Receipt:', result.data);
  } else {
    // If the circuit breaker kicked in
    if (result.uiClass === 'error' && result.message.includes('Circuit')) {
      alert('Payment service is temporarily down. Please wait before retrying.');
    } else {
      alert(result.message);
    }
  }
}
```

### 4. Cancelling/Aborting In-flight Requests
Use an `abortKey` to cancel previous requests matching the same key (perfect for search auto-completes).

```javascript
import { dial, abort } from '@infeya/api-center';

const SEARCH_PRODUCTS = {
  key: 'search-products',
  route: '/catalog/search',
  method: 'GET'
};

async function executeSearch(query) {
  // Cancel any active search requests with this key
  abort('product-autocomplete');

  const result = await dial(
    SEARCH_PRODUCTS,
    { params: { q: query } },
    { abortKey: 'product-autocomplete' } // Register this request to the key
  );

  if (result.success) {
    renderList(result.data);
  } else if (result.uiClass === 'cancelled') {
    console.log('Search cancelled by newer input.');
  }
}
```

---

## 📦 Unified Response Contract

All network resolutions, errors, and rejections are parsed and normalized into a single **`UnifiedResponse`** format. Your application code never has to parse Axios exceptions or inspect raw response structures directly.

```typescript
interface UnifiedResponse {
  success: boolean;       // True for HTTP 2xx statuses
  statusCode: number;     // HTTP Status Code (e.g. 200, 422, or 599 for client network timeout)
  message: string | null; // UI-ready fallback message describing the result
  data: any | null;       // Unwrapped HTTP JSON body payload
  errors: any | null;     // Key-value validation errors (mainly from status 400 or 422)
  queued?: boolean;       // Present and true if request was queued offline
  
  // UI Presentation Helpers
  uiClass: 'success' | 'warning' | 'error' | 'info' | 'network' | 'cancelled';
  uiVariant: 'success' | 'warning' | 'danger' | 'info' | 'secondary' | null;
  
  meta: {
    timestamp: number;    // Client timestamp when parsing took place
  };
}
```

### Contextual UI Presentation
Instead of writing complex logic matching status codes to styling components, use the parsed `uiVariant` directly in your UI component frameworks (e.g. matching Bootstrap CSS classes or alert variants):

```javascript
const response = await dial(UPDATE_PROFILE, { body: formData });

if (!response.success && response.uiVariant) {
  // Will map to 'danger' alert box or 'warning' badge automatically
  renderAlert(response.message, response.uiVariant);
}
```

---

## 🔍 Debugging & State Snapshots

For diagnostics and tracing, `ApiCenter` modules expose state inspection helper hooks:

*   **Cache:** `import { getCacheSnapshot } from '@infeya/api-center/cache/edgeCache'`
*   **Circuit Breakers:** `import { getCircuitSnapshot } from '@infeya/api-center/core/circuitBreaker'`
*   **Deduplication:** `import { getDeduplicationSnapshot } from '@infeya/api-center/core/deduplicator'`
*   **Rate Limits:** `import { getRateLimitSnapshot } from '@infeya/api-center/core/rateLimiter'`
*   **Idempotency Keys:** `import { getIdempotencySnapshot } from '@infeya/api-center/core/idempotency'`

---

## 🧪 Testing & Building

### Running Tests

This project uses the native Node.js test runner (`node:test`) along with `tsx` to support ES Modules.

```bash
# Install dependencies (if you haven't already)
npm install

# Run the test suite
npm test
```

### Building the Package

The package uses `tsup` to bundle and emit isomorphic entry points (both CommonJS and ESM formats). The build automatically captures subdirectories (`core/`, `auth/`, etc.) ensuring deep imports work as expected.

```bash
npm run build
```
