import type { Skeleton } from './skeleton';
import type { Vec3 } from '../projection/vec';

/**
 * Body shape from Anny's phenotype grid.
 *
 * tools/export_bodies.py stores the corners of Anny's height x weight x muscle anchor grid as morph
 * targets (2 x 3 x 3 = 18). Anny's mesh is exactly trilinear between those anchors, so blending the
 * corners reproduces any shape in range (checked to < 1e-9 mm against Anny itself). Height is set by
 * solving for the height phenotype that gives the client's height; outside Anny's range we scale.
 */
export interface ShapeGrid {
  height: number[];
  weight: number[];
  muscle: number[];
}

export interface ShapeCorner {
  height: number;
  weight: number;
  muscle: number;
  height_m: number;
  heads: Vec3[];
}

/**
 * Slider range per control. Thigh gap stops at -0.7: at -1 combined with the heaviest build and
 * maximum thighs and hips, the inner thighs would overlap by ~5 mm (tested in shape.test.ts).
 */
export const LOCAL_RANGE: Record<string, [number, number]> = { thighGap: [-0.7, 1] };
export const localRange = (id: string): [number, number] => LOCAL_RANGE[id] ?? [-1, 1];

/** A body-shape control (belly, bust, thighs...): two sparse morph targets, at +1 and -1. */
export interface LocalControl {
  id: string;
  label: string;
  plus: { target: number; heads: Vec3[] };
  minus: { target: number; heads: Vec3[] };
}

export interface ShapeData {
  grid: ShapeGrid;
  base: { height: number; weight: number; muscle: number };
  corners: ShapeCorner[];
  /** Local body-shape controls (absent in older exports). */
  local?: LocalControl[];
}

export interface ShapeParams {
  /** Target height in meters; undefined keeps the exported height phenotype. */
  heightM?: number;
  /** 0 = slim, 0.5 = average, 1 = heavy. */
  weight: number;
  /** 0 = soft, 0.5 = average, 1 = muscular. */
  muscle: number;
  /** Body-shape controls by id, each in [-1, 1] (0 = as Anny's average). */
  local?: Record<string, number>;
}

/** Piecewise-linear interpolation weights of x over sorted anchors: [[index, weight], ...]. */
export function anchorWeights(x: number, anchors: number[]): [number, number][] {
  const v = Math.min(Math.max(x, anchors[0]), anchors[anchors.length - 1]);
  for (let i = 0; i < anchors.length - 1; i++) {
    if (v <= anchors[i + 1] || i === anchors.length - 2) {
      const f = (v - anchors[i]) / (anchors[i + 1] - anchors[i]);
      return [
        [i, 1 - f],
        [i + 1, f],
      ];
    }
  }
  return [[0, 1]];
}

/** Weight of each corner (in export order: height-major, then weight, then muscle). */
export function cornerWeights(grid: ShapeGrid, h: number, w: number, m: number): Float64Array {
  const nw = grid.weight.length, nm = grid.muscle.length;
  const out = new Float64Array(grid.height.length * nw * nm);
  for (const [a, fa] of anchorWeights(h, grid.height)) {
    for (const [b, fb] of anchorWeights(w, grid.weight)) {
      for (const [c, fc] of anchorWeights(m, grid.muscle)) out[(a * nw + b) * nm + c] += fa * fb * fc;
    }
  }
  return out;
}

/**
 * Blend positions: base + sum_k weight_k * delta_k (deltas are relative to the base shape and the
 * weights sum to 1, so this equals the weighted mean of the corner shapes).
 */
export function blendPositions(base: ArrayLike<number>, deltas: ArrayLike<number>[], weights: Float64Array, out: Float32Array, yOnly = false) {
  const n = base.length;
  for (let i = yOnly ? 1 : 0; i < n; i += yOnly ? 3 : 1) out[i] = base[i];
  for (let k = 0; k < deltas.length; k++) {
    const wk = weights[k];
    if (wk === 0) continue;
    const d = deltas[k];
    for (let i = yOnly ? 1 : 0; i < n; i += yOnly ? 3 : 1) out[i] += wk * d[i];
  }
  return out;
}

