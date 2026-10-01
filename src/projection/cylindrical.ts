import type { BodySurface } from '../body/surface';
import { boneIndex, jointPos, type LimbDef, type Skeleton } from '../body/skeleton';
import { cross, dot, length, normalize, reject, sub, wrapPeriod, wrapPi, type Vec3 } from './vec';

/**
 * Cylindrical wrap around a limb bone axis.
 *
 * For joints A (proximal) and B (distal): d = normalize(B - A), e1 = the limb's "front",
 * e2 = e1 x d. For a point p: t = dot(p - A, d), r = (p - A) - t d, theta = atan2(r.e2, r.e1).
 *
 * Two circumferential coordinates are supported:
 *  - 'naive': x = theta * |r|  (the textbook formula; exact only for circular cross-sections)
 *  - 'arc':   x = true arc length along the cross-section, from a per-limb lookup table.
 *             Limbs are elliptical, so this keeps 1 inch = 1 inch all the way around.
 *             y = skin distance along the meridian (fixed angle), so bulges do not shrink the design.
 * In 'naive' mode y = centerT - t. y is positive towards the proximal joint, so a design is upright
 * when the arm hangs down. With e2 = e1 x d and x increasing with theta, (dP/dx x dP/dy) points
 * out of the skin, so designs are never mirrored (see cylindrical.test.ts).
 */
export interface LimbFrame {
  limb: LimbDef;
  A: Vec3;
  d: Vec3;
  e1: Vec3;
  e2: Vec3;
  length: number;
  /**
   * Ring table: nT rings x (nTheta + 1) angles, 4 floats each:
   * [fraction of circumference from theta=-PI, circumference C(t), meridian length M(t, theta), 0].
   * M is the distance along the skin (not along the bone) from the first ring at a fixed angle, so the
   * along-limb coordinate stays true where the limb bulges.
   */
  table: Float32Array;
  /**
   * Ring centres: nT x 2 floats (cx, cy) in the (e1, e2) plane. Angles are measured around the ring
   * centre, not the bone axis, because joints sit off-centre in the limb (the elbow is near the back).
   */
  centers: Float32Array;
  tMin: number;
  tMax: number;
  nT: number;
  nTheta: number;
  /** Welded vertices that belong to this limb (dominant bone in limb.bones). */
  vertexMask: Uint8Array;
}

export type CylMode = 'naive' | 'arc';

export interface CylPlacement {
  /** Distance from joint A along the axis to the design centre, meters. */
  centerT: number;
  /** Angle around the limb of the design centre, radians, 0 = front (e1). The band seam sits opposite. */
  centerAngle: number;
  mode: CylMode;
}

export interface CylCoords {
  /** Circumferential coordinate, meters, wrapped into [-C/2, C/2) around the design centre. */
  x: number;
  /** Axial coordinate, meters, positive towards joint A. */
  y: number;
  /** Ring circumference at this point (for band mode and seam unwrapping), meters. */
  C: number;
  t: number;
  theta: number;
  radius: number;
}

export const DEFAULT_NT = 48;
export const DEFAULT_NTHETA = 180;
export const TABLE_CHANNELS = 4;

/** 'joints': straight axis through the two joints. 'centroid': axis fitted to the limb's cross-section centres (default). */
export type AxisMode = 'joints' | 'centroid';

