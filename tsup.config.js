import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'index.js',
    'core/**/*.js',
    'client/**/*.js',
    'auth/**/*.js',
    'cache/**/*.js',
    'observability/**/*.js',
    'abort/**/*.js',
    'offline/**/*.js',
    'region/**/*.js',
    'security/**/*.js'
  ],
  format: ['cjs', 'esm'],
  clean: true,
  bundle: true,
  splitting: false,
  external: ['axios', 'fast-json-stable-stringify', 'uuid', 'qs', 'crypto-js'],
  dts: false,
  outDir: 'dist',
  minify: false,
  sourcemap: true,
});
