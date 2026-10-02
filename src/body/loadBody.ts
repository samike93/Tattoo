import { BufferAttribute, BufferGeometry, LinearFilter, LinearMipmapLinearFilter, Mesh, NoColorSpace, Raycaster, Texture, TextureLoader, Triangle, Vector3, type Intersection } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildSurface, weldedNormals, type BodySurface } from './surface';
import { scaleSkeleton, type BodyId, type Skeleton } from './skeleton';
import { applyShape, type ShapeParams } from './shape';
import { vertexAO } from './ao';
import { normalize, type Vec3 } from '../projection/vec';

export interface LoadedBody {
  id: BodyId;
  geometry: BufferGeometry;
  surface: BodySurface;
  skeleton: Skeleton;
  /** Height of the model as exported, meters. */
  nativeHeight: number;
  /** Uniform scale applied on top of the body shape (1 unless the client is outside Anny's range). */
  scale: number;
  /** Anny height phenotype used (0..1), when the GLB carries shape morphs. */
  heightPhenotype?: number;
  /** Regional skin colour and eyebrows (UV space); null if the file is missing. */
  regions: Texture | null;
  /** Time spent computing ambient occlusion, ms. */
  aoMs: number;
}

export interface RawBody {
  id: BodyId;
  geometry: BufferGeometry;
  skeleton: Skeleton;
  regions: Texture | null;
}

export async function parseBodyGlb(id: BodyId, glb: ArrayBuffer, skeleton: Skeleton, regions: Texture | null = null): Promise<RawBody> {
  const gltf = await new GLTFLoader().parseAsync(glb, '');
  let geometry: BufferGeometry | undefined;
  gltf.scene.traverse((o) => {
    if ((o as Mesh).isMesh && !geometry) geometry = (o as Mesh).geometry as BufferGeometry;
  });
  if (!geometry) throw new Error(`No mesh in ${id}.glb`);
  for (const name of ['position', 'normal', 'uv', '_vid', '_bone']) {
    if (!geometry.getAttribute(name)) throw new Error(`${id}.glb is missing the ${name} attribute; re-run tools/export_bodies.py`);
  }
  // Older exports have no eye / region data: plain skin everywhere.
  const count = geometry.getAttribute('position').count;
  if (!geometry.getAttribute('_eye')) geometry.setAttribute('_eye', new BufferAttribute(new Float32Array(3 * count), 3));
  if (!geometry.getAttribute('_region')) geometry.setAttribute('_region', new BufferAttribute(new Float32Array(4 * count), 4));
  return { id, geometry, skeleton, regions };
}

export async function fetchRawBody(id: BodyId, baseUrl: string): Promise<RawBody> {
  // VITE_MODELS_AS_TEXT=1 builds load base64 copies (models/<id>.glb.txt) for hosts that refuse
  // to serve .glb files; scripts/strict-host.mjs writes them.
  const asText = import.meta.env.VITE_MODELS_AS_TEXT === '1';
  const [glb, sk, regions] = await Promise.all([
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
    loadRegions(`${baseUrl}models/${id}.regions.png`),
  ]);
  return parseBodyGlb(id, glb, sk, regions);
}

/** The region texture is optional: without it the body is one even skin colour. */
async function loadRegions(url: string): Promise<Texture | null> {
  try {
    const tex = await new TextureLoader().loadAsync(url);
    tex.flipY = false; // glTF UV convention, like the GLB
    tex.colorSpace = NoColorSpace; // data (masks), not colour
    tex.minFilter = LinearMipmapLinearFilter;
    tex.magFilter = LinearFilter;
    tex.needsUpdate = true;
    return tex;
  } catch {
    return null;
  }
}

/**
 * Shape the raw body for the client (height, weight, muscle) and build the welded surface.
 * With shape morphs (current GLBs) the shape is exact Anny; older GLBs fall back to uniform scaling.
 */
