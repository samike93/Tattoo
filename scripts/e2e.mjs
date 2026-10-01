// End-to-end checks in headless Chromium against the production build.
// Usage: npm run build && node scripts/e2e.mjs   (writes screenshots to docs/phase1/e2e-*.png)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4183;
const OUT = 'docs/phase1';
const executablePath = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
mkdirSync(OUT, { recursive: true });

// Minimal multi-page PDF (same as src/test/fixtures.ts).
function makePdf(pages, prefix = '') {
  const objs = [];
  const kids = [];
  for (let i = 0; i < pages; i++) {
    const pageId = 3 + 2 * i, contentId = 4 + 2 * i;
    kids.push(pageId);
    const stream = `0 0 0 rg ${20 + 30 * i} 20 100 100 re f 0.8 0.1 0.1 rg 60 60 30 30 re f`;
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 150] /Contents ${contentId} 0 R >>`;
    objs[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${pages} >>`;
  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let id = 1; id < objs.length; id++) {
    offsets[id] = prefix.length + out.length;
    out += `${id} 0 obj\n${objs[id]}\nendobj\n`;
  }
  const xref = prefix.length + out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objs.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(prefix + out, 'latin1');
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && pageErrors.push(m.text()));
const state = () => page.evaluate(() => {
  const s = window.tattoo.get();
  return { status: s.status, resolved: s.resolved, placement: s.placement, metrics: s.metrics, appliedSize: s.appliedSize, design: { kind: s.design.kind, name: s.design.name }, errors: s.errors, focus: s.focus };
});
const ready = () => page.waitForFunction(() => window.tattoo?.get().status === 'Ready', null, { timeout: 60000 });
const settle = (ms = 800) => page.waitForTimeout(ms);
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
/** Screen position of a 3D point. */
const project = (p) => page.evaluate((p) => window.tattoo.project(p), p);

