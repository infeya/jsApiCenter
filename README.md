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

`ApiCenter` automatically detects its environment and adapts its behavior, but you still need to provide your base configuration.

### Frontend Setup Example (React / Vue / Browser)

In a frontend application, initialization typically happens at the entry point of your app.

> [!TIP]
> **Usage Idea:** In frontend environments, use the `authEngine` to automatically sync your JWT or Bearer tokens from `localStorage` into the request headers.

```javascript
// frontend-api-init.js
import { initApiCenter } from '@infeya/api-center';

export function initializeFrontendApi() {
  initApiCenter({
    http: {
      hosts: {
        primary: {
          baseURL: process.env.REACT_APP_API_URL || 'https://api.mycompany.com',
          auth: { strategy: 'bearer' },
          headers: { 'X-App-Client': 'web-portal' }
        }
      },
      defaultHost: 'primary'
    },
    authEngine: {
      applyAuth: (config) => {
        const token = localStorage.getItem('access_token');
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
      },
      handleAuthError: async (error, originalRequest) => {
        try {
          const freshToken = await refreshMyTokenSomehow();
          localStorage.setItem('access_token', freshToken);
          originalRequest.headers['Authorization'] = `Bearer ${freshToken}`;
          return originalRequest; // Retry
        } catch (refreshError) {
          window.location.href = '/login';
          throw refreshError;
        }
      }
    }
  });
}
```

### Backend Setup Example (Node.js / Express / NestJS)

Because backends handle multi-tenant requests simultaneously, state is shared. Token injection often requires passing context per-request rather than reading a global store.

> [!WARNING]
> **Important Note for Backends:** Do not rely on global token variables. Pass dynamic auth tokens per-request using `ApiCenter` options instead.

```javascript
// backend-api-init.js
import { initApiCenter } from '@infeya/api-center';
import { RedisStorageAdapter } from './my-custom-redis-adapter';

export function initializeBackendApi() {
  initApiCenter({
    http: {
      hosts: {
        billingService: {
          baseURL: process.env.BILLING_SERVICE_URL || 'http://internal-billing-service:3000',
          auth: { strategy: 'hmac' }
        },
        thirdPartyVendor: {
          baseURL: 'https://vendor-api.example.com',
          headers: { 'x-api-key': process.env.VENDOR_API_KEY }
        }
      },
      defaultHost: 'billingService'
    },
    storageAdapter: new RedisStorageAdapter(process.env.REDIS_URL), // Optional persistence
    authEngine: {
      applyAuth: (config) => {
        config.headers['X-Server-Timestamp'] = Date.now().toString();
      }
    }
  });
}
```

---

## 📖 API Book Specification & Properties

The **API Book** is your declarative single source of truth for all API definitions. Instead of scattering URLs throughout your components, you define them all in one or more centralized files.

### Endpoint Schema Reference Table

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`key`** | `string` | *Required* | Unique identifier used for rate-limiting, deduplication, and circuit breaker states. |
| **`route`** | `string` | *Required* | Path of the endpoint. Supports dynamic slugs (e.g. `/users/:id`). |
| **`method`** | `string` | `'GET'` | HTTP Verb (e.g. `GET`, `POST`, `PUT`, `PATCH`, `DELETE`). |
| **`auth`** | `boolean \| Object` | `true` | `true` (inherits host auth), `false` (no auth), or target auth strategy. |
| **`retry`** | `Object` | `undefined` | `{ count, delay }`. Max retries on transient network/5xx errors. |
| **`circuit`** | `Object` | `undefined` | `{ failureThreshold, cooldown }`. Automatically fails fast after threshold is met. |
| **`cache`** | `Object` | `undefined` | `{ ttl }`. In-memory response caching duration (GET only). |
| **`dedupe`** | `boolean` | `false` | Collapses concurrent identical requests into a single flight. |
| **`idempotent`** | `boolean` | `false` | Generates a stable `Idempotency-Key` header for safe retries on mutations. |
| **`rateLimit`** | `Object` | `undefined` | `{ limit, interval }`. Client-side token bucket rate limits. |
| **`offlineQueue`** | `boolean` | `false` | Queues requests if offline. Replays in FIFO order on connectivity. |
| **`version`** | `Object` | `undefined` | `{ type, value }`. Adds API versioning (e.g., `X-API-Version: 1`). |
| **`host`** | `string` | `undefined` | Directs the endpoint to a specific configured host (e.g., `billingService`). |
| **`headers`** | `Object` | `undefined` | Declaratively injects static headers (e.g. `Accept: application/pdf`). |

### Declaring Your Endpoints

