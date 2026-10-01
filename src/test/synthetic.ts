import { buildSurface, type BodySurface } from '../body/surface';
import type { LimbDef, Skeleton } from '../body/skeleton';

/**
 * A closed elliptical tube along -Y (like a hanging forearm) from y=0 down to y=-len.
 * Semi-axes rx (x, the "front" is +z so rz is depth) - triangles counter-clockwise from outside.
 */
export function tube(rx: number, rz: number, len: number, around = 96, along = 40): BodySurface {
  const position: number[] = [];
  const normal: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= along; i++) {
    const y = -(len * i) / along;
    for (let j = 0; j < around; j++) {
      const a = (2 * Math.PI * j) / around;
      const x = rx * Math.sin(a), z = rz * Math.cos(a);
      position.push(x, y, z);
      const nx = Math.sin(a) / rx, nz = Math.cos(a) / rz;
      const nl = Math.hypot(nx, nz);
      normal.push(nx / nl, 0, nz / nl);
    }
  }
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < around; j++) {
      const a = i * around + j, b = i * around + ((j + 1) % around);
      const c = a + around, d = b + around;
      // Outward-facing winding (verified in tests by comparing with the vertex normal).
      index.push(a, c, b, b, c, d);
    }
  }
  const n = position.length / 3;
  return buildSurface({ position, normal, index, vid: Array.from({ length: n }, (_, i) => i), bone: new Array(n).fill(0) });
}

/** A flat, finely triangulated square in the XY plane facing +Z. */
export function plane(size: number, cells = 60): BodySurface {
  const position: number[] = [];
  const normal: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= cells; i++) {
    for (let j = 0; j <= cells; j++) {
      position.push(-size / 2 + (size * j) / cells, -size / 2 + (size * i) / cells, 0);
      normal.push(0, 0, 1);
    }
  }
  const W = cells + 1;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
      index.push(a, b, d, a, d, c);
    }
  }
  const n = position.length / 3;
  return buildSurface({ position, normal, index, vid: Array.from({ length: n }, (_, i) => i), bone: new Array(n).fill(0) });
}

export const tubeSkeleton = (len: number): Skeleton => ({
  source: 'synthetic',
  units: 'meters',
  height_m: len,
  bones: [
    { name: 'a', parent: -1, head: [0, 0, 0] },
    { name: 'b', parent: 0, head: [0, -len, 0] },
  ],
});

export const tubeLimb: LimbDef = { id: 'tube', label: 'Tube', from: 'a', to: 'b', bones: ['a'] };

/** The triangle whose centroid is closest to p (good enough to seed tests). */
export function nearestTriangle(s: BodySurface, p: [number, number, number]): [number, number, number] {
  let best = 0, bd = Infinity;
  for (let i = 0; i < s.triangles.length; i += 3) {
    let d = 0;
    for (let k = 0; k < 3; k++) {
      const c = (s.positions[3 * s.triangles[i] + k] + s.positions[3 * s.triangles[i + 1] + k] + s.positions[3 * s.triangles[i + 2] + k]) / 3;
      d += (c - p[k]) ** 2;
    }
    if (d < bd) [best, bd] = [i, d];
  }
  return [s.triangles[best], s.triangles[best + 1], s.triangles[best + 2]];
}
