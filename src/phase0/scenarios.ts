import type { Mesh } from 'three';
import { jointPos } from '../body/skeleton';
import { raycastBody, type LoadedBody, type SurfaceHit } from '../body/loadBody';
import type { LimbFrame } from '../projection/cylindrical';
import { add, scale, type Vec3 } from '../projection/vec';

/** Point on the limb surface at axial distance t and angle `angle`, found by casting a ray at the axis. */
export function limbSurfacePoint(body: LoadedBody, mesh: Mesh, f: LimbFrame, t: number, angle: number): SurfaceHit | null {
  const radial: Vec3 = add(scale(f.e1, Math.cos(angle)), scale(f.e2, Math.sin(angle)));
  const onAxis = add(f.A, scale(f.d, t));
  return raycastBody(body, mesh, add(onAxis, scale(radial, 0.3)), scale(radial, -1));
}

/** Middle of the left shoulder blade, hit from behind. */
export function shoulderBladePoint(body: LoadedBody, mesh: Mesh): SurfaceHit | null {
  const sh = jointPos(body.skeleton, 'shoulder01.L');
  const sp = jointPos(body.skeleton, 'spine02');
  const x = sh[0] * 0.55;
  const y = sh[1] * 0.75 + sp[1] * 0.25;
  return raycastBody(body, mesh, [x, y, -1], [0, 0, 1]);
}
