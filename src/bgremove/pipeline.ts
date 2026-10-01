/**
 * Tattoo-tuned background removal. Pure functions on RGBA bytes, so it runs in a Web Worker and in
 * tests. No AI model: tattoo designs are line art or flash on a plain background, and a tuned classic
 * pipeline keeps fine lines and grey wash better than a generic cutout model (and avoids the AGPL
 * @imgly/background-removal).
 *
 *  1. Keep existing transparency if the image already has it.
 *  2. Background colour = per-channel median of the outer ring of pixels.
 *  3. Mode (auto-picked, artist can switch):
 *     - lineart: "colour to alpha" against the background, in linear light. White becomes clear,
 *       greys become ink of matching strength, white between lines clears too.
 *     - outer:   flood fill from the edges within tolerance, so enclosed white highlights survive.
 *     - colorkey: like lineart but against a picked (or detected) coloured background.
 *  4. Clean up: tolerance, despeckle (tiny islands), defringe (unmix halo colour from edges),
 *     feather (soften alpha), crop to the design.
 */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export type BgMode = 'lineart' | 'outer' | 'colorkey' | 'keep';

export interface BgOptions {
  /** 'auto' picks from the image. */
  mode: BgMode | 'auto';
  /** 0..100. Higher clears more near-background pixels (paper texture, scan noise). */
  tolerance: number;
  /** For colorkey; defaults to the detected background. sRGB 0..255. */
  keyColor?: [number, number, number];
  /**
   * 0..100. Removes ink islands smaller than despeckle * 2e-6 of the image area (0 = off). The default
   * 5 removes scan dust (~10 px on a 1 MP image) but keeps dotwork dots.
   */
  despeckle: number;
  /** Unmix the background colour out of soft edges (removes white halos). */
  defringe: boolean;
  /** 0..3 px of alpha softening. */
  feather: number;
  crop: boolean;
}

export const DEFAULT_OPTIONS: BgOptions = { mode: 'auto', tolerance: 25, despeckle: 5, defringe: true, feather: 0.5, crop: true };

export interface BgAnalysis {
  background: [number, number, number];
  /** How uniform the border is: median absolute deviation, 0..255. */
  borderSpread: number;
  hasTransparency: boolean;
  /** Share of non-background pixels that are coloured (chroma above a threshold). */
  colorfulness: number;
  suggested: BgMode;
}

export interface BgResult {
  image: RGBAImage;
  mode: BgMode;
  analysis: BgAnalysis;
  /** Crop rectangle in source pixels. */
  crop: { x: number; y: number; w: number; h: number };
  transparentFraction: number;
  removedSpecks: number;
  ms: number;
}

// sRGB <-> linear lookup tables.
const TO_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  TO_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const LIN_STEPS = 4096;
const TO_SRGB = new Uint8ClampedArray(LIN_STEPS + 1);
for (let i = 0; i <= LIN_STEPS; i++) {
  const l = i / LIN_STEPS;
  TO_SRGB[i] = Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055));
}
const toSrgb = (l: number) => TO_SRGB[Math.round(Math.min(Math.max(l, 0), 1) * LIN_STEPS)];

const WHITE: [number, number, number] = [1, 1, 1];
const luma = (r: number, g: number, b: number) => 0.2126 * TO_LIN[r] + 0.7152 * TO_LIN[g] + 0.0722 * TO_LIN[b];

function median(values: number[]): number {
  const s = values.slice().sort((a, b) => a - b);
  return s[s.length >> 1];
}

export function analyze(img: RGBAImage): BgAnalysis {
  const { width: w, height: h, data } = img;
  const ring = Math.max(2, Math.round(Math.min(w, h) * 0.01));
  const rs: number[] = [], gs: number[] = [], bs: number[] = [], as: number[] = [];
  const step = Math.max(1, Math.floor((2 * (w + h) * ring) / 20000)); // cap the sample count
  let k = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= ring && x < w - ring && y >= ring && y < h - ring) {
        x = w - ring - 1; // jump to the right ring
        continue;
      }
      if (k++ % step) continue;
      const i = 4 * (y * w + x);
      rs.push(data[i]);
      gs.push(data[i + 1]);
      bs.push(data[i + 2]);
      as.push(data[i + 3]);
    }
  }
  const background: [number, number, number] = [median(rs), median(gs), median(bs)];
  const dev = rs.map((r, i) => Math.abs(r - background[0]) + Math.abs(gs[i] - background[1]) + Math.abs(bs[i] - background[2]));
  const borderSpread = median(dev);

  // Transparency is "meaningful" when the border is mostly clear: the artist already cut it out.
  const clearBorder = as.filter((a) => a < 16).length / as.length;
  let translucent = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] < 250) translucent++;
  const hasTransparency = clearBorder > 0.5 || translucent / (data.length / 16) > 0.2;

  // Colourfulness of the ink: pixels clearly different from the background.
  let ink = 0, colored = 0;
  for (let i = 0; i < data.length; i += 4 * 7) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.abs(r - background[0]) + Math.abs(g - background[1]) + Math.abs(b - background[2]) < 60) continue;
    ink++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn > 50) colored++;
  }
  const colorfulness = ink ? colored / ink : 0;
  const bgLuma = luma(...background);
  const bgChroma = Math.max(...background) - Math.min(...background);
  const suggested: BgMode = hasTransparency
    ? 'keep'
    : bgLuma > 0.6 && bgChroma < 40
      ? colorfulness > 0.15
        ? 'outer'
        : 'lineart'
      : 'colorkey';
  return { background, borderSpread, hasTransparency, colorfulness, suggested };
}