export function buildLimbFrame(
  surface: BodySurface,
  skeleton: Skeleton,
  limb: LimbDef,
  opts: { forward?: Vec3; nT?: number; nTheta?: number; axis?: AxisMode } = {},
): LimbFrame {
  let A = jointPos(skeleton, limb.from);
  const B = jointPos(skeleton, limb.to);
  const len = length(sub(B, A));
  let d = normalize(sub(B, A));
  const frameFor = (dd: Vec3) => {
    let front = reject(opts.forward ?? [0, 0, 1], dd);
    if (length(front) < 1e-3) front = reject([0, 1, 0], dd);
    const e1 = normalize(front);
    return { e1, e2: cross(e1, dd) };
  };
  let { e1, e2 } = frameFor(d);

  const boneSet = new Set(limb.bones.map((b) => boneIndex(skeleton, b)));
  const vertexMask = new Uint8Array(surface.vertexCount);
  for (let v = 0; v < surface.vertexCount; v++) vertexMask[v] = boneSet.has(surface.bone[v]) ? 1 : 0;

  const nT = opts.nT ?? DEFAULT_NT;
  const nTheta = opts.nTheta ?? DEFAULT_NTHETA;
  // Extend a little past the joints so the elbow and wrist ends still get a sensible ring.
  const tMin = -0.15 * len;
  const tMax = 1.1 * len;
  const centroid = (opts.axis ?? 'centroid') === 'centroid';
  let { table, centers } = buildArcTable(surface, vertexMask, A, d, e1, e2, tMin, tMax, nT, nTheta, centroid);
  if (centroid) {
    // Least-squares line through the ring centres over the middle of the limb, then re-slice
    // perpendicular to that line.
    const ts: number[] = [], xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < nT; i++) {
      const t = tMin + ((tMax - tMin) * i) / (nT - 1);
      if (t < 0.1 * len || t > 0.9 * len) continue;
      ts.push(t);
      xs.push(centers[2 * i]);
      ys.push(centers[2 * i + 1]);
    }
    if (ts.length >= 3) {
      const [ax, bx] = lineFit(ts, xs);
      const [ay, by] = lineFit(ts, ys);
      A = [A[0] + ax * e1[0] + ay * e2[0], A[1] + ax * e1[1] + ay * e2[1], A[2] + ax * e1[2] + ay * e2[2]];
      d = normalize([d[0] + bx * e1[0] + by * e2[0], d[1] + bx * e1[1] + by * e2[1], d[2] + bx * e1[2] + by * e2[2]]);
      ({ e1, e2 } = frameFor(d));
      ({ table, centers } = buildArcTable(surface, vertexMask, A, d, e1, e2, tMin, tMax, nT, nTheta, true));
    }
  }
  return { limb, A, d, e1, e2, length: len, table, centers, tMin, tMax, nT, nTheta, vertexMask };
}

/** y = a + b x least squares. */
function lineFit(x: number[], y: number[]): [number, number] {
  const n = x.length;
  const mx = x.reduce((p, q) => p + q, 0) / n, my = y.reduce((p, q) => p + q, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
  }
  const b = sxx > 0 ? sxy / sxx : 0;
  return [my - b * mx, b];
}

