/**
 * Distortion of a placed design, measured per triangle on the actual mesh.
 *
 * For each triangle we form the linear map from design space (meters of design) to skin (meters of
 * skin). Its singular values s1 >= s2 say how long a 1-inch design segment becomes on the skin in its
 * most-stretched and most-compressed directions. A perfect placement has s1 = s2 = 1:
 *   - size error  = max(|s1 - 1|, |s2 - 1|)  ("is a 1-inch cell still 1 inch?")
 *   - anisotropy  = s1 / s2 - 1              ("is a square cell still square?")
 *   - flipped     = the design is mirrored on this triangle (seen from outside the skin)
 * Statistics are weighted by the skin area each triangle covers inside the design rectangle.
 */
export interface DistortionStats {
  triangles: number;
  /** Skin area covered by the design, m^2, and design area, m^2. */
  skinArea: number;
  designArea: number;
  sizeErrMean: number;
  sizeErrP95: number;
  sizeErrMax: number;
  anisoMean: number;
  anisoP95: number;
  /** Fraction of covered skin area where both the size and squareness errors are within 5%. */
  within5: number;
  flippedFraction: number;
  /** Mean of s1 and s2 (inches of skin per design inch). */
  meanScale: number;
}

/**
 * @param pos  9 floats per triangle: 3D positions (meters), counter-clockwise seen from outside.
 * @param uv   6 floats per triangle: design coordinates in [0,1]^2 for the design rectangle.
 * @param width,height design size in meters (to turn uv into design meters).
 */
export function measureDistortion(pos: ArrayLike<number>, uv: ArrayLike<number>, width: number, height: number): DistortionStats {
  const n = Math.floor(uv.length / 6);
  const rows: { w: number; size: number; aniso: number; flip: boolean; mean: number }[] = [];
  let skinArea = 0;
  for (let t = 0; t < n; t++) {
    const cu = (uv[6 * t] + uv[6 * t + 2] + uv[6 * t + 4]) / 3;
    const cv = (uv[6 * t + 1] + uv[6 * t + 3] + uv[6 * t + 5]) / 3;
    if (!(cu >= 0 && cu <= 1 && cv >= 0 && cv <= 1)) continue;
    const p = (i: number, k: number) => pos[9 * t + 3 * i + k];
    const E1 = [p(1, 0) - p(0, 0), p(1, 1) - p(0, 1), p(1, 2) - p(0, 2)];
    const E2 = [p(2, 0) - p(0, 0), p(2, 1) - p(0, 1), p(2, 2) - p(0, 2)];
    const l1 = Math.hypot(E1[0], E1[1], E1[2]);
    if (l1 < 1e-12) continue;
    const a = [E1[0] / l1, E1[1] / l1, E1[2] / l1];
    const e2a = E2[0] * a[0] + E2[1] * a[1] + E2[2] * a[2];
    const bRaw = [E2[0] - e2a * a[0], E2[1] - e2a * a[1], E2[2] - e2a * a[2]];
    const bl = Math.hypot(bRaw[0], bRaw[1], bRaw[2]);
    if (bl < 1e-12) continue;
    // Skin edges in the triangle's own orthonormal frame (det > 0 by construction).
    const S = [l1, e2a, 0, bl]; // [[S00, S01], [S10, S11]] columns = edges
    // Design edges in meters.
    const D = [
      (uv[6 * t + 2] - uv[6 * t]) * width,
      (uv[6 * t + 4] - uv[6 * t]) * width,
      (uv[6 * t + 3] - uv[6 * t + 1]) * height,
      (uv[6 * t + 5] - uv[6 * t + 1]) * height,
    ];
    const detD = D[0] * D[3] - D[1] * D[2];
    if (Math.abs(detD) < 1e-16) continue;
    // M = S * D^-1 : design meters -> skin meters.
    const Di = [D[3] / detD, -D[1] / detD, -D[2] / detD, D[0] / detD];
    const M = [S[0] * Di[0] + S[1] * Di[2], S[0] * Di[1] + S[1] * Di[3], S[2] * Di[0] + S[3] * Di[2], S[2] * Di[1] + S[3] * Di[3]];
    const [s1, s2] = singularValues2(M);
    const area = 0.5 * l1 * bl;
    skinArea += area;
    rows.push({ w: area, size: Math.max(Math.abs(s1 - 1), Math.abs(s2 - 1)), aniso: s1 / Math.max(s2, 1e-12) - 1, flip: detD < 0, mean: (s1 + s2) / 2 });
  }
  const wsum = rows.reduce((acc, r) => acc + r.w, 0) || 1;
  const wmean = (f: (r: (typeof rows)[number]) => number) => rows.reduce((acc, r) => acc + r.w * f(r), 0) / wsum;
  const wpct = (f: (r: (typeof rows)[number]) => number, q: number) => {
    const sorted = rows.map((r) => [f(r), r.w] as const).sort((x, y) => x[0] - y[0]);
    let acc = 0;
    for (const [v, w] of sorted) {
      acc += w;
      if (acc >= q * wsum) return v;
    }
    return sorted.length ? sorted[sorted.length - 1][0] : NaN;
  };
  return {
    triangles: rows.length,
    skinArea,
    designArea: width * height,
    sizeErrMean: wmean((r) => r.size),
    sizeErrP95: wpct((r) => r.size, 0.95),
    sizeErrMax: rows.reduce((m, r) => Math.max(m, r.size), 0),
    anisoMean: wmean((r) => r.aniso),
    anisoP95: wpct((r) => r.aniso, 0.95),
    within5: wmean((r) => (r.size <= 0.05 && r.aniso <= 0.05 && !r.flip ? 1 : 0)),
    flippedFraction: wmean((r) => (r.flip ? 1 : 0)),
    meanScale: wmean((r) => r.mean),
  };
}

/** Singular values (descending) of a 2x2 matrix given row-major [a, b, c, d]. */
export function singularValues2(m: number[]): [number, number] {
  const [a, b, c, d] = m;
  const s = a * a + b * b + c * c + d * d;
  const det = Math.abs(a * d - b * c);
  const disc = Math.sqrt(Math.max(s * s - 4 * det * det, 0));
  const s1 = Math.sqrt((s + disc) / 2);
  const s2 = Math.sqrt(Math.max((s - disc) / 2, 0));
  return [s1, s2];
}
