import { defineConfig } from 'vitest/config';

// `npm run measure`: runs the Phase 0 distortion study on the real body meshes and writes docs/phase0/.
export default defineConfig({
  test: { include: ['src/**/*.measure.test.ts'], testTimeout: 300000 },
});
