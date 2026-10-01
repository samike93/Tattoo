import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { anchorWeights, cornerWeights } from './shape';
import { parseBodyGlb, prepareBody } from './loadBody';
import type { Skeleton } from './skeleton';
import { jointPos, LIMBS } from './skeleton';
import { buildLimbFrame, ringCircumference } from '../projection/cylindrical';

const root = resolve(import.meta.dirname, '../..');
async function load(id: 'male' | 'female') {
  const buf = readFileSync(resolve(root, `public/models/${id}.glb`));
  const sk = JSON.parse(readFileSync(resolve(root, `public/models/${id}.skeleton.json`), 'utf8')) as Skeleton;
  return parseBodyGlb(id, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, sk);
}

describe('body shape', () => {
  it('anchor and corner weights are a partition of unity', () => {
    expect(anchorWeights(0.25, [0, 0.5, 1])).toEqual([[0, 0.5], [1, 0.5]]);
    const w = cornerWeights({ height: [0, 1], weight: [0, 0.5, 1], muscle: [0, 0.5, 1] }, 0.3, 0.8, 0.1);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(w.length).toBe(18);
  });

  it('reproduces the exported base shape at the base phenotype', async () => {
    const raw = await load('male');
    const b = prepareBody(raw, {});
    const p0 = raw.geometry.getAttribute('position').array;
    const p1 = b.geometry.getAttribute('position').array;
    let worst = 0;
    for (let i = 0; i < p0.length; i++) worst = Math.max(worst, Math.abs(p0[i] - p1[i]));
    expect(worst).toBeLessThan(1e-5);
    expect(b.scale).toBe(1);
  });

  it('hits the client height exactly with the height phenotype (no scaling) in range', async () => {
    for (const id of ['male', 'female'] as const) {
      const raw = await load(id);
      for (const heightM of [1.55, 1.7, 1.85, 2.0]) {
        const b = prepareBody(raw, { heightM, weight: 0.8, muscle: 0.2 });
        const pos = b.geometry.getAttribute('position').array;
        let top = -Infinity, bottom = Infinity;
        for (let i = 1; i < pos.length; i += 3) {
          top = Math.max(top, pos[i]);
          bottom = Math.min(bottom, pos[i]);
        }
        expect(bottom).toBeCloseTo(0, 6);
        expect(top).toBeCloseTo(heightM, 4);
        expect(b.scale).toBe(1);
      }
    }
  });

  it('heavier bodies have thicker forearms, and joints move with height', async () => {
    const raw = await load('female');
    const measure = (weight: number) => {
      const b = prepareBody(raw, { heightM: 1.65, weight, muscle: 0.5 });
      const f = buildLimbFrame(b.surface, b.skeleton, LIMBS.find((l) => l.id === 'forearm.L')!);
      return { C: ringCircumference(f, f.length / 2) };
    };
    const slim = measure(0), avg = measure(0.5), heavy = measure(1);
    expect(avg.C).toBeGreaterThan(slim.C);
    expect(heavy.C).toBeGreaterThan(avg.C * 1.05);
    // Joints follow the shape: a taller client has a higher shoulder.
    const shoulderY = (heightM: number) => jointPos(prepareBody(raw, { heightM, weight: 0.5, muscle: 0.5 }).skeleton, 'upperarm01.L')[1];
    expect(shoulderY(1.8) - shoulderY(1.6)).toBeGreaterThan(0.15);
  });
});
