import type { RGBAImage } from '../bgremove/pipeline';

/** Synthetic tattoo-design fixtures with anti-aliased shapes, drawn without a canvas (runs in Node). */
type RGB = [number, number, number];

export function blank(w: number, h: number, bg: RGB, alpha = 255): RGBAImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([bg[0], bg[1], bg[2], alpha], 4 * i);
  return { width: w, height: h, data };
}

/** Paint where the signed distance `sdf` (px, negative inside) is < 0, with 1 px anti-aliasing. */
export function paint(img: RGBAImage, sdf: (x: number, y: number) => number, color: RGB, opacity = 1) {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const cov = Math.min(Math.max(0.5 - sdf(x + 0.5, y + 0.5), 0), 1) * opacity;
      if (cov <= 0) continue;
      const i = 4 * (y * img.width + x);
      for (let c = 0; c < 3; c++) img.data[i + c] = Math.round(img.data[i + c] * (1 - cov) + color[c] * cov);
      img.data[i + 3] = Math.round(img.data[i + 3] * (1 - cov) + 255 * cov);
    }
  }
}

export const ring = (cx: number, cy: number, r: number, width: number) => (x: number, y: number) => Math.abs(Math.hypot(x - cx, y - cy) - r) - width / 2;
export const disc = (cx: number, cy: number, r: number) => (x: number, y: number) => Math.hypot(x - cx, y - cy) - r;
export const segment = (x0: number, y0: number, x1: number, y1: number, width: number) => (x: number, y: number) => {
  const dx = x1 - x0, dy = y1 - y0;
  const t = Math.min(Math.max(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy), 0), 1);
  return Math.hypot(x - x0 - t * dx, y - y0 - t * dy) - width / 2;
};

/** Deterministic noise. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function addNoise(img: RGBAImage, amplitude: number, seed = 1) {
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() + r() + r() - 1.5) * 2 * amplitude; // roughly gaussian
    for (let c = 0; c < 3; c++) img.data[i + c] = img.data[i + c] + n;
  }
}

/** JPEG-like damage: 8x8 block offsets plus ringing next to edges, and scattered dust specks. */
export function jpegDamage(img: RGBAImage, seed = 2) {
  const r = rng(seed);
  for (let by = 0; by < img.height; by += 8) {
    for (let bx = 0; bx < img.width; bx += 8) {
      const off = (r() - 0.5) * 8;
      for (let y = by; y < Math.min(by + 8, img.height); y++) {
        for (let x = bx; x < Math.min(bx + 8, img.width); x++) {
          const i = 4 * (y * img.width + x);
          const ringing = (r() - 0.5) * 10;
          for (let c = 0; c < 3; c++) img.data[i + c] = img.data[i + c] + off + ringing;
        }
      }
    }
  }
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(r() * (img.width - 2)), y = Math.floor(r() * (img.height - 2));
    paint(img, disc(x, y, 0.9), [60, 60, 60]);
  }
}