/**
 * Colour to alpha (as in GIMP), in linear light: the least alpha such that the pixel equals
 * alpha * ink + (1 - alpha) * background with ink inside the RGB cube. Returns alpha and writes ink.
 */
function colorToAlpha(p: [number, number, number], bg: [number, number, number], ink: [number, number, number]): number {
  let a = 0;
  for (let c = 0; c < 3; c++) {
    const d = p[c] - bg[c];
    const ac = d < 0 ? -d / Math.max(bg[c], 1e-6) : d / Math.max(1 - bg[c], 1e-6);
    if (ac > a) a = ac;
  }
  a = Math.min(a, 1);
  for (let c = 0; c < 3; c++) ink[c] = a > 1e-6 ? bg[c] + (p[c] - bg[c]) / a : 0;
  return a;
}

export function removeBackground(src: RGBAImage, opts: Partial<BgOptions> = {}): BgResult {
  const t0 = performance.now();
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const analysis = analyze(src);
  const mode: BgMode = o.mode === 'auto' ? analysis.suggested : o.mode;
  const { width: w, height: h } = src;
  const n = w * h;
  const out = new Uint8ClampedArray(src.data);
  const bgSrgb = mode === 'colorkey' && o.keyColor ? o.keyColor : analysis.background;
  const bg: [number, number, number] = [TO_LIN[bgSrgb[0]], TO_LIN[bgSrgb[1]], TO_LIN[bgSrgb[2]]];
  // Tolerance -> alpha threshold. Scanned paper wobbles by a few percent; 25 clears that.
  const thr = 0.01 + (o.tolerance / 100) * 0.4;
  const p: [number, number, number] = [0, 0, 0];
  const ink: [number, number, number] = [0, 0, 0];

  if (mode === 'lineart' || mode === 'colorkey') {
    for (let i = 0; i < n; i++) {
      const j = 4 * i;
      p[0] = TO_LIN[out[j]];
      p[1] = TO_LIN[out[j + 1]];
      p[2] = TO_LIN[out[j + 2]];
      let a0: number;
      if (mode === 'lineart') {
        // White-balance to the paper first (a scan tints the ink with the paper colour too), so a
        // neutral grey wash stays neutral instead of picking up the paper's complementary colour.
        // Anything lighter than the paper (texture, scan glare) is paper.
        for (let c = 0; c < 3; c++) p[c] = Math.min(p[c] / Math.max(bg[c], 1e-6), 1);
        a0 = colorToAlpha(p, WHITE, ink);
        // Near-neutral marks are black ink, diluted (grey wash): black at the strength of their
        // luminance. Clearly coloured marks keep their colour. Blend between the two over a small
        // chroma range so there is no visible step.
        const chroma = Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]);
        const t = Math.min(Math.max((chroma - 0.03) / 0.06, 0), 1);
        if (t < 1) {
          const aGrey = 1 - (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]);
          for (let c = 0; c < 3; c++) ink[c] *= t;
          a0 = a0 * t + aGrey * (1 - t);
        }
        a0 *= out[j + 3] / 255;
      } else {
        a0 = colorToAlpha(p, bg, ink) * (out[j + 3] / 255);
      }
      const a = a0 <= thr ? 0 : Math.min(1, (a0 - thr) / (1 - thr) + 0.0);
      out[j] = toSrgb(ink[0]);
      out[j + 1] = toSrgb(ink[1]);
      out[j + 2] = toSrgb(ink[2]);
      out[j + 3] = Math.round(255 * a);
    }
  } else if (mode === 'outer') {
    // Flood fill the background from the border, within tolerance (in linear RGB distance).
    const bgMask = new Uint8Array(n);
    const near = (i: number) => {
      const j = 4 * i;
      if (out[j + 3] < 16) return true;
      const d = Math.abs(TO_LIN[out[j]] - bg[0]) + Math.abs(TO_LIN[out[j + 1]] - bg[1]) + Math.abs(TO_LIN[out[j + 2]] - bg[2]);
      return d < thr * 3;
    };
    const stack = new Int32Array(n);
    let sp = 0;
    const seed = (i: number) => {
      if (!bgMask[i] && near(i)) {
        bgMask[i] = 1;
        stack[sp++] = i;
      }
    };
    for (let x = 0; x < w; x++) {
      seed(x);
      seed((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      seed(y * w);
      seed(y * w + w - 1);
    }
    while (sp > 0) {
      const i = stack[--sp];
      const x = i % w;
      if (x > 0) seed(i - 1);
      if (x < w - 1) seed(i + 1);
      if (i >= w) seed(i - w);
      if (i < n - w) seed(i + w);
    }
    for (let i = 0; i < n; i++) if (bgMask[i]) out[4 * i + 3] = 0;
    if (o.defringe) {
      // Pixels within 2 px of the cleared background are anti-aliased against it: unmix the
      // background colour out of them so no white halo is left around the design.
      const band = dilate(dilate(bgMask, w, h), w, h);
      for (let i = 0; i < n; i++) {
        if (bgMask[i] || !band[i]) continue;
        const j = 4 * i;
        p[0] = TO_LIN[out[j]];
        p[1] = TO_LIN[out[j + 1]];
        p[2] = TO_LIN[out[j + 2]];
        const a = colorToAlpha(p, bg, ink);
        out[j] = toSrgb(ink[0]);
        out[j + 1] = toSrgb(ink[1]);
        out[j + 2] = toSrgb(ink[2]);
        out[j + 3] = Math.round(out[j + 3] * a);
      }
    }
  }

  const removedSpecks = o.despeckle > 0 ? despeckle(out, w, h, Math.round(n * 2e-6 * o.despeckle)) : 0;
  if (o.feather > 0) featherAlpha(out, w, h, o.feather);

  let crop = { x: 0, y: 0, w, h };
  if (o.crop) crop = alphaBounds(out, w, h);
  const image = cropImage({ width: w, height: h, data: out }, crop);
  let clear = 0;
  for (let i = 3; i < out.length; i += 4) if (out[i] === 0) clear++;
  return { image, mode, analysis, crop, transparentFraction: clear / n, removedSpecks, ms: performance.now() - t0 };
}

/** 8-neighbourhood dilation of a 0/1 mask. */
function dilate(m: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(m);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < w) out[yy * w + xx] = 1;
        }
      }
    }
  }
  return out;
}