export function prepareBody(raw: RawBody, shape: Partial<ShapeParams> = {}, opts: { ao?: Float32Array } = {}): LoadedBody {
  const nativeHeight = raw.skeleton.height_m;
  const geometry = raw.geometry.clone();
  const morphs = raw.geometry.morphAttributes.position ?? [];
  geometry.morphAttributes = {};
  let skeleton: Skeleton;
  let scale = 1;
  let heightPhenotype: number | undefined;
  if (raw.skeleton.shapes && morphs.length >= raw.skeleton.shapes.corners.length) {
    const r = applyShape(
      raw.geometry.getAttribute('position').array as ArrayLike<number>,
      morphs.map((m) => m.array as ArrayLike<number>),
      raw.skeleton,
      raw.skeleton.shapes,
      { heightM: shape.heightM, weight: shape.weight ?? 0.5, muscle: shape.muscle ?? 0.5, local: shape.local },
    );
    geometry.setAttribute('position', new BufferAttribute(r.positions, 3));
    skeleton = r.skeleton;
    scale = r.scale;
    heightPhenotype = r.heightPhenotype;
  } else {
    const k = shape.heightM && shape.heightM > 0.5 ? shape.heightM / nativeHeight : 1;
    if (k !== 1) geometry.scale(k, k, k);
    skeleton = scaleSkeleton(raw.skeleton, k);
    scale = k;
  }
  const surface = buildSurface({
    position: geometry.getAttribute('position').array as ArrayLike<number>,
    normal: geometry.getAttribute('normal').array as ArrayLike<number>,
    index: geometry.getIndex()!.array as ArrayLike<number>,
    vid: geometry.getAttribute('_vid').array as ArrayLike<number>,
    bone: geometry.getAttribute('_bone').array as ArrayLike<number>,
  });
  // The shape changed, so recompute smooth normals on the welded mesh and copy them to split vertices.
  surface.normals = weldedNormals(surface.positions, surface.triangles, surface.vertexCount);
  const split = new Float32Array(3 * surface.vid.length);
  for (let i = 0; i < surface.vid.length; i++) split.set(surface.normals.subarray(3 * surface.vid[i], 3 * surface.vid[i] + 3), 3 * i);
  geometry.setAttribute('normal', new BufferAttribute(split, 3));
  // Ambient occlusion (creases, armpits, under the bust, between the legs). Callers that reshape
  // interactively pass the previous shape's AO (same mesh) and refine it in a worker (aoClient.ts).
  const t0 = performance.now();
  const reuse = opts.ao && opts.ao.length === surface.vertexCount;
  const aoWelded = reuse ? opts.ao! : vertexAO(surface.positions, surface.normals, surface.triangles, surface.vertexCount);
  setVertexAO(geometry, surface, aoWelded);
  const aoMs = reuse ? 0 : performance.now() - t0;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  // Per-vertex ink attributes, written by the placement code.
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('inkCoord', new BufferAttribute(new Float32Array(2 * count), 2));
  geometry.setAttribute('inkMask', new BufferAttribute(new Float32Array(count), 1));
  return { id: raw.id, geometry, surface, skeleton, nativeHeight, scale, heightPhenotype, regions: raw.regions, aoMs };
}

/** Write welded per-vertex AO into the geometry's split-vertex `ao` attribute. */
export function setVertexAO(geometry: BufferGeometry, surface: BodySurface, aoWelded: Float32Array) {
  const n = surface.vid.length;
  let attr = geometry.getAttribute('ao') as BufferAttribute | undefined;
  if (!attr || attr.count !== n) {
    attr = new BufferAttribute(new Float32Array(n), 1);
    geometry.setAttribute('ao', attr);
  }
  const a = attr.array as Float32Array;
  for (let i = 0; i < n; i++) a[i] = aoWelded[surface.vid[i]];
  attr.needsUpdate = true;
}

export interface SurfaceHit {
  point: Vec3;
  normal: Vec3;
  /** Welded vertex ids of the hit triangle. */
  triangle: [number, number, number];
  /** Barycentric coordinates of the point in that triangle. */
  bary?: [number, number, number];
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
    bary: [bary.x, bary.y, bary.z],
  };
}

export function raycastBody(body: LoadedBody, mesh: Mesh, origin: Vec3, dir: Vec3): SurfaceHit | null {
  const rc = new Raycaster(new Vector3(...origin), new Vector3(...normalize(dir)));
  const hits = rc.intersectObject(mesh, false);
  return hits.length ? hitFromIntersection(body, hits[0]) : null;
}
