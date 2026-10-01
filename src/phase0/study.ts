import { Mesh } from 'three';
import type { LoadedBody } from '../body/loadBody';
import { LIMBS } from '../body/skeleton';
import { buildLimbFrame, ringCircumference, type CylMode } from '../projection/cylindrical';
import { buildDecal, decalSamples } from '../projection/decal';
import { INCH, type DesignTransform } from '../projection/design';
import type { DistortionStats } from '../projection/distortion';
import { bandSeamMismatch, cylinderSamples, measureSamples, vertexCoordSamples } from '../projection/evaluate';
import { computeExpMap } from '../projection/expmap';
import { limbSurfacePoint, shoulderBladePoint } from './scenarios';

export interface StudyRow {
  body: string;
  scenario: string;
  method: string;
  stats?: DistortionStats;
  seamMismatchMm?: number;
  ms?: number;
  note?: string;
}

const patch = (wIn: number, hIn: number): DesignTransform => ({ width: wIn * INCH, height: hIn * INCH, rotation: 0, mirror: false, band: false });

/** Margin beyond the design's half-diagonal that the exponential map front must reach. */
export const expmapRadius = (tf: DesignTransform) => Math.hypot(tf.width, tf.height) / 2 + 0.01;

/**
 * Phase 0 comparison on one body: the same 1-inch checkerboard placed with each method.
 * Used by `npm run measure` (writes docs/phase0) and by the in-app "Distortion" readout.
 */
export function runStudy(body: LoadedBody): StudyRow[] {
  const mesh = new Mesh(body.geometry);
  const rows: StudyRow[] = [];
  const limb = LIMBS.find((l) => l.id === 'forearm.L')!;
  const f = buildLimbFrame(body.surface, body.skeleton, limb);
  const fJoints = buildLimbFrame(body.surface, body.skeleton, limb, { axis: 'joints' });
  const tMid = f.length / 2;

  // 1) Forearm patch, 3 x 4 in, on the front and on the outer side of the left forearm.
  const tf = patch(3, 4);
  for (const [side, angle] of [['front', 0], ['outer', Math.PI / 2]] as const) {
    const scenario = `Forearm ${side}, 3×4 in`;
    const hit = limbSurfacePoint(body, mesh, f, tMid, angle);
    if (hit) {
      const geo = buildDecal(mesh, hit.point, hit.normal, tf.width, tf.height, 0, Math.max(tf.width, tf.height));
      rows.push({ body: body.id, scenario, method: 'three.js DecalGeometry', stats: measureSamples(decalSamples(geo), tf) });
      const t0 = performance.now();
      const em = computeExpMap(body.surface, hit, [0, 1, 0], expmapRadius(tf));
      rows.push({ body: body.id, scenario, method: 'Exponential map', stats: measureSamples(vertexCoordSamples(body.surface, em.coords, tf), tf), ms: performance.now() - t0 });
    }
    for (const mode of ['naive', 'arc'] as CylMode[]) {
      const pl = { centerT: tMid, centerAngle: angle, mode };
      rows.push({ body: body.id, scenario, method: `Cylindrical, joint axis (${mode === 'arc' ? 'arc length' : 'θ·r'})`, stats: measureSamples(cylinderSamples(body.surface, fJoints, pl, tf), tf) });
      rows.push({ body: body.id, scenario, method: `Cylindrical, fitted axis (${mode === 'arc' ? 'arc length' : 'θ·r'})`, stats: measureSamples(cylinderSamples(body.surface, f, pl, tf), tf) });
    }
  }

  // 2) Full band, 1.5 in tall, centred on the front so the seam sits on the back of the forearm.
  {
    const C = ringCircumference(f, tMid);
    const H = 1.5 * INCH;
    for (const mode of ['naive', 'arc'] as CylMode[]) {
      const pl = { centerT: tMid, centerAngle: 0, mode };
      const band: DesignTransform = { width: C, height: H, rotation: 0, mirror: false, band: true };
      rows.push({
        body: body.id,
        scenario: 'Forearm full band, 1.5 in',
        method: mode === 'arc' ? 'Cylindrical (arc length) + close band' : 'Cylindrical (θ·r) + close band',
        stats: measureSamples(cylinderSamples(body.surface, f, pl, band), band, C),
        seamMismatchMm: 1000 * bandSeamMismatch(f, pl, band, tMid - H / 2, tMid + H / 2),
      });
    }
    // Same band without per-ring closing: width fixed at the centre circumference.
    const fixed: DesignTransform = { width: C, height: 3 * INCH, rotation: 0, mirror: false, band: false };
    const pl = { centerT: tMid, centerAngle: 0, mode: 'arc' as CylMode };
    rows.push({
      body: body.id,
      scenario: 'Forearm full band, 3 in, fixed width',
      method: 'Cylindrical (arc length), no closing',
      seamMismatchMm: 1000 * bandSeamMismatch(f, pl, fixed, tMid - fixed.height / 2, tMid + fixed.height / 2),
      stats: measureSamples(cylinderSamples(body.surface, f, pl, fixed), fixed),
      note: 'positive = gap at the seam where the forearm is wider than the design; negative = overlap',
    });
    rows.push({ body: body.id, scenario: 'Forearm full band, 1.5 in', method: 'three.js DecalGeometry', note: 'not possible: a box projection cannot wrap around a limb' });
  }

  // 3) Shoulder blade, 4 x 4 in.
  {
    const tfb = patch(4, 4);
    const hit = shoulderBladePoint(body, mesh);
    const scenario = 'Left shoulder blade, 4×4 in';
    if (hit) {
      const geo = buildDecal(mesh, hit.point, hit.normal, tfb.width, tfb.height, 0, Math.max(tfb.width, tfb.height));
      rows.push({ body: body.id, scenario, method: 'three.js DecalGeometry', stats: measureSamples(decalSamples(geo), tfb) });
      const t0 = performance.now();
      const em = computeExpMap(body.surface, hit, [0, 1, 0], expmapRadius(tfb));
      rows.push({ body: body.id, scenario, method: 'Exponential map', stats: measureSamples(vertexCoordSamples(body.surface, em.coords, tfb), tfb), ms: performance.now() - t0 });
    }
  }

  // 4) Exponential map speed vs design size (back of the shoulder).
  const hit = shoulderBladePoint(body, mesh);
  if (hit) {
    for (const size of [2, 4, 8, 12]) {
      const tfs = patch(size, size);
      computeExpMap(body.surface, hit, [0, 1, 0], expmapRadius(tfs)); // warm-up
      const t0 = performance.now();
      const em = computeExpMap(body.surface, hit, [0, 1, 0], expmapRadius(tfs));
      rows.push({ body: body.id, scenario: `Exp map speed, ${size}×${size} in`, method: 'Exponential map', ms: performance.now() - t0, note: `${em.reached} vertices` });
    }
  }
  return rows;
}
