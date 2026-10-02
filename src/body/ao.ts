/**
 * Per-vertex ambient occlusion for the body, recomputed whenever its shape changes (so a bigger
 * belly or closed thigh gap darkens the right creases). Disc-based occlusion after Bunnell (GPU Gems
 * 2, ch. 14): every vertex is a small disc of a third of its triangles' area; each receiver adds up
 * the cosine-weighted solid angle of the discs in front of it. Neighbours on the same smooth surface
 * lie in its tangent plane and add almost nothing; folds, creases and limbs close to the body add a
 * lot. Two levels keep it fast: single vertices up to NEAR, clusters of skin (CLUSTER cells, area,
 * mean position and normal) from NEAR to FAR. One smoothing pass removes speckle.
 */
const NEAR = 0.035; // meters
const FAR = 0.14;
const CLUSTER = 0.025;
const STRENGTH = 1.1;
const MAX_OCCLUSION = 0.8;

type Arr = Float32Array | Float64Array;

/** Bucket points into a uniform grid; returns lookup helpers for neighbour queries. */
function grid(points: Arr, n: number, cell: number) {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, points[3 * i]); maxX = Math.max(maxX, points[3 * i]);
    minY = Math.min(minY, points[3 * i + 1]); maxY = Math.max(maxY, points[3 * i + 1]);
    minZ = Math.min(minZ, points[3 * i + 2]); maxZ = Math.max(maxZ, points[3 * i + 2]);
  }
  const gx = Math.ceil((maxX - minX) / cell) + 1, gy = Math.ceil((maxY - minY) / cell) + 1, gz = Math.ceil((maxZ - minZ) / cell) + 1;
  const key = (x: number, y: number, z: number) => (Math.floor((x - minX) / cell) * gy + Math.floor((y - minY) / cell)) * gz + Math.floor((z - minZ) / cell);
  // Cells along z are contiguous in memory, so a z-run of cells is one slice of `order`.
  const start = new Int32Array(gx * gy * gz + 1);
  const cellOf = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    cellOf[i] = key(points[3 * i], points[3 * i + 1], points[3 * i + 2]);
    start[cellOf[i] + 1]++;
  }
  for (let c = 1; c < start.length; c++) start[c] += start[c - 1];
  const order = new Int32Array(n);
  const fill = start.slice(0, -1);
  for (let i = 0; i < n; i++) order[fill[cellOf[i]]++] = i;
  const cellCoord = (x: number, y: number, z: number) => [Math.floor((x - minX) / cell), Math.floor((y - minY) / cell), Math.floor((z - minZ) / cell)];
  return { cellOf, cells: gx * gy * gz, start, order, gx, gy, gz, cellCoord };
}

export function vertexAO(positions: Arr, normals: Arr, triangles: ArrayLike<number>, n: number): Float32Array {
  // Disc areas.
  const area = new Float64Array(n);
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t], b = triangles[t + 1], c = triangles[t + 2];
    const ux = positions[3 * b] - positions[3 * a], uy = positions[3 * b + 1] - positions[3 * a + 1], uz = positions[3 * b + 2] - positions[3 * a + 2];
    const vx = positions[3 * c] - positions[3 * a], vy = positions[3 * c + 1] - positions[3 * a + 1], vz = positions[3 * c + 2] - positions[3 * a + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const third = Math.sqrt(cx * cx + cy * cy + cz * cz) / 6;
    area[a] += third;
    area[b] += third;
    area[c] += third;
  }

  // Clusters: area-weighted centre and normal of the skin in each CLUSTER cell.
  const cg = grid(positions, n, CLUSTER);
  const slot = new Int32Array(cg.cells).fill(-1);
  let m = 0;
  for (let i = 0; i < n; i++) if (slot[cg.cellOf[i]] < 0) slot[cg.cellOf[i]] = m++;
  const cPos = new Float64Array(3 * m), cNrm = new Float64Array(3 * m), cArea = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    const s = slot[cg.cellOf[i]], a = area[i];
    cArea[s] += a;
    for (let k = 0; k < 3; k++) {
      cPos[3 * s + k] += a * positions[3 * i + k];
      cNrm[3 * s + k] += a * normals[3 * i + k];
    }
  }
  for (let s = 0; s < m; s++) {
    const a = cArea[s] || 1;
    for (let k = 0; k < 3; k++) cPos[3 * s + k] /= a;
    // Keep the summed normal's length / area: < 1 where the skin in the cell curves away.
    for (let k = 0; k < 3; k++) cNrm[3 * s + k] /= a;
  }
  const fine = grid(positions, n, NEAR);
  const coarse = grid(cPos, m, FAR / 2);

  const occ = new Float64Array(n);
  const NEAR2 = NEAR * NEAR, FAR2 = FAR * FAR;
  // Plain loops (no callbacks): this is the hot path, ~10^7 candidate pairs.
  const scan = (g: ReturnType<typeof grid>, pts: Arr, A: ArrayLike<number>, nrm: Arr, i: number, reach: number, lo2: number, hi2: number, fade: boolean) => {
    const px = positions[3 * i], py = positions[3 * i + 1], pz = positions[3 * i + 2];
    const nx = normals[3 * i], ny = normals[3 * i + 1], nz = normals[3 * i + 2];
    const [cx, cy, cz] = g.cellCoord(px, py, pz);
    const { start, order, gx, gy, gz } = g;
    let sum = 0;
    for (let ax = Math.max(cx - reach, 0); ax <= Math.min(cx + reach, gx - 1); ax++)
      for (let ay = Math.max(cy - reach, 0); ay <= Math.min(cy + reach, gy - 1); ay++) {
        const base = (ax * gy + ay) * gz;
        const c0 = base + Math.max(cz - reach, 0), c1 = base + Math.min(cz + reach, gz - 1);
        for (let k = start[c0]; k < start[c1 + 1]; k++) {
          const j = order[k];
          const dx = pts[3 * j] - px, dy = pts[3 * j + 1] - py, dz = pts[3 * j + 2] - pz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= hi2 || d2 < lo2) continue;
          const cr = nx * dx + ny * dy + nz * dz; // receiver cosine times d
          if (cr <= 0) continue;
          const a = A[j];
          // Solid angle of a disc (A cos_e / (d^2 + A / pi)) times the receiver's cosine / pi.
          const ceD = Math.abs(nrm[3 * j] * dx + nrm[3 * j + 1] * dy + nrm[3 * j + 2] * dz); // cos_e times d
          const f = fade ? 1 - d2 / hi2 : 1;
          sum += ((a * ceD * cr) / (d2 * (d2 + a / Math.PI) * Math.PI)) * f * f;
        }
      }
    return sum;
  };
  for (let i = 0; i < n; i++) {
    occ[i] = scan(fine, positions, area, normals, i, 1, 1e-12, NEAR2, false) + scan(coarse, cPos, cArea, cNrm, i, 2, NEAR2, FAR2, true);
  }

  // One smoothing pass over the mesh edges.
  const acc = Float64Array.from(occ);
  const deg = new Float64Array(n).fill(1);
  for (let t = 0; t < triangles.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = triangles[t + e], b = triangles[t + ((e + 1) % 3)];
      acc[a] += occ[b];
      deg[a]++;
      acc[b] += occ[a];
      deg[b]++;
    }
  }
  const ao = new Float32Array(n);
  for (let i = 0; i < n; i++) ao[i] = 1 - Math.min(STRENGTH * (acc[i] / deg[i]), MAX_OCCLUSION);
  return ao;
}
