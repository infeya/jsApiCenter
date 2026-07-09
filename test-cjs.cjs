const { initApiCenter, dial } = require('./dist/index.cjs');
const { getCache } = require('./dist/cache/edgeCache.cjs');

console.log('Testing CommonJS Require...');
console.log('initApiCenter:', typeof initApiCenter);
console.log('dial:', typeof dial);
console.log('getCache:', typeof getCache);
console.log('CommonJS Require successful!');
