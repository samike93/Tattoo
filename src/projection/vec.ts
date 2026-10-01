/** Small allocation-light 3D vector helpers on plain tuples (no three.js, so the math runs in workers and tests). */
export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a);
  return l > 1e-12 ? scale(a, 1 / l) : [0, 0, 0];
};
/** Component of `a` perpendicular to unit vector `n`. */
export const reject = (a: Vec3, n: Vec3): Vec3 => sub(a, scale(n, dot(a, n)));

export const read3 = (arr: ArrayLike<number>, i: number): Vec3 => [arr[3 * i], arr[3 * i + 1], arr[3 * i + 2]];

/** Wrap an angle into [-PI, PI). */
export const wrapPi = (a: number): number => {
  const t = (a + Math.PI) % (2 * Math.PI);
  return (t < 0 ? t + 2 * Math.PI : t) - Math.PI;
};

/** Wrap x into [-period/2, period/2). */
export const wrapPeriod = (x: number, period: number): number => {
  const t = (x + period / 2) % period;
  return (t < 0 ? t + period : t) - period / 2;
};

/**
 * Minimal rotation taking unit vector `from` onto unit vector `to`, applied to `v` (Rodrigues).
 * Used to transport tangent frames between neighbouring surface normals.
 */
export function rotateMinimal(v: Vec3, from: Vec3, to: Vec3): Vec3 {
  const c = dot(from, to);
  const k = cross(from, to);
  if (c < -0.999999) {
    // Opposite normals: degenerate on a skin mesh, rotate PI around any perpendicular axis.
    const axis = normalize(Math.abs(from[0]) < 0.9 ? cross(from, [1, 0, 0]) : cross(from, [0, 1, 0]));
    return sub(scale(axis, 2 * dot(axis, v)), v);
  }
  // v' = v c + (k x v) + k (k.v) / (1 + c)
  return add(add(scale(v, c), cross(k, v)), scale(k, dot(k, v) / (1 + c)));
}

/** Orthonormal tangent frame (right, up, normal) with right x up = normal and up as close as possible to `upHint`. */
export function tangentFrame(normal: Vec3, upHint: Vec3): { e1: Vec3; e2: Vec3; n: Vec3 } {
  const n = normalize(normal);
  let up = reject(upHint, n);
  if (length(up) < 1e-3) up = reject(Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], n);
  const e2 = normalize(up);
  const e1 = cross(e2, n);
  return { e1, e2, n };
}
