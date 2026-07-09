// src/services/ApiCenter/core/config.js

export const GlobalConfig = {
  http: null,
  browserHelper: null,
  utilsHelper: null,
  authEngine: null,
  storageAdapter: null,
};

export function initApiCenter(configOptions = {}) {
  Object.assign(GlobalConfig, configOptions);

  // Environment Auto-Detection
  const isBrowser = typeof window !== 'undefined' && typeof window.navigator !== 'undefined';

  if (!GlobalConfig.browserHelper) {
    if (isBrowser) {
      GlobalConfig.browserHelper = {
        isOnline: () => window.navigator.onLine,
      };
    } else {
      GlobalConfig.browserHelper = {
        isOnline: () => true, // Node.js environments are assumed online
      };
    }
  }

  if (!GlobalConfig.storageAdapter) {
    if (isBrowser && typeof localStorage !== 'undefined') {
      GlobalConfig.storageAdapter = {
        getItem: (k) => localStorage.getItem(k),
        setItem: (k, v) => localStorage.setItem(k, v),
        removeItem: (k) => localStorage.removeItem(k),
      };
    } else {
      // In-memory fallback for Node.js
      const memoryStore = new Map();
      GlobalConfig.storageAdapter = {
        getItem: (k) => memoryStore.get(k) || null,
        setItem: (k, v) => memoryStore.set(k, String(v)), // Ensure it acts like string storage
        removeItem: (k) => memoryStore.delete(k),
      };
    }
  }
}
