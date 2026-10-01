import type { Vec3 } from '../projection/vec';

/**
 * The connected skin surface. The GLB splits vertices along UV seams; projection math must
 * ignore those seams, so we rebuild the welded mesh from the `_VID` attribute baked by
 * tools/export_bodies.py. Everything here is plain arrays so it can move into a worker.
 */
export interface BodySurface {
  /** Welded vertex positions, 3 per vertex, meters. */
  positions: Float64Array;
  /** Welded smooth normals, 3 per vertex. */
  normals: Float64Array;
  /** Welded triangles, 3 indices per triangle (same order as the GLB index buffer). */
  triangles: Uint32Array;
  /** CSR adjacency: neighbours of v are adj[adjOffsets[v] .. adjOffsets[v+1]). */
  adjOffsets: Uint32Array;
  adj: Uint32Array;
  /** Split (GLB) vertex -> welded vertex. */
  vid: Uint32Array;
  /** Dominant skinning bone per welded vertex. */
  bone: Uint16Array;
  vertexCount: number;
}

export interface SplitMeshArrays {
  position: ArrayLike<number>;
  normal: ArrayLike<number>;
  index: ArrayLike<number>;
  vid: ArrayLike<number>;
  bone: ArrayLike<number>;
}

export function buildSurface(m: SplitMeshArrays): BodySurface {
  const splitCount = m.vid.length;
  const vid = new Uint32Array(splitCount);
  let n = 0;
  for (let i = 0; i < splitCount; i++) {
    vid[i] = Math.round(m.vid[i]);
    n = Math.max(n, vid[i] + 1);
  }
  const positions = new Float64Array(3 * n);
  const normals = new Float64Array(3 * n);
  const bone = new Uint16Array(n);
  for (let i = 0; i < splitCount; i++) {
    const w = vid[i];
    for (let k = 0; k < 3; k++) {
      positions[3 * w + k] = m.position[3 * i + k];
      normals[3 * w + k] = m.normal[3 * i + k];
    }
    bone[w] = Math.round(m.bone[i]);
  }
  const triangles = new Uint32Array(m.index.length);
  for (let i = 0; i < m.index.length; i++) triangles[i] = vid[m.index[i]];

  const sets: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t], b = triangles[t + 1], c = triangles[t + 2];
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  const adjOffsets = new Uint32Array(n + 1);
  for (let v = 0; v < n; v++) adjOffsets[v + 1] = adjOffsets[v] + sets[v].size;
  const adj = new Uint32Array(adjOffsets[n]);
  for (let v = 0; v < n; v++) {
    let o = adjOffsets[v];
    for (const w of sets[v]) adj[o++] = w;
  }
  return { positions, normals, triangles, adjOffsets, adj, vid, bone, vertexCount: n };
}

export const vertexPos = (s: BodySurface, i: number): Vec3 => [s.positions[3 * i], s.positions[3 * i + 1], s.positions[3 * i + 2]];
export const vertexNormal = (s: BodySurface, i: number): Vec3 => [s.normals[3 * i], s.normals[3 * i + 1], s.normals[3 * i + 2]];
