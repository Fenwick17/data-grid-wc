import { defineConfig } from 'vite';

// Dev server and build config for the example app in `example/`.
// The library itself is built separately with Rollup (see rollup.config.mjs).
export default defineConfig({
  root: 'example',
  server: {
    open: true,
  },
  build: {
    outDir: '../dist-example',
    emptyOutDir: true,
  },
});
