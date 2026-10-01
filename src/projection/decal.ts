import { Euler, Matrix4, Mesh, Vector3, type BufferGeometry } from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { tangentFrame, type Vec3 } from './vec';
import type { TriangleSamples } from './evaluate';

/**
 * Baseline: three.js DecalGeometry (box / planar projection), oriented like the three.js decals
 * example: projector +Z along the surface normal, +Y towards world up, then rotated about the normal.
 */
export function buildDecal(mesh: Mesh, point: Vec3, normal: Vec3, width: number, height: number, rotation: number, depth: number): BufferGeometry {
  const { e1, e2, n } = tangentFrame(normal, [0, 1, 0]);
  const basis = new Matrix4().makeBasis(new Vector3(...e1), new Vector3(...e2), new Vector3(...n));
  basis.multiply(new Matrix4().makeRotationZ(rotation));
  const orientation = new Euler().setFromRotationMatrix(basis);
  mesh.updateMatrixWorld(true);
  return new DecalGeometry(mesh, new Vector3(...point), orientation, new Vector3(width, height, depth));
}

/** DecalGeometry output (non-indexed triangles with uvs) as distortion samples. */
export function decalSamples(geo: BufferGeometry): TriangleSamples {
  const p = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  return { pos: Float64Array.from(p.array as ArrayLike<number>), uv: Float64Array.from(uv.array as ArrayLike<number>) };
}