```javascript
// apiBook.js
export const API_CATALOG = {
  GET_SYSTEM_CONFIG: {
    key: 'get-sys-config',
    route: '/api/v1/config',
    method: 'GET',
    auth: false
  },
  GET_USER_PROFILE: {
    key: 'get-user-profile',
    route: '/api/v1/users/:userId',
    method: 'GET',
    auth: true,
    cache: { ttl: 60000 },
    dedupe: true
  },
  UPDATE_USER_PREFERENCES: {
    key: 'update-user-preferences',
    route: '/api/v1/users/:userId/preferences',
    method: 'PATCH',
    auth: true,
    offlineQueue: true,
    retry: { count: 3, delay: 1000 }
  }
};
```

---

## 🚀 Routing, Headers, and Executing Requests

When you invoke an API via the `dial` function, you pass payload configuration. `ApiCenter` categorizes your input into three distinct types:

1. **`slug`**: Used to replace dynamic URL segments (e.g., `:id`).
2. **`params`**: Appended to the URL as query string parameters (e.g., `?search=term`).
3. **`body`**: Sent as the payload for mutative requests (POST, PUT, PATCH).

### Static Routes vs. Dynamic Routes

```javascript
import { dial } from '@infeya/api-center';
import { API_CATALOG } from './apiBook';

// 1. Static Route Example (using 'params' for Query String)
async function fetchConfig() {
  const res = await dial(API_CATALOG.GET_SYSTEM_CONFIG, {
    params: { platform: 'web' } // GET /api/v1/config?platform=web
  });
  return res.data;
}

// 2. Dynamic Route Example (using 'slug')
async function fetchUser(id) {
  const res = await dial(API_CATALOG.GET_USER_PROFILE, {
    slug: { userId: id } // Replaces ':userId' -> GET /api/v1/users/123
  });
  return res.data;
}
```

### Overriding Hosts and Headers Dynamically

You can target specific hosts or inject dynamic headers via the options object inside the `dial` function.

```javascript
async function fetchFromBackupHost(userId, userTimezone) {
  const response = await dial(
    API_CATALOG.GET_USER_PROFILE,
    { slug: { userId } },
    { 
      host: 'secondary', // Override default host
      headers: { 'X-User-Timezone': userTimezone } // Inject dynamic header
    }
  );
  return response.data;
}
```

---

## 📦 Handling Different Types of Body Data

`ApiCenter` simplifies sending various types of body payloads.

#### 1. JSON (Default)
Passing a standard JavaScript object automatically serializes to JSON.
```javascript
const res = await dial(API_CATALOG.CREATE_POST, {
  body: { title: "Hello", content: "World" } 
});
```

#### 2. Form Data & File Uploads
Pass a native `FormData` object to handle `multipart/form-data`.
```javascript
const formData = new FormData();
formData.append('avatar', fileBlob, 'avatar.png');
formData.append('userId', userId);

const res = await dial(API_CATALOG.UPLOAD_AVATAR, { body: formData });
```

#### 3. URL Encoded
Use native `URLSearchParams` for `application/x-www-form-urlencoded`.
```javascript
const params = new URLSearchParams();
params.append('grant_type', 'password');
params.append('username', username);

const res = await dial(API_CATALOG.OAUTH_LOGIN, { body: params });
```

#### 4. Raw Text, HTML, XML
Send raw strings by overriding the `Content-Type` header.
```javascript
const res = await dial(API_CATALOG.PROCESS_XML, {
  body: `<user><name>John</name></user>`
}, {
  headers: { 'Content-Type': 'application/xml' } 
});
```

#### 5. Binary Data (Blob / ArrayBuffer)
Pass the `Blob` directly into the body.
```javascript
const res = await dial(API_CATALOG.UPLOAD_RAW_IMAGE, {
  body: fileBlob
}, {
  headers: { 'Content-Type': 'image/jpeg' }
});
```

#### 6. GraphQL
Send an object containing `query` and `variables`.
```javascript
const res = await dial(API_CATALOG.GRAPHQL_ENDPOINT, {
  body: { query: GQL_QUERY, variables: { id: userId } }
});
```

---

## 🛡️ Advanced Resiliency Features

### Circuit Breaker Kicked
Protects backends from cascading failures. If an endpoint fails repeatedly, the circuit breaker trips and blocks subsequent requests locally for a cooldown period.
```javascript
export const GET_ANALYTICS = {
  key: 'get-analytics',
  route: '/api/v1/analytics',
  method: 'GET',
  circuit: { failureThreshold: 3, cooldown: 30000 }
};

// If tripped, response.success is false and message includes "Circuit".
```

### Cache Data
Stores the response in memory (by default) for a specified TTL.
```javascript
export const GET_COUNTRIES = {
  key: 'get-countries',
  route: '/api/v1/reference/countries',
  method: 'GET',
  cache: { ttl: 3600000 } // Cache for 1 hour
};
```

