import type { BodySurface } from '../body/surface';
import { cross, dot, length, normalize, read3, reject, rotateMinimal, scale, sub, tangentFrame, type Vec3 } from './vec';

/**
 * Discrete Exponential Map (DEM) decal parameterisation.
 * Schmidt, Grimm, Wyvill, "Interactive Decal Compositing with Discrete Exponential Maps", SIGGRAPH 2006.
 *
 * Builds geodesic normal coordinates u(q) in the tangent plane of the seed point by a Dijkstra-style
 * front propagation where the priority is |u(q)| itself:
 *   - each vertex r carries a tangent frame, transported from its upwind parent by the minimal
 *     rotation between their normals (approximate parallel transport);
 *   - the step from r to a neighbour q is (q - r) projected into r's tangent plane, rescaled to |q - r|,
 *     and expressed in r's frame;
 *   - "upwind averaging": u(q) is the weighted mean of u(r) + step(r -> q) over all already-finalised
 *     neighbours r, with weights 1 / |q - r|^2.
 * O(N log N) in the number of vertices inside the radius, which is small for a tattoo-sized patch.
 *
 * Output coordinates are in meters: x = design right, y = design up, with right x up = outward normal,
 * so designs are never mirrored.
 */
export interface ExpMapSeed {
  point: Vec3;
  normal: Vec3;
  /** The three welded vertices of the triangle containing `point`. */
  triangle: [number, number, number];
}

export interface ExpMapResult {
  /** 2 floats per welded vertex; NaN where the front did not reach (outside maxRadius). */
  coords: Float64Array;
  reached: number;
  ms: number;
  frame: { e1: Vec3; e2: Vec3; n: Vec3 };
}

class MinHeap {
  keys: number[] = [];
  vals: number[] = [];
  get size() {
    return this.keys.length;
  }
  push(k: number, v: number) {
    const { keys, vals } = this;
    let i = keys.length;
    keys.push(k);
    vals.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= k) break;
      keys[i] = keys[p];
      vals[i] = vals[p];
      i = p;
    }
    keys[i] = k;
    vals[i] = v;
  }
  pop(): number {
    const { keys, vals } = this;
    const top = vals[0];
    const k = keys.pop()!;
    const v = vals.pop()!;
    if (keys.length > 0) {
      let i = 0;
      const n = keys.length;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const c = l + 1 < n && keys[l + 1] < keys[l] ? l + 1 : l;
        if (keys[c] >= k) break;
        keys[i] = keys[c];
        vals[i] = vals[c];
        i = c;
      }
      keys[i] = k;
      vals[i] = v;
    }
    return top;
  }
}

export function computeExpMap(s: BodySurface, seed: ExpMapSeed, upHint: Vec3, maxRadius: number): ExpMapResult {
  const t0 = performance.now();
  const n = s.vertexCount;
  const coords = new Float64Array(2 * n).fill(NaN);
  const done = new Uint8Array(n);
  const frames = new Float64Array(9 * n); // e1, e2, normal per vertex (valid once queued)
  const best = new Float64Array(n).fill(Infinity);
  const heap = new MinHeap();

  const frame0 = tangentFrame(seed.normal, upHint);
  const setFrame = (v: number, e1: Vec3, e2: Vec3, nn: Vec3) => {
    frames.set(e1, 9 * v);
    frames.set(e2, 9 * v + 3);
    frames.set(nn, 9 * v + 6);
  };
  const frameOf = (v: number) => ({ e1: read3(frames, 3 * v), e2: read3(frames, 3 * v + 1), n: read3(frames, 3 * v + 2) });
  const transport = (from: { e1: Vec3; e2: Vec3; n: Vec3 }, toNormal: Vec3) => {
    const nn = normalize(toNormal);
    // Rotate the frame, then re-orthonormalise against the new normal to stop drift.
    const e2 = normalize(reject(rotateMinimal(from.e2, from.n, nn), nn));
    const e1 = cross(e2, nn);
    return { e1, e2, n: nn };
  };

  // Seed with the vertices of the hit triangle, measured in the seed's tangent plane.
  for (const v of seed.triangle) {
    const p = read3(s.positions, v);
    const off = sub(p, seed.point);
    const tan = reject(off, frame0.n);
    const L = length(tan);
    const step = L > 1e-12 ? scale(tan, length(off) / L) : tan;
    const u0 = dot(step, frame0.e1), u1 = dot(step, frame0.e2);
    const k = Math.hypot(u0, u1);
    if (k < best[v]) {
      best[v] = k;
      coords[2 * v] = u0;
      coords[2 * v + 1] = u1;
      const f = transport(frame0, read3(s.normals, v));
      setFrame(v, f.e1, f.e2, f.n);
      heap.push(k, v);
    }
  }

  let reached = 0;
  while (heap.size > 0) {
    const r = heap.pop();
    if (done[r]) continue;
    done[r] = 1;
    reached++;
    if (best[r] > maxRadius) continue; // finalise but do not expand past the radius
    const fr = frameOf(r);
    for (let o = s.adjOffsets[r]; o < s.adjOffsets[r + 1]; o++) {
      const q = s.adj[o];
      if (done[q]) continue;
      const pq = read3(s.positions, q);
      // Upwind average over every finalised neighbour of q.
      let sx = 0, sy = 0, sw = 0;
      for (let o2 = s.adjOffsets[q]; o2 < s.adjOffsets[q + 1]; o2++) {
        const w = s.adj[o2];
        if (!done[w]) continue;
        const pw = read3(s.positions, w);
        const fw = frameOf(w);
        const off = sub(pq, pw);
        const dist2 = dot(off, off);
        const tan = reject(off, fw.n);
        const L = length(tan);
        const step = L > 1e-12 ? scale(tan, Math.sqrt(dist2) / L) : tan;
        const weight = 1 / Math.max(dist2, 1e-12);
        sx += weight * (coords[2 * w] + dot(step, fw.e1));
        sy += weight * (coords[2 * w + 1] + dot(step, fw.e2));
        sw += weight;
      }
      const ux = sx / sw, uy = sy / sw;
      const k = Math.hypot(ux, uy);
      if (k < best[q]) {
        best[q] = k;
        coords[2 * q] = ux;
        coords[2 * q + 1] = uy;
        const f = transport(fr, read3(s.normals, q));
        setFrame(q, f.e1, f.e2, f.n);
        heap.push(k, q);
      }
    }
  }
  return { coords, reached, ms: performance.now() - t0, frame: frame0 };
}