export function blendHeads(shape: ShapeData, weights: Float64Array): Vec3[] {
  const nb = shape.corners[0].heads.length;
  const heads: Vec3[] = Array.from({ length: nb }, () => [0, 0, 0]);
  shape.corners.forEach((c, k) => {
    const wk = weights[k];
    if (wk === 0) return;
    for (let b = 0; b < nb; b++) for (let j = 0; j < 3; j++) heads[b][j] += wk * c.heads[b][j];
  });
  return heads;
}

function meshHeight(base: ArrayLike<number>, deltas: ArrayLike<number>[], weights: Float64Array, scratch: Float32Array) {
  blendPositions(base, deltas, weights, scratch, true);
  let lo = Infinity, hi = -Infinity;
  for (let i = 1; i < scratch.length; i += 3) {
    lo = Math.min(lo, scratch[i]);
    hi = Math.max(hi, scratch[i]);
  }
  return hi - lo;
}

export interface ShapeResult {
  positions: Float32Array;
  skeleton: Skeleton;
  /** The height phenotype used, 0..1. */
  heightPhenotype: number;
  /** Extra uniform scale applied when the client is outside Anny's height range (1 = none). */
  scale: number;
  heightM: number;
}

/**
 * Weights for every morph target: the 18 corners (trilinear in height/weight/muscle) followed by the
 * local controls (weight |s| on the +1 or -1 target). Exact: Anny's local changes are linear on each
 * side of 0 and independent of the phenotype.
 */
export function allWeights(shape: ShapeData, targetCount: number, h: number, p: ShapeParams): Float64Array {
  const w = new Float64Array(targetCount);
  w.set(cornerWeights(shape.grid, h, p.weight, p.muscle));
  for (const c of shape.local ?? []) {
    const [lo, hi] = localRange(c.id);
    const v = Math.min(Math.max(p.local?.[c.id] ?? 0, lo), hi);
    if (v > 0 && c.plus.target < targetCount) w[c.plus.target] = v;
    if (v < 0 && c.minus.target < targetCount) w[c.minus.target] = -v;
  }
  return w;
}

export function applyShape(base: ArrayLike<number>, deltas: ArrayLike<number>[], skeleton: Skeleton, shape: ShapeData, p: ShapeParams): ShapeResult {
  const scratch = new Float32Array(base.length);
  let h = shape.base.height;
  if (p.heightM !== undefined) {
    // Height grows monotonically with the height phenotype: bisect.
    const at = (x: number) => meshHeight(base, deltas, allWeights(shape, deltas.length, x, p), scratch);
    let lo = shape.grid.height[0], hi = shape.grid.height[shape.grid.height.length - 1];
    if (p.heightM <= at(lo)) h = lo;
    else if (p.heightM >= at(hi)) h = hi;
    else {
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (at(mid) < p.heightM) lo = mid;
        else hi = mid;
      }
      h = (lo + hi) / 2;
    }
  }
  const weights = allWeights(shape, deltas.length, h, p);
  const positions = blendPositions(base, deltas, weights, new Float32Array(base.length));
  let floor = Infinity, top = -Infinity;
  for (let i = 1; i < positions.length; i += 3) {
    floor = Math.min(floor, positions[i]);
    top = Math.max(top, positions[i]);
  }
  const k = p.heightM !== undefined ? p.heightM / (top - floor) : 1;
  const scale = Math.abs(k - 1) < 1e-6 ? 1 : k;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] *= scale;
    positions[i + 1] = (positions[i + 1] - floor) * scale;
    positions[i + 2] *= scale;
  }
  const heads = blendHeads(shape, weights.subarray(0, shape.corners.length));
  for (const c of shape.local ?? []) {
    for (const t of [c.plus, c.minus]) {
      const wk = weights[t.target] ?? 0;
      if (!wk) continue;
      for (let b = 0; b < heads.length; b++) for (let j = 0; j < 3; j++) heads[b][j] += wk * t.heads[b][j];
    }
  }
  return {
    positions,
    heightPhenotype: h,
    scale,
    heightM: (top - floor) * scale,
    skeleton: {
      ...skeleton,
      height_m: (top - floor) * scale,
      bones: skeleton.bones.map((b, i) => ({ ...b, head: [heads[i][0] * scale, (heads[i][1] - floor) * scale, heads[i][2] * scale] as Vec3 })),
    },
  };
}
