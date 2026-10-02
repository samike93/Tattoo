import { describe, expect, it } from 'vitest';
import { designToPhoto, fitView, photoToDesign, type PhotoDesign } from './geometry';

const base: PhotoDesign = { at: [500, 400], w: 200, h: 300, rotation: 0, curve: 0, mirror: false };

describe('photo design geometry', () => {
  it('flat: corners land where expected and round-trip', () => {
    expect(designToPhoto(base, 0, 0)).toEqual([400, 250]);
    expect(designToPhoto(base, 1, 1)).toEqual([600, 550]);
    expect(photoToDesign(base, 500, 400)).toEqual([0.5, 0.5]);
    expect(photoToDesign(base, 700, 400)).toBeNull();
  });

  it('a positive rotation turns the design counter-clockwise on screen', () => {
    const d = { ...base, rotation: Math.PI / 2 };
    // The design's right-hand middle point moves to the top.
    const [x, y] = designToPhoto(d, 1, 0.5);
    expect(x).toBeCloseTo(500, 6);
    expect(y).toBeCloseTo(300, 6);
  });

  it('curving narrows the design on screen but keeps it invertible', () => {
    const d = { ...base, curve: 0.8, rotation: 0.3 };
    const right = designToPhoto({ ...d, rotation: 0 }, 1, 0.5)[0] - 500;
    expect(right).toBeLessThan(100);
    expect(right).toBeGreaterThan(50);
    for (const [u, v] of [[0.1, 0.2], [0.5, 0.5], [0.95, 0.7]]) {
      const [px, py] = designToPhoto(d, u, v);
      const back = photoToDesign(d, px, py)!;
      expect(back[0]).toBeCloseTo(u, 6);
      expect(back[1]).toBeCloseTo(v, 6);
    }
  });

  it('fits the photo inside the stage, centred', () => {
    const v = fitView(2000, 1000, 1000, 1000);
    expect(v.scale).toBeCloseTo(0.48, 6);
    expect(v.ox + 2000 * v.scale).toBeCloseTo(1000 - v.ox, 6);
  });
});