try {
  await page.goto(`http://localhost:${PORT}/`);
  await ready();
  await settle(1500);
  let s = await state();
  check('opens in auto mode with a surface wrap on the forearm', s.resolved.method === 'expmap' && /forearm/i.test(s.resolved.limbLabel ?? ''), JSON.stringify(s.resolved));
  check('default placement is true to size', s.metrics?.within5 > 0.9, `within5 ${s.metrics?.within5}`);
  await page.screenshot({ path: `${OUT}/e2e-default.png` });

  // Full band on the forearm switches to the cylinder.
  await page.getByLabel(/Full band/).check();
  await settle();
  s = await state();
  check('full band switches to the cylindrical wrap', s.resolved.method === 'cylinder', JSON.stringify(s.resolved));
  await page.getByLabel(/Full band/).uncheck();
  await settle();

  // A design wrapping most of the way round the forearm switches to the cylinder automatically.
  await page.evaluate(() => window.tattoo.set({ widthIn: 7, heightIn: 3 }));
  await settle();
  s = await state();
  check('a 7 in wide forearm design uses the cylinder', s.resolved.method === 'cylinder', JSON.stringify(s.resolved));
  await page.evaluate(() => window.tattoo.set({ widthIn: 3, heightIn: 4 }));
  await settle();

  // Selection box: resize from a corner, stretch from an edge, rotate, delete and undo.
  const handle = async (cls) => {
    const b = await page.locator(`.box-handle.${cls}`).boundingBox();
    return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const dragFrom = async (p, dx, dy) => {
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++) await page.mouse.move(p.x + (dx * k) / 10, p.y + (dy * k) / 10);
    await page.mouse.up();
    await settle(900);
  };
  const size = () => page.evaluate(() => { const s = window.tattoo.get(); return { w: s.widthIn, h: s.heightIn, r: s.rotationDeg, kind: s.design.kind }; });
  check('the selection box shows 8 handles, rotate and delete', (await page.locator('.box-handle').count()) === 10);
  let se = await handle('h-se'), center = await project((await state()).focus.point);
  let z0 = await size();
  await dragFrom(se, (se.x - center.x) * 0.5, (se.y - center.y) * 0.5);
  let z1 = await size();
  check('dragging a corner outwards enlarges the design proportionally', z1.w > z0.w * 1.3 && Math.abs(z1.w / z1.h - z0.w / z0.h) < 0.03, `${z0.w}x${z0.h} -> ${z1.w}x${z1.h}`);
  // (Side handles that wrap round the far side of a limb are hidden; the top edge faces the camera.)
  const nh = await handle('h-n');
  await dragFrom(nh, -(nh.x - center.x) * 0.3, -(nh.y - center.y) * 0.3);
  const z2 = await size();
  check('dragging a side handle stretches only that side', z2.h < z1.h * 0.85 && z2.w === z1.w, `${z1.w}x${z1.h} -> ${z2.w}x${z2.h}`);
  const knob = await handle('rotate');
  center = await project((await state()).focus.point);
  // Swing the knob a quarter turn clockwise around the centre (on screen).
  const rx = knob.x - center.x, ry = knob.y - center.y;
  await page.mouse.move(knob.x, knob.y);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) {
    const a = (k / 12) * (Math.PI / 2);
    await page.mouse.move(center.x + rx * Math.cos(a) - ry * Math.sin(a), center.y + rx * Math.sin(a) + ry * Math.cos(a));
  }
  await page.mouse.up();
  await settle(900);
  const z3 = await size();
  check('the rotate knob turns the design (clockwise drag = clockwise turn)', z3.r <= -70 && z3.r >= -110, `${z3.r}°`);
  const top = await handle('h-n');
  const cNow = await project((await state()).focus.point);
  const turned = Math.atan2(top.y - cNow.y, top.x - cNow.x) - Math.atan2(ry, rx);
  check('after turning, the top handle sits where the knob was dragged', Math.abs(Math.cos(turned) - Math.cos(Math.PI / 2)) < 0.35, `${((turned * 180) / Math.PI).toFixed(0)}°`);
  await page.evaluate(() => window.tattoo.set({ widthIn: 3, heightIn: 4, rotationDeg: 0 }));
  await settle(800);
  await page.keyboard.press('Delete');
  await settle(800);
  check('Delete removes the design and offers Undo', (await size()).kind === 'none' && (await page.getByRole('button', { name: 'Undo' }).count()) > 0);
  await page.keyboard.press('Control+z');
  await settle(1000);
  check('Ctrl+Z brings it back, selected', (await size()).kind === 'checker' && (await page.locator('.box-handle').count()) === 10);
  await page.locator('.box-handle.trash').click();
  await settle(600);
  await page.getByRole('button', { name: 'Undo' }).first().click();
  await settle(1000);
  check('the bin button deletes and Undo restores', (await size()).kind === 'checker');
  await page.screenshot({ path: `${OUT}/e2e-selection-box.png` });
  await page.keyboard.press('Escape');
  await settle(400);
  check('Escape hides the box', (await page.locator('.box-handle').count()) === 0);

  // Drag the design: grab its centre and move the pointer.
  s = await state();
  const c = await project(s.focus.point);
  const before = s.focus.point;
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  for (let k = 1; k <= 15; k++) await page.mouse.move(c.x - 6 * k, c.y + 8 * k);
  await page.mouse.up();
  await settle(1200);
  s = await state();
  const moved = Math.hypot(...s.focus.point.map((v, i) => v - before[i]));
  check('dragging the design moves it along the skin', moved > 0.02 && s.resolved.method === 'expmap', `moved ${(moved * 100).toFixed(1)} cm`);

  // Tap the back: surface wrap, no limb.
  await page.evaluate(() => window.tattoo.get().requestCamera('back'));
  await settle(800);
  const back = await page.evaluate(() => {
    const s = window.tattoo.get();
    return window.tattoo.project([0.06, s.focus ? 1.35 : 1.35, -0.2]);
  });
  await page.mouse.click(back.x, back.y);
  await settle(1200);
  s = await state();
  check('tapping the upper back places a surface wrap there', s.resolved.method === 'expmap' && !s.resolved.limbLabel && s.placement && s.placement.point[2] < 0, JSON.stringify(s.resolved));
  await page.evaluate(() => window.tattoo.get().requestCamera('design'));
  await settle(800);
  await page.screenshot({ path: `${OUT}/e2e-back.png` });

  // Body shape: height and build.
  await page.evaluate(() => window.tattoo.set({ clientHeight: 1.6, bodyWeight: 0.9 }));
  await settle(1500);
  const h = await page.evaluate(() => window.tattoo.bodyHeight());
  check('client height 1.60 m gives a 1.60 m body', Math.abs(h - 1.6) < 0.002, `${h.toFixed(4)} m`);

  // Import: PNG line art through background removal.
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 600;
    const g = c.getContext('2d');
    g.fillStyle = '#f4efe6';
    g.fillRect(0, 0, 800, 600);
    g.strokeStyle = '#111';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(400, 300, 200, 0, Math.PI * 2);
    g.moveTo(250, 300);
    g.lineTo(550, 300);
    g.stroke();
    g.fillStyle = '#777';
    g.beginPath();
    g.arc(400, 220, 40, 0, Math.PI * 2);
    g.fill();
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByRole('button', { name: /Import design/ }).click();
  await page.locator('.modal input[type=file]').setInputFiles({ name: 'rose.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.getByText('Remove background', { exact: true }).waitFor();
  await page.waitForSelector('.compare figure:nth-child(2) img', { timeout: 20000 });
  await settle(600);
  const modeLabel = await page.locator('.modal .seg button.on').first().innerText();
  check('line art on paper auto-selects line art mode', /Line art/.test(modeLabel), modeLabel);
  await page.screenshot({ path: `${OUT}/e2e-bg-removal.png` });
  await page.getByRole('button', { name: 'Use design' }).click();
  await page.waitForSelector('.modal', { state: 'detached', timeout: 20000 });
  await settle(1500);
  s = await state();
  check('imported design is placed on the body', s.design.kind === 'image' && s.design.name === 'rose.png' && s.status === 'Ready', s.design.name);
  await page.screenshot({ path: `${OUT}/e2e-imported.png` });

  // Multi-page PDF: page picker.
  await page.getByRole('button', { name: /Import another/ }).click();
  await page.locator('.modal input[type=file]').setInputFiles({ name: 'flash-sheet.pdf', mimeType: 'application/pdf', buffer: makePdf(3) });
  await page.getByText('Choose a page').waitFor({ timeout: 20000 });
  await page.waitForSelector('.pages .page img', { timeout: 20000 }).catch(async (e) => {
    console.log('app errors:', JSON.stringify((await state()).errors));
    throw e;
  });
  check('a 3-page PDF shows 3 page thumbnails', (await page.locator('.pages .page').count()) === 3);
  await page.locator('.pages .page').nth(1).click();
  await page.getByText('Remove background', { exact: true }).waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Use design' }).click();
  await page.waitForSelector('.modal', { state: 'detached', timeout: 20000 });
  s = await state();
  check('PDF page 2 becomes the design', /page 2/.test(s.design.name), s.design.name);

  // PDF-compatible .ai and legacy .ai.
  await page.getByRole('button', { name: /Import another/ }).click();
  await page.locator('.modal input[type=file]').setInputFiles({ name: 'koi.ai', mimeType: 'application/postscript', buffer: makePdf(1, '%AI preamble\n') });
  await page.getByText('Remove background', { exact: true }).waitFor({ timeout: 20000 });
  check('a PDF-compatible .ai opens', true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Import another/ }).click();
  await page.locator('.modal input[type=file]').setInputFiles({ name: 'old.ai', mimeType: 'application/postscript', buffer: Buffer.from('%!PS-Adobe-3.0\n%%Creator: Adobe Illustrator(R) 8.0\n') });
  await page.locator('.modal .error').waitFor({ timeout: 10000 });
  const msg = await page.locator('.modal .error').innerText();
  check('a non-PDF-compatible .ai shows the re-save message', /Create PDF Compatible File/.test(msg), msg.slice(0, 60));
  await page.keyboard.press('Escape');

  // Export a high-resolution front view.
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Front', exact: true }).last().click()]);
  const file = `${OUT}/e2e-export-front.png`;
  await download.saveAs(file);
  const dims = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, (await import('node:fs')).readFileSync(file).toString('base64'));
  check('exports a 2250 x 3000 px front view PNG', dims[0] === 2250 && dims[1] === 3000, dims.join(' x '));

  // Skin close-ups, detail on and off.
  await page.evaluate(() => window.tattoo.set({ design: { kind: 'checker', name: '1-inch checkerboard', aspect: 0.75 }, placement: null, spot: 'forearm', widthIn: 3, heightIn: 4, skinDetail: true, skinTone: '#b47b52' }));
  await settle(1500);
  // Close enough to see pores: 12 cm from the skin, looking at the edge of the design.
  await page.evaluate(() => {
    const f = window.tattoo.get().focus;
    window.tattoo.lookAt(f.point.map((v, i) => v + f.normal[i] * 0.12 + (i === 1 ? 0.03 : 0)), f.point);
  });
  await settle(1000);
  await page.screenshot({ path: `${OUT}/e2e-skin-detail.png`, clip: { x: 160, y: 120, width: 620, height: 620 } });
  await page.evaluate(() => window.tattoo.set({ skinDetail: false }));
  await settle(800);
  await page.screenshot({ path: `${OUT}/e2e-skin-plain.png`, clip: { x: 160, y: 120, width: 620, height: 620 } });
  await page.evaluate(() => window.tattoo.set({ skinDetail: true }));

  s = await state();
  check('no errors logged by the app', s.errors.length === 0, JSON.stringify(s.errors));
  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await browser.close();
  process.kill(-server.pid);
}
console.log(failures ? `${failures} check(s) failed` : 'All e2e checks passed');
process.exit(failures ? 1 : 0);
