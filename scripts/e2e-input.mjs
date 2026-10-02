// Touch and Apple Pencil checks in headless Chromium (simulated through the DevTools protocol).
// Usage: npm run build && node scripts/e2e-input.mjs
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4195;
const executablePath = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// iPad-sized, touch-capable.
const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const pageErrors = [];
page.on('pageerror', (e) => { pageErrors.push(String(e)); if (pageErrors.length === 1) console.log('STACK', e.stack?.split('\n').slice(0, 6).join(' / ')); });
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const frames = (n = 3) => page.evaluate((n) => new Promise((r) => { const step = (k) => (k ? requestAnimationFrame(() => step(k - 1)) : r()); step(n); }), n);
const settle = async (ms = 900) => { await page.waitForTimeout(ms); await frames(2); };
const st = () => page.evaluate(() => { const s = window.tattoo.get(); return { w: s.widthIn, h: s.heightIn, r: s.rotationDeg, focus: s.focus, pencil: s.pencilMode, notice: s.notice, placement: s.placement }; });
const project = (p) => page.evaluate((p) => window.tattoo.project(p), p);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i, radiusX: 8, radiusY: 8, force: 1 })) });
const pen = (type, p, buttons = 1) => cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons, clickCount: 1, pointerType: 'pen' });
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.tattoo?.get().status === 'Ready', null, { timeout: 60000 });
  await settle(2500);
  await page.evaluate(() => window.tattoo.get().requestCamera('design'));
  await settle(1500);
  check('touch device detected (bigger handles)', await page.evaluate(() => document.documentElement.classList.contains('touch')));

  // Two fingers on the design: pinch out, then twist.
  let s = await st();
  const c = await project(s.focus.point);
  await touch('touchStart', [{ x: c.x - 15, y: c.y }, { x: c.x + 15, y: c.y }]);
  for (let k = 1; k <= 10; k++) await touch('touchMove', [{ x: c.x - 15 - 3 * k, y: c.y }, { x: c.x + 15 + 3 * k, y: c.y }]);
  await touch('touchEnd', []);
  await settle();
  const s1 = await st();
  check('pinching the design with two fingers enlarges it', s1.w > s.w * 1.8 && Math.abs(s1.w / s1.h - s.w / s.h) < 0.05, `${s.w}x${s.h} -> ${s1.w}x${s1.h}`);
  await page.evaluate(() => window.tattoo.set({ widthIn: 3, heightIn: 4 }));
  await settle();
  s = await st();
  const c2 = await project(s.focus.point);
  const R = 25;
  await touch('touchStart', [{ x: c2.x - R, y: c2.y }, { x: c2.x + R, y: c2.y }]);
  for (let k = 1; k <= 10; k++) {
    const a = (k / 10) * (Math.PI / 4);
    await touch('touchMove', [{ x: c2.x - R * Math.cos(a), y: c2.y - R * Math.sin(a) }, { x: c2.x + R * Math.cos(a), y: c2.y + R * Math.sin(a) }]);
  }
  await touch('touchEnd', []);
  await settle();
  const s2 = await st();
  check('twisting two fingers clockwise turns the design clockwise', s2.r <= -35 && s2.r >= -55, `${s2.r}°`);
  // The whole two-finger gesture is one undo step (tap the Undo button, as on an iPad).
  const undoBtn = await page.getByRole('button', { name: /^Undo \(/ }).boundingBox();
  await touch('touchStart', [{ x: undoBtn.x + undoBtn.width / 2, y: undoBtn.y + undoBtn.height / 2 }]);
  await touch('touchEnd', []);
  await settle();
  const s2u = await st();
  check('one tap on Undo reverses the whole twist', s2u.r === 0 && s2u.w === 3 && s2u.h === 4, `${s2u.w}x${s2u.h}, ${s2u.r}°`);

  // Apple Pencil: touching the skin away from the design brings the design to the tip.
  s = await st();
  check('Pencil mode starts off', !s.pencil);
  await page.evaluate(() => window.tattoo.get().requestCamera('front'));
  await settle(1500);
  // Aim at the middle of the chest: the ray from the front camera hits the chest skin.
  const target = await project([0, 1.25, 0]);
  await pen('mouseMoved', target, 0);
  await pen('mousePressed', target);
  for (let k = 1; k <= 6; k++) await pen('mouseMoved', { x: target.x + 2 * k, y: target.y + 3 * k });
  await pen('mouseReleased', { x: target.x + 12, y: target.y + 18 }, 0);
  await settle(1500);
  const s3 = await st();
  check('the Pencil switches Pencil mode on and explains it', s3.pencil && /Apple Pencil/.test(s3.notice ?? ''), s3.notice ?? '');
  check('a Pencil touch off the design moves the design to the Pencil', s3.focus && dist(s3.focus.point, s.focus.point) > 0.1, `moved ${(dist(s3.focus.point, s.focus.point) * 100).toFixed(0)} cm`);

  // Pencil mode: a finger tap elsewhere must not move the design; a finger drag turns the view.
  const before = s3.focus.point;
  const elsewhere = await project([-0.1, 1.0, 0.12]);
  await touch('touchStart', [elsewhere]);
  await touch('touchEnd', []);
  await settle(1200);
  const s4 = await st();
  check('in Pencil mode a finger tap does not move the design', dist(s4.focus.point, before) < 0.005, `moved ${(dist(s4.focus.point, before) * 1000).toFixed(1)} mm`);
  const camBefore = await project([0.4, 1.6, 0.3]);
  const onDesign = await project(s4.focus.point);
  // Small on screen, so the finger lands on a selection handle: in Pencil mode that must turn the view too.
  const under = await page.evaluate((p) => document.elementFromPoint(p.x, p.y)?.className ?? '', onDesign);
  await touch('touchStart', [onDesign]);
  for (let k = 1; k <= 10; k++) await touch('touchMove', [{ x: onDesign.x + 12 * k, y: onDesign.y }]);
  await touch('touchEnd', []);
  await settle(1200);
  const s5 = await st();
  const camAfter = await project([0.4, 1.6, 0.3]);
  check('in Pencil mode a finger drag on the design turns the view, not the design', dist(s5.focus.point, before) < 0.005 && Math.abs(camAfter.x - camBefore.x) > 5, `design moved ${(dist(s5.focus.point, before) * 1000).toFixed(1)} mm, view moved ${Math.abs(camAfter.x - camBefore.x).toFixed(0)} px, finger on ${String(under) || 'canvas'}`);
  check('the finger did not resize the design', Math.abs(s5.w - s4.w) < 0.01 && Math.abs(s5.h - s4.h) < 0.01, `${s4.w}x${s4.h} -> ${s5.w}x${s5.h}`);
  // The Pencil still uses the handles: drag the top-right corner outwards.
  const centre = (sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el || getComputedStyle(el).visibility !== 'visible') return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const ne = await centre('.box-handle.h-ne');
  const sw = await centre('.box-handle.h-sw');
  check('the corner handle is not covered by the bin or rotate knob', !!ne && /h-ne/.test(await page.evaluate((p) => document.elementFromPoint(p.x, p.y)?.className ?? '', ne)));
  const s6 = await st();
  if (ne && sw) {
    const dir = { x: (ne.x - sw.x) / 2, y: (ne.y - sw.y) / 2 };
    await pen('mouseMoved', ne, 0);
    await pen('mousePressed', ne);
    for (let k = 1; k <= 6; k++) await pen('mouseMoved', { x: ne.x + (dir.x * k) / 6, y: ne.y + (dir.y * k) / 6 });
    await pen('mouseReleased', { x: ne.x + dir.x, y: ne.y + dir.y }, 0);
    await settle();
  }
  const s7 = await st();
  check('the Pencil resizes the design with a corner handle', !!ne && !!sw && s7.w > s6.w * 1.5, `${s6.w}x${s6.h} -> ${s7.w}x${s7.h}`);
  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await browser.close();
  process.kill(-server.pid);
}
console.log(failures ? `${failures} check(s) failed` : 'All input checks passed');
process.exit(failures ? 1 : 0);