### Deduplication
Catches concurrent identical requests in-flight, sends only *one* network request, and distributes the exact same response to all callers.
```javascript
export const GET_ME = {
  key: 'get-me',
  route: '/api/v1/users/me',
  method: 'GET',
  dedupe: true
};
```

### Rate Limits
Implements a client-side token bucket to intentionally throttle requests.
```javascript
export const REFRESH_STATUS = {
  key: 'refresh-status',
  route: '/api/v1/status',
  method: 'GET',
  rateLimit: { limit: 2, interval: 5000 }
};
```

### Idempotency Keys
Guarantees that a mutative operation (like processing a payment) happens *exactly once*, even if the network fails and retries.
```javascript
export const CHARGE_CREDIT_CARD = {
  key: 'charge-card',
  route: '/api/v1/payments/charge',
  method: 'POST',
  idempotent: true, 
  retry: { count: 3, delay: 1000 }
};
```

---

## 🛑 Cancelling/Aborting In-flight Requests

A common pattern is cancelling a request that is no longer needed (like search autocomplete). `ApiCenter` simplifies this using an `abortKey`.

```javascript
import { dial, abort } from '@infeya/api-center';

async function handleUserInput(typingQuery) {
  abort('global-search-input'); // Cancel existing requests

  const response = await dial(
    SEARCH_AUTOCOMPLETE,
    { params: { q: typingQuery } },
    { abortKey: 'global-search-input' }
  );

  if (response.uiClass === 'cancelled') {
    return; // Request was aborted gracefully
  }
}
```

---

## 🤝 Unified Response Contract

All network resolutions, errors, and rejections are parsed and normalized into a single **`UnifiedResponse`** format. You never have to wrap your `dial` calls in `try/catch` blocks for network errors!

```typescript
interface UnifiedResponse {
  success: boolean;       // Easy check: HTTP 200-299 statuses
  statusCode: number;     // e.g., 200, 404, 422, or 599 for offline/timeouts
  message: string | null; // A safe, human-readable message 
  data: any | null;       // The parsed JSON payload from the server 
  errors: any | null;     // Key-value validation errors 
  queued?: boolean;       // True if offline Queue captured this request
  
  // UI Helpers (Automatically computed for styling frameworks)
  uiClass: 'success' | 'warning' | 'error' | 'info' | 'network' | 'cancelled';
  uiVariant: 'success' | 'warning' | 'danger' | 'info' | 'secondary' | null;
}
```

### Contextual UI Presentation
Because `uiVariant` directly maps to popular CSS frameworks, you can pass it directly into your toast or alert systems:

```javascript
const response = await dial(API_CATALOG.CREATE_POST, { body: postData });

if (!response.success) {
  myToastNotificationSystem.show({
    title: "Action Failed",
    description: response.message,
    variant: response.uiVariant // 'danger', 'warning', etc.
  });
}
```

### Customizing the Global Response Contract

Every project has unique backend requirements. If your backend wraps all responses in a custom envelope (like `{ "status": "ok", "payload": { ... } }`), or if you want to globally map specific error codes to custom messages, you can define a **Response Interceptor/Adapter** during the initial setup!

You can use the `responseAdapter` within your `initApiCenter` configuration to globally transform the raw server response into the standardized `UnifiedResponse` format before it ever reaches your application logic.

```javascript
import { initApiCenter } from '@infeya/api-center';

initApiCenter({
  http: { /* ... hosts config ... */ },
  
  // Globally intercept and map all incoming responses
  responseAdapter: (rawAxiosResponse, defaultUnifiedResponse) => {
    
    // Example 1: Unwrap a custom backend payload envelope
    if (rawAxiosResponse.data && rawAxiosResponse.data.payload) {
      // Elevate the deeply nested payload to the root 'data' property
      defaultUnifiedResponse.data = rawAxiosResponse.data.payload;
    }

    // Example 2: Map custom backend error messages
    if (!defaultUnifiedResponse.success && rawAxiosResponse.data?.errorMsg) {
      // Map your backend's custom error property to the unified 'message'
      defaultUnifiedResponse.message = rawAxiosResponse.data.errorMsg;
    }
    
    // Example 3: Inject custom UI variants based on your company's design system
    if (defaultUnifiedResponse.statusCode === 402) {
      defaultUnifiedResponse.uiVariant = 'payment-required-alert';
      defaultUnifiedResponse.message = 'Please update your billing details.';
    }

    return defaultUnifiedResponse; // Return the mutated contract!
  }
});
```

---

*By leveraging the declarative API books and standardizing your communication through `ApiCenter`, you decouple your business logic from network volatility. This setup drastically reduces boilerplate and provides enterprise-level application stability out of the box!*

---

**Author by : Infeya Technologys Group**
