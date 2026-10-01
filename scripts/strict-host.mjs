// Prepare dist/ for strict static hosts (for example sandboxed previews) that refuse .glb files or
// scripts containing raw control characters.
// Usage: VITE_MODELS_AS_TEXT=1 npm run build && node scripts/strict-host.mjs
//
// 1. Writes base64 copies of the body models (models/<id>.glb.txt), which the app loads when built
//    with VITE_MODELS_AS_TEXT=1.
// 2. Rewrites raw control bytes in the built scripts (pdf.js embeds font data in string literals)
//    as \xNN escapes. In minified code these bytes only occur inside string, template or regex
//    literals, where the escape means the same thing.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

for (const f of readdirSync('dist/models').filter((f) => f.endsWith('.glb'))) {
  writeFileSync(`dist/models/${f}.txt`, readFileSync(`dist/models/${f}`).toString('base64'));
  console.log(`dist/models/${f}.txt`);
}

for (const f of readdirSync('dist/assets').filter((f) => /\.m?js$/.test(f))) {
  const path = `dist/assets/${f}`;
  const src = readFileSync(path, 'latin1');
  let n = 0;
  const out = src.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, (c) => {
    n++;
    return `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`;
  });
  if (n) {
    writeFileSync(path, out, 'latin1');
    console.log(`${path}: escaped ${n} control characters`);
  }
}
