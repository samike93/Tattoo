import type { LoadedBody, SurfaceHit } from '../body/loadBody';
import { LIMBS, type LimbDef } from '../body/skeleton';
import { cylCoords, ringCircumference, type LimbFrame } from '../projection/cylindrical';

/**
 * Phase 0 finding: the exponential map is the best method for patches anywhere, including limbs;
 * the cylinder is needed only when a design wraps far around a limb (it cannot fold) or must close
 * into a band. Past ~45% of the circumference the exponential map's front starts to fold.
 */
export const WRAP_THRESHOLD = 0.45;

export type ResolvedMethod = 'expmap' | 'cylinder' | 'decal';

/** The limb the hit triangle belongs to (by dominant bone), if any. */
export function limbAt(body: LoadedBody, hit: SurfaceHit): LimbDef | null {
  const votes = new Map<LimbDef, number>();
  for (const v of hit.triangle) {
    const name = body.skeleton.bones[body.surface.bone[v]]?.name;
    const limb = LIMBS.find((l) => l.bones.includes(name));
    if (limb) votes.set(limb, (votes.get(limb) ?? 0) + 1);
  }
  let best: LimbDef | null = null, n = 0;
  for (const [l, c] of votes) if (c > n) [best, n] = [l, c];
  return n >= 2 ? best : null;
}

export interface AutoChoice {
  method: 'expmap' | 'cylinder';
  limb: LimbDef | null;
  /** For the cylinder: where the hit sits on the limb. */
  centerT?: number;
  centerAngle?: number;
  circumference?: number;
}

/** Pick the method for a design of `width` meters centred at `hit`. */
export function chooseMethod(body: LoadedBody, hit: SurfaceHit, width: number, band: boolean, frameFor: (id: string) => LimbFrame): AutoChoice {
  const limb = limbAt(body, hit);
  if (!limb) return { method: 'expmap', limb: null };
  const f = frameFor(limb.id);
  const c = cylCoords(f, hit.point, { centerT: 0, centerAngle: 0, mode: 'arc' });
  const centerT = Math.min(Math.max(c.t, 0), f.length);
  const circumference = ringCircumference(f, centerT);
  const wraps = band || width > WRAP_THRESHOLD * circumference;
  return { method: wraps ? 'cylinder' : 'expmap', limb, centerT, centerAngle: c.theta, circumference };
}
