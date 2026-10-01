import type { Vec3 } from '../projection/vec';

/**
 * The selection box: where the design's corners and edge midpoints sit on the skin. Scene computes
 * these after every placement; the DOM overlay (ui/DesignBox.tsx) projects them to the screen every
 * frame. Kept outside React state so handles track the camera without re-rendering.
 */
export type HandleId = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w';

/** Design-space (u, v) of each handle; v = 1 is the top of the design. */
export const HANDLE_UV: Record<HandleId, [number, number]> = {
  nw: [0, 1], n: [0.5, 1], ne: [1, 1], e: [1, 0.5], se: [1, 0], s: [0.5, 0], sw: [0, 0], w: [0, 0.5],
};

export interface SurfacePoint {
  point: Vec3;
  normal: Vec3;
}

export interface BoxGeometry {
  center: SurfacePoint;
  handles: Partial<Record<HandleId, SurfacePoint>>;
  /** Band mode: only the top and bottom edges can be dragged, no rotation. */
  band: boolean;
}

type Listener = (b: BoxGeometry | null) => void;
let current: BoxGeometry | null = null;
const listeners = new Set<Listener>();

export function setBox(b: BoxGeometry | null) {
  current = b;
  for (const l of listeners) l(b);
}
export const getBox = () => current;
export function onBox(l: Listener) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

/** Per-frame projection hook, set by the scene (camera + canvas). */
export interface Projector {
  /** Screen (client) position; visible = in front of the camera and, with a normal, facing it. */
  project: (p: Vec3, normal?: Vec3) => { x: number; y: number; visible: boolean };
  setOrbitEnabled: (on: boolean) => void;
}
let projector: Projector | null = null;
export const setProjector = (p: Projector | null) => void (projector = p);
export const getProjector = () => projector;

/**
 * Find the skin points at the given design (u, v) positions, from per-vertex design coordinates.
 * `uv` holds 2 floats per welded vertex (NaN where the design map does not reach), `skip` marks
 * triangles to ignore (for example ones straddling a cylinder seam).
 */
export function locateUV(
  targets: [number, number][],
  uv: Float64Array,
  positions: Float64Array,
  normals: Float64Array,
  triangles: Uint32Array,
  skip?: (t: number) => boolean,
): (SurfacePoint | null)[] {
  const out: (SurfacePoint | null)[] = targets.map(() => null);
  const best = targets.map(() => Infinity);
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t], b = triangles[t + 1], c = triangles[t + 2];
    const ax = uv[2 * a], ay = uv[2 * a + 1], bx = uv[2 * b], by = uv[2 * b + 1], cx = uv[2 * c], cy = uv[2 * c + 1];
    if (!(Number.isFinite(ax) && Number.isFinite(bx) && Number.isFinite(cx))) continue;
    if (skip?.(t)) continue;
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(det) < 1e-14) continue;
    for (let k = 0; k < targets.length; k++) {
      const [px, py] = targets[k];
      const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / det;
      const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / det;
      const l3 = 1 - l1 - l2;
      // How far outside the triangle (0 = inside). Keep the closest, so a target exactly on the
      // design's edge still finds a triangle.
      const miss = Math.max(0, -l1, -l2, -l3);
      if (miss >= best[k] || miss > 0.05) continue;
      best[k] = miss;
      const p = [0, 1, 2].map((j) => l1 * positions[3 * a + j] + l2 * positions[3 * b + j] + l3 * positions[3 * c + j]) as Vec3;
      const n = [0, 1, 2].map((j) => l1 * normals[3 * a + j] + l2 * normals[3 * b + j] + l3 * normals[3 * c + j]) as Vec3;
      const len = Math.hypot(...n) || 1;
      out[k] = { point: p, normal: [n[0] / len, n[1] / len, n[2] / len] };
    }
  }
  return out;
}
