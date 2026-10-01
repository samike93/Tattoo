// Screenshots for the docs: serves dist/ with `vite preview`, drives the app through share-link hashes,
// and saves PNGs to docs/phase0/. Usage: npm run build && npm run screenshots
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4179;
const OUT = process.env.OUT ?? 'docs/phase1';
const executablePath = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);

const shots = [
  // name, hash (share-link state), camera preset
  ['overview', 'bodyId=male&widthIn=3&heightIn=4', 'front'],
  ['forearm-auto', 'bodyId=male&widthIn=3&heightIn=4', 'design'],
  ['forearm-wide-6in', 'bodyId=male&widthIn=6&heightIn=3', 'design'],
  ['forearm-wide-7in-cylinder', 'bodyId=male&widthIn=7&heightIn=3', 'design'],
  ['forearm-band', 'bodyId=male&band=true&heightIn=1.5', 'design'],
  ['forearm-band-seam', 'bodyId=male&band=true&heightIn=1.5', 'opposite'],
  ['inner-elbow-expmap', 'method=expmap&bodyId=male&widthIn=3&heightIn=5&spot=innerElbow', 'design'],
  ['inner-elbow-decal', 'method=decal&bodyId=male&widthIn=3&heightIn=5&spot=innerElbow', 'design'],
  ['shoulder-auto', 'bodyId=male&widthIn=4&heightIn=4&spot=shoulderBlade', 'design'],
  ['female-heavy-forearm', 'bodyId=female&clientHeight=1.6&bodyWeight=0.9&widthIn=3&heightIn=4&skinTone=%238a5636', 'design'],
  ['female-back-piece', 'bodyId=female&widthIn=8&heightIn=8&spot=shoulderBlade&skinTone=%235c3720', 'back'],
  ['male-muscular-front', 'bodyId=male&clientHeight=1.88&bodyMuscle=1&bodyWeight=0.3&widthIn=3&heightIn=4', 'front'],
];

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
const waitReady = () => page.waitForFunction(() => window.tattoo?.get().status === 'Ready', null, { timeout: 60000 });
try {
  await page.goto(`http://localhost:${PORT}/#ui=false`);
  await waitReady();
  for (const [name, hash, cam] of shots) {
    const h = `${hash}&ui=false&debugOpen=false`;
    await page.goto(`http://localhost:${PORT}/#${h}`);
    await page.reload();
    await waitReady();
    await page.evaluate((c) => window.tattoo.get().requestCamera(c), cam);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    const m = await page.evaluate(() => window.tattoo.get().metrics);
    console.log(name.padEnd(24), m ? `within5 ${(100 * m.within5).toFixed(1)}%  mirrored ${(100 * m.flippedFraction).toFixed(1)}%` : '');
  }
} finally {
  await browser.close();
  process.kill(-server.pid); // the whole group: npx and the vite child
}
