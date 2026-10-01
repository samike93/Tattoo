import { describe, expect, it } from 'vitest';
import { locateUV } from './box';
import { plane } from '../test/synthetic';

describe('selection box', () => {
  it('finds skin points for design corners from per-vertex design coordinates', () => {
    const s = plane(0.2, 20);
    // Design covers x in [-0.05, 0.05], y in [-0.03, 0.03] on the plane.
    const uv = new Float64Array(2 * s.vertexCount);
    for (let v = 0; v < s.vertexCount; v++) {
      uv[2 * v] = (s.positions[3 * v] + 0.05) / 0.1;
      uv[2 * v + 1] = (s.positions[3 * v + 1] + 0.03) / 0.06;
    }
    const [ne, center] = locateUV([[1, 1], [0.5, 0.5]], uv, s.positions, s.normals, s.triangles);
    expect(ne!.point[0]).toBeCloseTo(0.05, 6);
    expect(ne!.point[1]).toBeCloseTo(0.03, 6);
    expect(center!.point[0]).toBeCloseTo(0, 6);
    expect(ne!.normal[2]).toBeCloseTo(1, 6);
  });
});
