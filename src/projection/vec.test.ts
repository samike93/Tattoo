import { describe, expect, it } from 'vitest';
import { cross, dot, normalize, rotateMinimal, tangentFrame, wrapPeriod, wrapPi, type Vec3 } from './vec';

describe('vec', () => {
  it('rotateMinimal maps from onto to and preserves length', () => {
    const from = normalize([0.2, 0.9, 0.1]);
    const to = normalize([-0.5, 0.3, 0.8]);
    const r = rotateMinimal(from, from, to);
    expect(r[0]).toBeCloseTo(to[0], 9);
    expect(r[1]).toBeCloseTo(to[1], 9);
    expect(r[2]).toBeCloseTo(to[2], 9);
    const v: Vec3 = [0.3, -0.2, 0.7];
    expect(Math.hypot(...rotateMinimal(v, from, to))).toBeCloseTo(Math.hypot(...v), 9);
  });

  it('tangentFrame is right-handed (right x up = normal) with up near the hint', () => {
    const { e1, e2, n } = tangentFrame([0, 0, -1], [0, 1, 0]);
    const c = cross(e1, e2);
    expect(dot(c, n)).toBeCloseTo(1, 9);
    expect(e2[1]).toBeCloseTo(1, 9);
  });

  it('wraps angles and periods', () => {
    expect(wrapPi(3 * Math.PI)).toBeCloseTo(-Math.PI, 9);
    expect(wrapPi(-0.5)).toBeCloseTo(-0.5, 9);
    expect(wrapPeriod(0.7, 1)).toBeCloseTo(-0.3, 9);
    expect(wrapPeriod(-0.7, 1)).toBeCloseTo(0.3, 9);
  });
});
