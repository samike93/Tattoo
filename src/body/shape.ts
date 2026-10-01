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

export interface ShapeData {
  grid: ShapeGrid;
  base: { height: number; weight: number; muscle: number };
  corners: ShapeCorner[];
}

export interface ShapeParams {
  /** Target height in meters; undefined keeps the exported height phenotype. */
  heightM?: number;
  /** 0 = slim, 0.5 = average, 1 = heavy. */
  weight: number;
  /** 0 = soft, 0.5 = average, 1 = muscular. */
  muscle: number;
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

export function applyShape(base: ArrayLike<number>, deltas: ArrayLike<number>[], skeleton: Skeleton, shape: ShapeData, p: ShapeParams): ShapeResult {
  const scratch = new Float32Array(base.length);
  let h = shape.base.height;
  if (p.heightM !== undefined) {
    // Height grows monotonically with the height phenotype: bisect.
    const at = (x: number) => meshHeight(base, deltas, cornerWeights(shape.grid, x, p.weight, p.muscle), scratch);
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
  const weights = cornerWeights(shape.grid, h, p.weight, p.muscle);
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
  const heads = blendHeads(shape, weights);
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
