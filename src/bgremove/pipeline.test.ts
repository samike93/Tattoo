import { describe, expect, it } from 'vitest';
import { removeBackground, type RGBAImage } from './pipeline';
import { addNoise, blank, disc, jpegDamage, paint, ring, segment } from '../test/designs';

const W = 240, H = 200;
const px = (img: RGBAImage, x: number, y: number) => Array.from(img.data.subarray(4 * (y * img.width + x), 4 * (y * img.width + x) + 4));
const lum = (p: number[]) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];

function lineArt(bg: [number, number, number] = [255, 255, 255]) {
  const img = blank(W, H, bg);
  paint(img, ring(120, 100, 60, 4), [0, 0, 0]);
  paint(img, segment(40, 30, 200, 170, 2), [0, 0, 0]);
  paint(img, disc(120, 100, 10), [128, 128, 128]); // grey wash dot
  return img;
}

/** Every pixel with some alpha is ink-coloured, not a white halo. */
function haloFree(img: RGBAImage, maxLum = 140) {
  let worst = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] > 25) worst = Math.max(worst, lum(Array.from(img.data.subarray(i, i + 3))));
  }
  return worst <= maxLum;
}

describe('background removal', () => {
  it('black line art on white: clear background and gaps, clean lines, grey stays grey', () => {
    const r = removeBackground(lineArt(), { crop: false, feather: 0 });
    expect(r.mode).toBe('lineart');
    expect(px(r.image, 5, 5)[3]).toBe(0); // background
    expect(px(r.image, 120, 60)[3]).toBe(0); // white gap inside the ring, between lines
    expect(px(r.image, 180, 100)[3]).toBeGreaterThan(240); // on the ring
    const grey = px(r.image, 120, 100);
    expect(grey[3]).toBeGreaterThan(150); // 50% sRGB grey = ~79% ink in linear light
    expect(grey[3]).toBeLessThan(230);
    expect(haloFree(r.image)).toBe(true);
  });

  it('scanned sketch on off-white paper with noise', () => {
    const img = lineArt([242, 236, 222]);
    addNoise(img, 5);
    const r = removeBackground(img, { crop: false });
    expect(r.mode).toBe('lineart');
    expect(r.transparentFraction).toBeGreaterThan(0.8);
    expect(px(r.image, 180, 100)[3]).toBeGreaterThan(200);
    expect(haloFree(r.image, 160)).toBe(true);
  });

  it('grey wash on warm paper stays neutral grey (no blue cast)', () => {
    const img = blank(W, H, [244, 239, 230]);
    paint(img, ring(120, 100, 60, 4), [17, 17, 17]);
    paint(img, disc(120, 100, 30), [119, 119, 119]);
    const r = removeBackground(img, { crop: false, feather: 0 });
    const g = px(r.image, 120, 100);
    expect(Math.max(g[0], g[1], g[2]) - Math.min(g[0], g[1], g[2])).toBeLessThan(16);
    expect(g[3]).toBeGreaterThan(150);
  });

  it('JPEG noise and dust: blocks clear, specks are removed, lines survive', () => {
    const img = lineArt();
    jpegDamage(img);
    const r = removeBackground(img, { crop: false, despeckle: 100 }); // ~10 px islands on this small image
    expect(r.removedSpecks).toBeGreaterThan(20);
    expect(r.transparentFraction).toBeGreaterThan(0.8);
    expect(px(r.image, 180, 100)[3]).toBeGreaterThan(200);
  });

  it('colour flash with white highlights: outer background clears, enclosed white is kept', () => {
    const img = blank(W, H, [255, 255, 255]);
    paint(img, disc(120, 100, 70), [0, 0, 0]);
    paint(img, disc(120, 100, 66), [200, 30, 40]);
    paint(img, disc(100, 80, 12), [255, 255, 255]); // highlight
    const r = removeBackground(img, { crop: false });
    expect(r.mode).toBe('outer');
    expect(px(r.image, 5, 5)[3]).toBe(0);
    expect(px(r.image, 100, 80)).toEqual([255, 255, 255, 255]);
    expect(px(r.image, 140, 120)[0]).toBeGreaterThan(150);
    // Edge pixels are unmixed from the white background: no pink fringe outside the black outline.
    expect(haloFree(maskRing(r.image, 120, 100, 69, 72))).toBe(true);
  });

  it('design on a coloured background: colour key clears it, lines stay black', () => {
    const r = removeBackground(lineArt([40, 150, 160]), { crop: false });
    expect(r.mode).toBe('colorkey');
    expect(px(r.image, 5, 5)[3]).toBe(0);
    expect(px(r.image, 120, 60)[3]).toBe(0);
    const line = px(r.image, 180, 100);
    expect(line[3]).toBeGreaterThan(240);
    expect(lum(line)).toBeLessThan(30);
  });

  it('an already transparent PNG is kept as is', () => {
    const img = blank(W, H, [0, 0, 0], 0);
    paint(img, ring(120, 100, 60, 4), [10, 10, 10]);
    const r = removeBackground(img, { crop: false, feather: 0, despeckle: 0 });
    expect(r.mode).toBe('keep');
    expect(Array.from(r.image.data)).toEqual(Array.from(img.data));
  });

  it('crops to the design with a small margin', () => {
    const img = blank(W, H, [255, 255, 255]);
    paint(img, disc(60, 50, 10), [0, 0, 0]);
    const r = removeBackground(img);
    expect(r.crop.x).toBeLessThanOrEqual(50);
    expect(r.crop.x + r.crop.w).toBeGreaterThanOrEqual(70);
    expect(r.crop.w).toBeLessThan(40);
  });

  it('handles a 4000 px image within the 2 s budget', () => {
    const big = blank(4000, 3000, [250, 248, 244]);
    // 30 concentric 6 px rings in one pass (painting them one by one makes the fixture slow).
    paint(big, (x, y) => {
      const r = Math.hypot(x - 2000, y - 1500);
      return r > 1250 ? r - 1250 : Math.abs(((r - 50) % 40 + 40) % 40 - 20) - 17;
    }, [0, 0, 0]);
    const r = removeBackground(big);
    console.log(`4000x3000 background removal: ${r.ms.toFixed(0)} ms`);
    expect(r.ms).toBeLessThan(4000); // 2 s target on a laptop; generous for CI runners
  }, 60000);
});

/** Keep only pixels in an annulus (for checking fringes). */
function maskRing(img: RGBAImage, cx: number, cy: number, r0: number, r1: number): RGBAImage {
  const data = new Uint8ClampedArray(img.data);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < r0 || d > r1) data[4 * (y * img.width + x) + 3] = 0;
    }
  }
  return { ...img, data };
}
