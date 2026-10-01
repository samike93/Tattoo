// For static hosts that refuse .glb files: write base64 copies next to the models in dist/.
// Usage: VITE_MODELS_AS_TEXT=1 npm run build && node scripts/models-as-text.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

for (const f of readdirSync('dist/models').filter((f) => f.endsWith('.glb'))) {
  writeFileSync(`dist/models/${f}.txt`, readFileSync(`dist/models/${f}`).toString('base64'));
  console.log(`dist/models/${f}.txt`);
}
