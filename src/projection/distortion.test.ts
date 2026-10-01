import { describe, expect, it } from 'vitest';
import { measureDistortion, singularValues2 } from './distortion';

// One square of skin, 1 x 1 inch in the XY plane facing +Z, split into two triangles.
const I = 0.0254;
const pos = [0, 0, 0, I, 0, 0, I, I, 0, 0, 0, 0, I, I, 0, 0, I, 0];

describe('distortion metric', () => {
  it('singular values of a known matrix', () => {
    const [a, b] = singularValues2([3, 0, 0, 2]);
    expect(a).toBeCloseTo(3);
    expect(b).toBeCloseTo(2);
  });

  it('a perfect placement has zero error', () => {
    const uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
    const s = measureDistortion(pos, uv, I, I);
    expect(s.sizeErrMax).toBeCloseTo(0, 9);
    expect(s.anisoMean).toBeCloseTo(0, 9);
    expect(s.within5).toBe(1);
    expect(s.flippedFraction).toBe(0);
  });

  it('detects stretch, anisotropy and mirroring', () => {
    // Design is 1 inch wide but covers 1.2 inches of skin horizontally.
    const uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
    const s = measureDistortion(pos, uv, I / 1.2, I);
    expect(s.sizeErrMax).toBeCloseTo(0.2, 6);
    expect(s.anisoMean).toBeCloseTo(0.2, 6);
    const mirrored = [1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1];
    expect(measureDistortion(pos, mirrored, I, I).flippedFraction).toBe(1);
  });
});
