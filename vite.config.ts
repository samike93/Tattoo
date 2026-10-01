import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const version = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
})();

// base: './' makes the build work from any folder: GitHub Pages project sites, a sub-path on your
// own website, or a plain static file host. No server code is needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.measure.test.ts'],
    testTimeout: 60000,
  },
});
