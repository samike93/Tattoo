import { describe, expect, it } from 'vitest';
import { buildLimbFrame, cylCoords, ringCircumference } from './cylindrical';
import { bandSeamMismatch, cylinderSamples, measureSamples } from './evaluate';
import { INCH, type DesignTransform } from './design';
import { tube, tubeLimb, tubeSkeleton } from '../test/synthetic';

const LEN = 0.25;
const patch: DesignTransform = { width: 3 * INCH, height: 4 * INCH, rotation: 0, mirror: false, band: false };

function ellipsePerimeter(a: number, b: number) {
  // Ramanujan II
  const h = ((a - b) / (a + b)) ** 2;
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

describe('cylindrical wrap', () => {
  const round = tube(0.035, 0.035, LEN);
  const oval = tube(0.045, 0.028, LEN);
  const sk = tubeSkeleton(LEN);

  it('measures ring circumference from the mesh', () => {
    const f = buildLimbFrame(round, sk, tubeLimb);
    // The 96-gon perimeter is 99.96% of the circle's.
    expect(ringCircumference(f, LEN / 2)).toBeCloseTo(2 * Math.PI * 0.035, 3);
    const fo = buildLimbFrame(oval, sk, tubeLimb);
    expect(ringCircumference(fo, LEN / 2) / ellipsePerimeter(0.045, 0.028)).toBeCloseTo(1, 2);
  });

  it('places the design centre on the front with y towards the proximal joint', () => {
    const f = buildLimbFrame(round, sk, tubeLimb);
    const c = cylCoords(f, [0, -0.1, 0.035], { centerT: 0.1, centerAngle: 0, mode: 'arc' });
    expect(c.x).toBeCloseTo(0, 4);
    expect(c.y).toBeCloseTo(0, 6);
    const up = cylCoords(f, [0, -0.09, 0.035], { centerT: 0.1, centerAngle: 0, mode: 'arc' });
    expect(up.y).toBeGreaterThan(0);
  });

  it('a 1-inch grid stays 1 inch and square on a round limb, and is never mirrored', () => {
    const f = buildLimbFrame(round, sk, tubeLimb);
    for (const mode of ['naive', 'arc'] as const) {
      const s = measureSamples(cylinderSamples(round, f, { centerT: LEN / 2, centerAngle: 0.4, mode }, patch), patch);
      expect(s.flippedFraction).toBe(0);
      expect(s.sizeErrP95).toBeLessThan(0.02);
      expect(s.within5).toBeGreaterThan(0.98);
    }
  });

  it('arc-length mode beats theta*r on an oval limb', () => {
    const f = buildLimbFrame(oval, sk, tubeLimb);
    const pl = { centerT: LEN / 2, centerAngle: Math.PI / 2 }; // centred on the flatter side
    const naive = measureSamples(cylinderSamples(oval, f, { ...pl, mode: 'naive' }, patch), patch);
    const arc = measureSamples(cylinderSamples(oval, f, { ...pl, mode: 'arc' }, patch), patch);
    expect(arc.sizeErrP95).toBeLessThan(0.03);
    expect(naive.sizeErrP95).toBeGreaterThan(arc.sizeErrP95 * 3);
  });

  it('a full band closes exactly (no gap or overlap at the seam)', () => {
    const f = buildLimbFrame(oval, sk, tubeLimb);
    const C = ringCircumference(f, LEN / 2);
    const band: DesignTransform = { width: C, height: 2 * INCH, rotation: 0, mirror: false, band: true };
    const pl = { centerT: LEN / 2, centerAngle: 0, mode: 'arc' as const };
    expect(Math.abs(bandSeamMismatch(f, pl, band, 0.05, 0.2))).toBeLessThan(1e-4);
    // Without band normalisation, a fixed-width design leaves a gap wherever the limb is wider.
    const fixed = { ...band, band: false };
    const thin = tube(0.03, 0.03, LEN);
    const ft = buildLimbFrame(thin, sk, tubeLimb);
    const Ct = ringCircumference(ft, LEN / 2);
    expect(bandSeamMismatch(ft, pl, { ...fixed, width: Ct * 0.9 }, 0.05, 0.2)).toBeCloseTo(Ct * 0.1, 3);
  });
});
