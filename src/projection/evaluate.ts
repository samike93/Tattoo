import type { BodySurface } from '../body/surface';
import { cylCoords, ringCenter, ringCircumference, type CylPlacement, type LimbFrame } from './cylindrical';
import { designUV, type DesignTransform } from './design';
import { measureDistortion, type DistortionStats } from './distortion';

/** Per-triangle (position, design uv) arrays for the distortion metric. */
export interface TriangleSamples {
  pos: Float64Array;
  uv: Float64Array;
}

/** Cylindrical wrap: sample every limb triangle, unwrapping triangles that straddle the seam. */
export function cylinderSamples(s: BodySurface, f: LimbFrame, pl: CylPlacement, tf: DesignTransform): TriangleSamples {
  const pos: number[] = [];
  const uv: number[] = [];
  const tri = s.triangles;
  for (let i = 0; i < tri.length; i += 3) {
    const ids = [tri[i], tri[i + 1], tri[i + 2]];
    if (!ids.every((v) => f.vertexMask[v])) continue;
    const c = ids.map((v) => cylCoords(f, [s.positions[3 * v], s.positions[3 * v + 1], s.positions[3 * v + 2]], pl));
    // Seam: keep the triangle continuous by shifting vertices that jumped by a full circumference.
    const x0 = c[0].x;
    for (const k of c) if (Math.abs(k.x - x0) > k.C / 2) k.x += k.x < x0 ? k.C : -k.C;
    for (let k = 0; k < 3; k++) {
      const v = ids[k];
      pos.push(s.positions[3 * v], s.positions[3 * v + 1], s.positions[3 * v + 2]);
      uv.push(...designUV(c[k].x, c[k].y, c[k].C, tf));
    }
  }
  return { pos: Float64Array.from(pos), uv: Float64Array.from(uv) };
}

/** Exponential map: sample every triangle whose three vertices were reached by the front. */
export function vertexCoordSamples(s: BodySurface, coords: Float64Array, tf: DesignTransform): TriangleSamples {
  const pos: number[] = [];
  const uv: number[] = [];
  const tri = s.triangles;
  for (let i = 0; i < tri.length; i += 3) {
    const ids = [tri[i], tri[i + 1], tri[i + 2]];
    if (!ids.every((v) => Number.isFinite(coords[2 * v]))) continue;
    for (const v of ids) {
      pos.push(s.positions[3 * v], s.positions[3 * v + 1], s.positions[3 * v + 2]);
      uv.push(...designUV(coords[2 * v], coords[2 * v + 1], 1, tf));
    }
  }
  return { pos: Float64Array.from(pos), uv: Float64Array.from(uv) };
}

export const measureSamples = (smp: TriangleSamples, tf: DesignTransform, bandCircumference?: number): DistortionStats =>
  measureDistortion(smp.pos, smp.uv, tf.band && bandCircumference ? bandCircumference : tf.width, tf.height);

/**
 * Seam check for a full band: on several rings, find where the design coordinate wraps (the seam),
 * then compare the design u just either side of it. Returns the worst gap (positive: skin left
 * uncovered) or overlap (negative) in meters along the ring.
 */
export function bandSeamMismatch(f: LimbFrame, pl: CylPlacement, tf: DesignTransform, tFrom: number, tTo: number, rings = 12): number {
  let worst = 0;
  for (let i = 0; i < rings; i++) {
    const t = tFrom + ((tTo - tFrom) * (i + 0.5)) / rings;
    const [cx, cy] = ringCenter(f, t);
    // 'arc' mode only uses (t, theta); for 'naive' mode use the radius of the circle with the same
    // circumference as the real cross-section.
    const r = ringCircumference(f, t) / (2 * Math.PI);
    const ringPoint = (theta: number): [number, number, number] => {
      const a = cx + r * Math.cos(theta), b = cy + r * Math.sin(theta);
      return [0, 1, 2].map((k) => f.A[k] + f.d[k] * t + a * f.e1[k] + b * f.e2[k]) as [number, number, number];
    };
    const uAt = (theta: number) => {
      const c = cylCoords(f, ringPoint(theta), pl);
      return designUV(c.x, c.y, c.C, tf)[0];
    };
    // Scan for the wrap, then bisect it down to a hair's width.
    const N = 720;
    let lo = NaN, hi = NaN;
    for (let j = 0; j < N; j++) {
      const a = -Math.PI + (2 * Math.PI * j) / N, b = a + (2 * Math.PI) / N;
      if (Math.abs(uAt(b) - uAt(a)) > 0.25) [lo, hi] = [a, b];
    }
    if (!Number.isFinite(lo)) continue;
    for (let k = 0; k < 50; k++) {
      const mid = (lo + hi) / 2;
      if (Math.abs(uAt(mid) - uAt(lo)) > 0.25) hi = mid;
      else lo = mid;
    }
    const ua = uAt(lo), ub = uAt(hi);
    const metersPerU = tf.band ? cylCoords(f, ringPoint(lo), pl).C : tf.width;
    const m = (Math.max(ua, ub) - Math.min(ua, ub) - 1) * metersPerU;
    if (Math.abs(m) > Math.abs(worst)) worst = m;
  }
  return worst;
}
