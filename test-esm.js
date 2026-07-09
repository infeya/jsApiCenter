import { initApiCenter, dial } from './dist/index.js';
import { getCache } from './dist/cache/edgeCache.js';

console.log('Testing ESM Import...');
console.log('initApiCenter:', typeof initApiCenter);
console.log('dial:', typeof dial);
console.log('getCache:', typeof getCache);
console.log('ESM Import successful!');
