// Phase 0 screenshots: serves dist/ with `vite preview`, drives the app through share-link hashes,
// and saves PNGs to docs/phase0/. Usage: npm run build && npm run screenshots
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4179;
const OUT = 'docs/phase0';
const executablePath = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);

const shots = [
  // name, hash (share-link state), camera preset
  ['overview', 'method=expmap&bodyId=male&widthIn=3&heightIn=4', 'front'],
  ['forearm-decal', 'method=decal&bodyId=male&widthIn=3&heightIn=4', 'design'],
  ['forearm-decal-behind', 'method=decal&bodyId=male&widthIn=3&heightIn=4', 'opposite'],
  ['forearm-expmap', 'method=expmap&bodyId=male&widthIn=3&heightIn=4', 'design'],
  ['forearm-expmap-behind', 'method=expmap&bodyId=male&widthIn=3&heightIn=4', 'opposite'],
  ['forearm-cylinder', 'method=cylinder&limbId=forearm.L&slide=0.5&around=90&bodyId=male&widthIn=3&heightIn=4', 'design'],
  ['forearm-band', 'method=cylinder&limbId=forearm.L&slide=0.5&around=0&band=true&bodyId=male&heightIn=1.5', 'design'],
  ['forearm-band-seam', 'method=cylinder&limbId=forearm.L&slide=0.5&around=0&band=true&bodyId=male&heightIn=1.5', 'opposite'],
  ['shoulder-decal', 'method=decal&bodyId=male&widthIn=4&heightIn=4&spot=shoulderBlade', 'design'],
  ['shoulder-expmap', 'method=expmap&bodyId=male&widthIn=4&heightIn=4&spot=shoulderBlade', 'design'],
  ['female-forearm-expmap', 'method=expmap&bodyId=female&widthIn=3&heightIn=4', 'design'],
  ['female-back-expmap', 'method=expmap&bodyId=female&widthIn=8&heightIn=8&spot=shoulderBlade&skinTone=%238a5636', 'back'],
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