/** Slice the limb with planes perpendicular to the axis and integrate the cross-section perimeter. */
function buildArcTable(
  s: BodySurface,
  mask: Uint8Array,
  A: Vec3,
  d: Vec3,
  e1: Vec3,
  e2: Vec3,
  tMin: number,
  tMax: number,
  nT: number,
  nTheta: number,
  centerRings: boolean,
): { table: Float32Array; centers: Float32Array } {
  const tris: number[] = [];
  for (let i = 0; i < s.triangles.length; i += 3) {
    if (mask[s.triangles[i]] && mask[s.triangles[i + 1]] && mask[s.triangles[i + 2]]) tris.push(i);
  }
  // Per welded vertex: axial t and in-plane coordinates.
  const vt = new Float64Array(s.vertexCount);
  const vx = new Float64Array(s.vertexCount);
  const vy = new Float64Array(s.vertexCount);
  for (let v = 0; v < s.vertexCount; v++) {
    if (!mask[v]) continue;
    const p: Vec3 = [s.positions[3 * v] - A[0], s.positions[3 * v + 1] - A[1], s.positions[3 * v + 2] - A[2]];
    vt[v] = dot(p, d);
    vx[v] = dot(p, e1);
    vy[v] = dot(p, e2);
  }

  const W = nTheta + 1;
  const C4 = TABLE_CHANNELS;
  const table = new Float32Array(nT * W * C4);
  const centers = new Float32Array(2 * nT);
  const radii = new Float64Array(nT * W);
  const ringOk: boolean[] = [];
  const rho = new Float64Array(W);
  const castRing = (seg: number[], ox: number, oy: number) => {
    // Outermost hit of a ray from (ox, oy) at each angle: the skin silhouette of this ring.
    for (let j = 0; j < W; j++) {
      const th = -Math.PI + (2 * Math.PI * j) / nTheta;
      const cx = Math.cos(th), cy = Math.sin(th);
      let best = NaN;
      for (let k = 0; k < seg.length; k += 4) {
        const ax = seg[k] - ox, ay = seg[k + 1] - oy, bx = seg[k + 2] - ox, by = seg[k + 3] - oy;
        const ex = bx - ax, ey = by - ay;
        const den = cx * ey - cy * ex;
        if (Math.abs(den) < 1e-14) continue;
        const r = (ax * ey - ay * ex) / den;
        const u = (ax * cy - ay * cx) / den;
        if (r > 0 && u >= -1e-9 && u <= 1 + 1e-9 && !(r <= best)) best = r;
      }
      rho[j] = best;
    }
    fillCircularGaps(rho, nTheta);
  };
  const angle = (j: number) => -Math.PI + (2 * Math.PI * j) / nTheta;
  for (let i = 0; i < nT; i++) {
    const t = tMin + ((tMax - tMin) * i) / (nT - 1);
    // Cross-section segments in the (e1, e2) plane.
    const seg: number[] = [];
    for (const ti of tris) {
      const ids = [s.triangles[ti], s.triangles[ti + 1], s.triangles[ti + 2]];
      const pts: number[] = [];
      for (let k = 0; k < 3; k++) {
        const a = ids[k], b = ids[(k + 1) % 3];
        const da = vt[a] - t, db = vt[b] - t;
        if ((da < 0) !== (db < 0)) {
          const f = da / (da - db);
          pts.push(vx[a] + f * (vx[b] - vx[a]), vy[a] + f * (vy[b] - vy[a]));
        }
      }
      if (pts.length === 4) seg.push(...pts);
    }
    if (seg.length < 12) {
      ringOk.push(false);
      continue;
    }
    // Pass 1 from the axis to find the ring's area centroid, pass 2 from that centroid.
    castRing(seg, 0, 0);
    let area = 0, gx = 0, gy = 0;
    for (let j = 0; j < nTheta; j++) {
      const x0 = rho[j] * Math.cos(angle(j)), y0 = rho[j] * Math.sin(angle(j));
      const x1 = rho[j + 1] * Math.cos(angle(j + 1)), y1 = rho[j + 1] * Math.sin(angle(j + 1));
      const c = x0 * y1 - x1 * y0;
      area += c;
      gx += (x0 + x1) * c;
      gy += (y0 + y1) * c;
    }
    const ox = centerRings && Math.abs(area) > 1e-12 ? gx / (3 * area) : 0;
    const oy = centerRings && Math.abs(area) > 1e-12 ? gy / (3 * area) : 0;
    if (centerRings) castRing(seg, ox, oy);
    let cum = 0;
    const base = i * W * C4;
    for (let j = 1; j < W; j++) {
      const t0 = angle(j - 1), t1 = angle(j);
      cum += Math.hypot(rho[j] * Math.cos(t1) - rho[j - 1] * Math.cos(t0), rho[j] * Math.sin(t1) - rho[j - 1] * Math.sin(t0));
      table[base + C4 * j] = cum;
    }
    for (let j = 0; j < W; j++) {
      table[base + C4 * j] /= cum;
      table[base + C4 * j + 1] = cum;
      radii[i * W + j] = rho[j];
    }
    centers[2 * i] = ox;
    centers[2 * i + 1] = oy;
    ringOk.push(true);
  }
  // Rings past the ends of the limb mesh copy the nearest valid ring.
  const firstOk = ringOk.indexOf(true);
  if (firstOk < 0) throw new Error('Limb has no cross-sections; check the bone list');
  let last = firstOk;
  for (let i = 0; i < nT; i++) {
    if (ringOk[i]) last = i;
    else {
      table.copyWithin(i * W * C4, last * W * C4, (last + 1) * W * C4);
      radii.copyWithin(i * W, last * W, (last + 1) * W);
      centers.copyWithin(2 * i, 2 * last, 2 * last + 2);
    }
  }
  // Meridians: skin distance between consecutive rings at the same angle.
  const dt = (tMax - tMin) / (nT - 1);
  for (let j = 0; j < W; j++) {
    const th = angle(j);
    let m = 0;
    for (let i = 1; i < nT; i++) {
      const x0 = centers[2 * i - 2] + radii[(i - 1) * W + j] * Math.cos(th), y0 = centers[2 * i - 1] + radii[(i - 1) * W + j] * Math.sin(th);
      const x1 = centers[2 * i] + radii[i * W + j] * Math.cos(th), y1 = centers[2 * i + 1] + radii[i * W + j] * Math.sin(th);
      m += Math.hypot(dt, x1 - x0, y1 - y0);
      table[(i * W + j) * C4 + 2] = m;
    }
  }
  return { table, centers };
}

