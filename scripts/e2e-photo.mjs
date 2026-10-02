// Client photo mode checks in headless Chromium.
// Usage: npm run build && node scripts/e2e-photo.mjs
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4196;
const executablePath = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const settle = (ms = 500) => page.waitForTimeout(ms);
const st = () => page.evaluate(() => { const s = window.tattoo.get(); return { at: s.photoAt, ppi: s.photoPxPerInch, w: s.widthIn, h: s.heightIn, mode: s.mode, photo: !!s.photo, d: window.tattoo.photoDesign?.() }; });
const client = (p) => page.evaluate((p) => window.tattoo.photoToClient(p), p);
// Mean luminance of a photo-pixel box as drawn on screen.
const lum = (p, r = 20) => page.evaluate(([p, r]) => {
  const c = document.querySelector('.photo-canvas');
  const q = window.tattoo.photoToClient(p);
  const rect = c.getBoundingClientRect();
  const k = c.width / rect.width;
  const g = document.createElement('canvas');
  g.width = c.width; g.height = c.height;
  const x = g.getContext('2d');
  x.drawImage(c, 0, 0);
  const d = x.getImageData(Math.round((q.x - rect.left) * k - r), Math.round((q.y - rect.top) * k - r), 2 * r, 2 * r).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return s / (d.length / 4);
}, [p, r]);

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.tattoo?.get().status === 'Ready', null, { timeout: 60000 });
  await page.getByRole('button', { name: 'Client photo' }).click();
  await settle();
  check('photo mode shows an empty stage with a photo button', (await page.locator('.photo-empty').count()) === 1);

  // A 1600 x 1200 "skin" photo with two ruler marks 600 px apart.
  const png = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 1600; c.height = 1200;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 1200);
    grad.addColorStop(0, '#d9a07a'); grad.addColorStop(1, '#b97e5a');
    g.fillStyle = grad; g.fillRect(0, 0, 1600, 1200);
    g.fillStyle = '#222'; g.fillRect(297, 1000, 6, 60); g.fillRect(897, 1000, 6, 60);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator('.panel input[type=file]').first().setInputFiles({ name: 'client-arm.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await page.waitForFunction(() => !!window.tattoo.get().photo, null, { timeout: 10000 });
  await settle(800);
  let s = await st();
  check('the photo opens in photo mode with the design in the middle', s.mode === 'photo' && s.photo && s.d && Math.abs(s.d.at[0] - 800) < 1 && Math.abs(s.d.at[1] - 600) < 1, JSON.stringify(s.d?.at));
  const inside = await lum(s.d.at, 15), outside = await lum([200, 200], 15);
  check('the design is drawn into the skin (darker inside than bare skin)', inside < outside - 20, `${inside.toFixed(0)} vs ${outside.toFixed(0)}`);
  check('the selection box and size label show', (await page.locator('.photo-stage .box-handle').count()) === 6 && /≈ 3 × 4 in/.test(await page.locator('.photo-stage .box-size').textContent()));

  // Drag the design.
  const c0 = await client(s.d.at);
  await page.mouse.move(c0.x, c0.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(c0.x + 8 * k, c0.y + 5 * k);
  await page.mouse.up();
  await settle();
  const s1 = await st();
  check('dragging moves the design on the photo', s1.at && s1.at[0] > 820 && s1.at[1] > 612, JSON.stringify(s1.at));
  await page.keyboard.press('Control+z');
  await settle();
  const s2 = await st();
  check('Ctrl+Z puts it back', !s2.at || (Math.abs(s2.at[0] - 800) < 1 && Math.abs(s2.at[1] - 600) < 1), JSON.stringify(s2.at));

  // Tap elsewhere: the design goes there.
  const t = await client([400, 300]);
  await page.mouse.click(t.x, t.y);
  await settle();
  const s3 = await st();
  check('tapping the photo places the design there', s3.at && Math.abs(s3.at[0] - 400) < 3 && Math.abs(s3.at[1] - 300) < 3, JSON.stringify(s3.at));

  // Set the scale from the ruler marks (600 px = 6 in).
  await page.getByRole('button', { name: 'Set true size' }).click();
  await settle(300);
  for (const p of [[300, 1030], [900, 1030]]) {
    const q = await client(p);
    await page.mouse.click(q.x, q.y);
    await settle(200);
  }
  await page.getByLabel('Distance in inches').fill('6');
  await page.getByRole('button', { name: 'Set', exact: true }).click();
  await settle();
  const s4 = await st();
  check('setting the scale from two marks gives the right pixels per inch', s4.ppi && Math.abs(s4.ppi - 100) < 1.5, `${s4.ppi?.toFixed(2)} px/in`);
  check('the design is then true to size on the photo', Math.abs(s4.d.w - 300) < 5 && Math.abs(s4.d.h - 400) < 6, `${s4.d.w.toFixed(0)} x ${s4.d.h.toFixed(0)} px for 3 x 4 in`);
  check('the size label drops the ≈ once measured', !/≈/.test(await page.locator('.photo-stage .box-size').textContent()));

  // Corner handle resize.
  const se = await page.locator('.photo-stage .box-handle.h-se').boundingBox();
  const cc = await client(s4.d.at);
  const sx = se.x + se.width / 2, sy = se.y + se.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(sx + ((sx - cc.x) * 0.5 * k) / 10, sy + ((sy - cc.y) * 0.5 * k) / 10);
  await page.mouse.up();
  await settle();
  const s5 = await st();
  check('dragging a corner enlarges the design proportionally', s5.w > 4 && Math.abs(s5.w / s5.h - 0.75) < 0.03, `${s5.w} x ${s5.h} in`);

  // Curve: the design looks narrower on screen when wrapped round a limb.
  await page.evaluate(() => window.tattoo.set({ photoCurve: 0.9 }));
  await settle();
  const right = await page.locator('.photo-stage .box-handle.h-se').boundingBox();
  check('curving around the limb narrows the design on screen', right.x < se.x + (sx - cc.x) * 0.5 - 5);

  // Save.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save photo mockup' }).click()]);
  const buf = readFileSync(await download.path());
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  check('saving gives a full-resolution PNG of the photo', w === 1600 && h === 1200, `${w} x ${h}`);
  await page.getByRole('button', { name: '3D body' }).click();
  await settle(1500);
  check('switching back shows the 3D body again', (await page.locator('.photo-stage').count()) === 0 && (await page.evaluate(() => window.tattoo.get().status)) === 'Ready');
  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await browser.close();
  process.kill(-server.pid);
}
console.log(failures ? `${failures} check(s) failed` : 'All photo checks passed');
process.exit(failures ? 1 : 0);