/** Remove 8-connected islands of ink (alpha > 10%) smaller than minArea pixels. Returns how many. */
export function despeckle(data: Uint8ClampedArray, w: number, h: number, minArea: number): number {
  if (minArea < 2) return 0;
  const n = w * h;
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  let removed = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s] || data[4 * s + 3] < 26) continue;
    let head = 0, tail = 0;
    queue[tail++] = s;
    seen[s] = 1;
    while (head < tail) {
      const i = queue[head++];
      const x = i % w, y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const k = yy * w + xx;
          if (!seen[k] && data[4 * k + 3] >= 26) {
            seen[k] = 1;
            queue[tail++] = k;
          }
        }
      }
    }
    if (tail < minArea) {
      for (let q = 0; q < tail; q++) data[4 * queue[q] + 3] = 0;
      removed++;
    }
  }
  return removed;
}

/**
 * Soften alpha with `amount` px (fractional) of separable box blur. Edges only soften inwards
 * (alpha never grows), so cleared background pixels, whose colour is meaningless, never reappear
 * as a halo.
 */
export function featherAlpha(data: Uint8ClampedArray, w: number, h: number, amount: number) {
  const passes = Math.ceil(amount);
  const mix = amount / passes;
  const a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = data[4 * i + 3];
  const tmp = new Float32Array(w * h);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const l = a[x > 0 ? i - 1 : i], r = a[x < w - 1 ? i + 1 : i];
        tmp[i] = a[i] * (1 - mix) + ((l + a[i] + r) / 3) * mix;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const u = tmp[y > 0 ? i - w : i], d = tmp[y < h - 1 ? i + w : i];
        a[i] = tmp[i] * (1 - mix) + ((u + tmp[i] + d) / 3) * mix;
      }
    }
  }
  for (let i = 0; i < a.length; i++) data[4 * i + 3] = Math.min(data[4 * i + 3], Math.round(a[i]));
}

/** Bounding box of pixels with alpha > 2%, padded by 2% of the larger side. */
export function alphaBounds(data: Uint8ClampedArray, w: number, h: number) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[4 * (y * w + x) + 3] > 5) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w, h };
  const pad = Math.round(Math.max(w, h) * 0.02);
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function cropImage(img: RGBAImage, r: { x: number; y: number; w: number; h: number }): RGBAImage {
  if (r.x === 0 && r.y === 0 && r.w === img.width && r.h === img.height) return img;
  const data = new Uint8ClampedArray(r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) {
    const s = 4 * ((r.y + y) * img.width + r.x);
    data.set(img.data.subarray(s, s + 4 * r.w), 4 * y * r.w);
  }
  return { width: r.w, height: r.h, data };
}
