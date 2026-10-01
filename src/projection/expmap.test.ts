import { describe, expect, it } from 'vitest';
import { computeExpMap } from './expmap';
import { measureSamples, vertexCoordSamples } from './evaluate';
import { INCH, type DesignTransform } from './design';
import { nearestTriangle, plane, tube } from '../test/synthetic';

const tf: DesignTransform = { width: 3 * INCH, height: 3 * INCH, rotation: 0, mirror: false, band: false };

describe('discrete exponential map', () => {
  it('reproduces exact planar coordinates on a plane', () => {
    const s = plane(0.3);
    const point: [number, number, number] = [0.0012, -0.0007, 0];
    const r = computeExpMap(s, { point, normal: [0, 0, 1], triangle: nearestTriangle(s, point) }, [0, 1, 0], 0.1);
    let worst = 0;
    for (let v = 0; v < s.vertexCount; v++) {
      if (!Number.isFinite(r.coords[2 * v])) continue;
      worst = Math.max(worst, Math.abs(r.coords[2 * v] - (s.positions[3 * v] - 0.0012)), Math.abs(r.coords[2 * v + 1] - (s.positions[3 * v + 1] + 0.0007)));
    }
    expect(r.reached).toBeGreaterThan(100);
    expect(worst).toBeLessThan(1e-9);
  });

  it('unrolls a cylinder: 1-inch cells stay 1 inch and square, not mirrored', () => {
    const s = tube(0.04, 0.04, 0.3, 128, 60);
    // Seed on the front (+z) of the tube, halfway down.
    const p: [number, number, number] = [0, -0.15, 0.04];
    const r = computeExpMap(s, { point: p, normal: [0, 0, 1], triangle: nearestTriangle(s, p) }, [0, 1, 0], 0.07);
    const st = measureSamples(vertexCoordSamples(s, r.coords, tf), tf);
    expect(st.flippedFraction).toBe(0);
    expect(st.sizeErrP95).toBeLessThan(0.03);
    expect(st.within5).toBeGreaterThan(0.95);
  });
});