function fillCircularGaps(rho: Float64Array, nTheta: number) {
  // rho has nTheta + 1 entries, the last duplicating the first angle.
  const n = nTheta;
  const valid: number[] = [];
  for (let j = 0; j < n; j++) if (Number.isFinite(rho[j])) valid.push(j);
  if (valid.length === 0) {
    rho.fill(0.03);
    return;
  }
  for (let j = 0; j < n; j++) {
    if (Number.isFinite(rho[j])) continue;
    let p = j, q = j;
    while (!Number.isFinite(rho[(p + n) % n])) p--;
    while (!Number.isFinite(rho[q % n])) q++;
    const f = (j - p) / (q - p);
    rho[j] = rho[(p + n) % n] * (1 - f) + rho[q % n] * f;
  }
  rho[n] = rho[0];
}

/** Bilinear lookup of the ring table: [fraction, circumference, meridian, 0]. Mirrors the GLSL in ink/skinMaterial.ts. */
export function arcLookup(f: LimbFrame, t: number, theta: number): [number, number, number, number] {
  const W = f.nTheta + 1;
  const ti = Math.min(Math.max(((t - f.tMin) / (f.tMax - f.tMin)) * (f.nT - 1), 0), f.nT - 1);
  const tj = ((wrapPi(theta) + Math.PI) / (2 * Math.PI)) * f.nTheta;
  const i0 = Math.min(Math.floor(ti), f.nT - 2), j0 = Math.min(Math.floor(tj), f.nTheta - 1);
  const a = ti - i0, b = tj - j0;
  const at = (i: number, j: number, c: number) => f.table[(i * W + j) * TABLE_CHANNELS + c];
  const lerp2 = (c: number) =>
    (at(i0, j0, c) * (1 - b) + at(i0, j0 + 1, c) * b) * (1 - a) + (at(i0 + 1, j0, c) * (1 - b) + at(i0 + 1, j0 + 1, c) * b) * a;
  return [lerp2(0), lerp2(1), lerp2(2), lerp2(3)];
}

/** Ring centre offset (cx, cy) in the (e1, e2) plane at axial position t. */
export function ringCenter(f: LimbFrame, t: number): [number, number] {
  const ti = Math.min(Math.max(((t - f.tMin) / (f.tMax - f.tMin)) * (f.nT - 1), 0), f.nT - 1);
  const i0 = Math.min(Math.floor(ti), f.nT - 2), a = ti - i0;
  return [f.centers[2 * i0] * (1 - a) + f.centers[2 * i0 + 2] * a, f.centers[2 * i0 + 1] * (1 - a) + f.centers[2 * i0 + 3] * a];
}

export function cylCoords(f: LimbFrame, p: Vec3, pl: CylPlacement): CylCoords {
  const q = sub(p, f.A);
  const t = dot(q, f.d);
  const [cx, cy] = ringCenter(f, t);
  const rx = dot(q, f.e1) - cx, ry = dot(q, f.e2) - cy;
  const radius = Math.hypot(rx, ry);
  const theta = Math.atan2(ry, rx);
  const [frac, C, M] = arcLookup(f, t, theta);
  let x: number, y: number;
  if (pl.mode === 'naive') {
    x = wrapPi(theta - pl.centerAngle) * radius;
    y = pl.centerT - t;
  } else {
    const [frac0] = arcLookup(f, t, pl.centerAngle);
    x = wrapPeriod((frac - frac0) * C, C);
    y = arcLookup(f, pl.centerT, theta)[2] - M;
  }
  const period = pl.mode === 'naive' ? 2 * Math.PI * radius : C;
  return { x, y, C: period, t, theta, radius };
}

/** Circumference of the ring at axial position t (arc-length table). */
export const ringCircumference = (f: LimbFrame, t: number): number => arcLookup(f, t, 0)[1];
