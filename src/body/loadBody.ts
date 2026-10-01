import { BufferAttribute, BufferGeometry, Mesh, Raycaster, Triangle, Vector3, type Intersection } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildSurface, type BodySurface } from './surface';
import { scaleSkeleton, type BodyId, type Skeleton } from './skeleton';
import { normalize, type Vec3 } from '../projection/vec';

export interface LoadedBody {
  id: BodyId;
  geometry: BufferGeometry;
  surface: BodySurface;
  skeleton: Skeleton;
  /** Height of the model as exported, meters. */
  nativeHeight: number;
  /** Uniform scale applied to reach the requested client height. */
  scale: number;
}

export interface RawBody {
  id: BodyId;
  geometry: BufferGeometry;
  skeleton: Skeleton;
}

export async function parseBodyGlb(id: BodyId, glb: ArrayBuffer, skeleton: Skeleton): Promise<RawBody> {
  const gltf = await new GLTFLoader().parseAsync(glb, '');
  let geometry: BufferGeometry | undefined;
  gltf.scene.traverse((o) => {
    if ((o as Mesh).isMesh && !geometry) geometry = (o as Mesh).geometry as BufferGeometry;
  });
  if (!geometry) throw new Error(`No mesh in ${id}.glb`);
  for (const name of ['position', 'normal', 'uv', '_vid', '_bone']) {
    if (!geometry.getAttribute(name)) throw new Error(`${id}.glb is missing the ${name} attribute; re-run tools/export_bodies.py`);
  }
  return { id, geometry, skeleton };
}

export async function fetchRawBody(id: BodyId, baseUrl: string): Promise<RawBody> {
  // VITE_MODELS_AS_TEXT=1 builds load base64 copies (models/<id>.glb.txt) for hosts that refuse
  // to serve .glb files; scripts/models-as-text.mjs writes them.
  const asText = import.meta.env.VITE_MODELS_AS_TEXT === '1';
  const [glb, sk] = await Promise.all([
    fetch(`${baseUrl}models/${id}.glb${asText ? '.txt' : ''}`).then(async (r) => {
      if (!r.ok) throw new Error(`Could not load ${id}.glb (HTTP ${r.status})`);
      if (!asText) return r.arrayBuffer();
      const bin = atob((await r.text()).trim());
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    }),
    fetch(`${baseUrl}models/${id}.skeleton.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${id}.skeleton.json (HTTP ${r.status})`);
      return r.json() as Promise<Skeleton>;
    }),
  ]);
  return parseBodyGlb(id, glb, sk);
}

/** Scale the raw body to the client's height (uniform scale for now) and build the welded surface. */
export function prepareBody(raw: RawBody, heightM?: number): LoadedBody {
  const nativeHeight = raw.skeleton.height_m;
  const k = heightM && heightM > 0.5 ? heightM / nativeHeight : 1;
  const geometry = raw.geometry.clone();
  if (k !== 1) geometry.scale(k, k, k);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const surface = buildSurface({
    position: geometry.getAttribute('position').array as ArrayLike<number>,
    normal: geometry.getAttribute('normal').array as ArrayLike<number>,
    index: geometry.getIndex()!.array as ArrayLike<number>,
    vid: geometry.getAttribute('_vid').array as ArrayLike<number>,
    bone: geometry.getAttribute('_bone').array as ArrayLike<number>,
  });
  // Per-vertex ink attributes, written by the placement code.
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('inkCoord', new BufferAttribute(new Float32Array(2 * count), 2));
  geometry.setAttribute('inkMask', new BufferAttribute(new Float32Array(count), 1));
  return { id: raw.id, geometry, surface, skeleton: scaleSkeleton(raw.skeleton, k), nativeHeight, scale: k };
}

export interface SurfaceHit {
  point: Vec3;
  normal: Vec3;
  /** Welded vertex ids of the hit triangle. */
  triangle: [number, number, number];
}

/** Convert a three.js mesh intersection into a surface hit with a smooth (interpolated) normal. */
export function hitFromIntersection(body: LoadedBody, hit: Intersection): SurfaceHit | null {
  if (!hit.face) return null;
  const { a, b, c } = hit.face;
  const pos = body.geometry.getAttribute('position');
  const nrm = body.geometry.getAttribute('normal');
  const va = new Vector3().fromBufferAttribute(pos, a);
  const vb = new Vector3().fromBufferAttribute(pos, b);
  const vc = new Vector3().fromBufferAttribute(pos, c);
  const bary = Triangle.getBarycoord(hit.point, va, vb, vc, new Vector3());
  if (!bary) return null;
  const n = new Vector3()
    .addScaledVector(new Vector3().fromBufferAttribute(nrm, a), bary.x)
    .addScaledVector(new Vector3().fromBufferAttribute(nrm, b), bary.y)
    .addScaledVector(new Vector3().fromBufferAttribute(nrm, c), bary.z);
  const vid = body.surface.vid;
  return {
    point: [hit.point.x, hit.point.y, hit.point.z],
    normal: normalize([n.x, n.y, n.z]),
    triangle: [vid[a], vid[b], vid[c]],
  };
}

export function raycastBody(body: LoadedBody, mesh: Mesh, origin: Vec3, dir: Vec3): SurfaceHit | null {
  const rc = new Raycaster(new Vector3(...origin), new Vector3(...normalize(dir)));
  const hits = rc.intersectObject(mesh, false);
  return hits.length ? hitFromIntersection(body, hits[0]) : null;
}
