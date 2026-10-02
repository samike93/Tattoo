/**
 * Where the design sits on a client photo, in photo pixels (x right, y down).
 *
 * The design is a rectangle of real size (inches x the photo's pixels per inch), centred on `at`,
 * turned counter-clockwise by `rotation` (radians, as in the 3D view). `curve` (0..1) bends it
 * around a limb seen side-on: the design's width is arc length on a cylinder whose axis runs along
 * the design's height, so its sides crowd together toward the limb's edges like real ink does. At
 * curve 1 the design covers ~77 degrees either side of the middle.
 */
export interface PhotoDesign {
  at: [number, number];
  /** Size in photo pixels. */
  w: number;
  h: number;
  rotation: number;
  curve: number;
  mirror: boolean;
}

const MAX_HALF_ANGLE = 1.35; // radians

/** Cylinder radius in pixels for this design, or Infinity when flat. */
export function curveRadius(d: Pick<PhotoDesign, 'w' | 'curve'>): number {
  const half = d.curve * MAX_HALF_ANGLE;
  return half < 1e-4 ? Infinity : d.w / 2 / half;
}

/** Design (u, v) in 0..1 (v down) to photo pixels. */
export function designToPhoto(d: PhotoDesign, u: number, v: number): [number, number] {
  const s = (u - 0.5) * d.w;
  const R = curveRadius(d);
  const x = Number.isFinite(R) ? R * Math.sin(s / R) : s;
  const y = (v - 0.5) * d.h;
  const c = Math.cos(d.rotation), sn = Math.sin(d.rotation);
  // Counter-clockwise on screen with y pointing down.
  return [d.at[0] + c * x + sn * y, d.at[1] - sn * x + c * y];
}

/** Photo pixels to design (u, v), or null outside the design. */
export function photoToDesign(d: PhotoDesign, px: number, py: number, margin = 0): [number, number] | null {
  const dx = px - d.at[0], dy = py - d.at[1];
  const c = Math.cos(d.rotation), sn = Math.sin(d.rotation);
  const x = c * dx - sn * dy;
  const y = sn * dx + c * dy;
  const R = curveRadius(d);
  let s = x;
  if (Number.isFinite(R)) {
    if (Math.abs(x) > R) return null;
    s = R * Math.asin(x / R);
  }
  const u = s / d.w + 0.5, v = y / d.h + 0.5;
  return u >= -margin && u <= 1 + margin && v >= -margin && v <= 1 + margin ? [u, v] : null;
}

/** Default scale when none was measured: assume the photo's long side spans about 14 inches. */
export function estimatedPxPerInch(photoW: number, photoH: number): number {
  return Math.max(photoW, photoH) / 14;
}

/** How the photo fits the stage: photo px -> stage CSS px is p * scale + offset. */
export interface PhotoView {
  scale: number;
  ox: number;
  oy: number;
}

export function fitView(photoW: number, photoH: number, stageW: number, stageH: number, zoom = 1, pan: [number, number] = [0, 0]): PhotoView {
  const base = Math.min(stageW / photoW, stageH / photoH) * 0.96;
  const scale = base * zoom;
  return { scale, ox: (stageW - photoW * scale) / 2 + pan[0], oy: (stageH - photoH * scale) / 2 + pan[1] };
}
