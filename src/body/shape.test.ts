import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { anchorWeights, cornerWeights, localRange } from './shape';
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

describe('local body-shape controls', () => {
  /** Smallest horizontal gap between left and right inner thighs, around mid-thigh. */
  async function thighGap(local: Record<string, number>, weight = 0.5) {
    const raw = await load('female');
    const b = prepareBody(raw, { heightM: 1.65, weight, muscle: 0.5, local });
    const hip = jointPos(b.skeleton, 'upperleg01.L'), knee = jointPos(b.skeleton, 'lowerleg01.L');
    // Mid-thigh, 55% of the way from knee to hip.
    const y0 = knee[1] + 0.5 * (hip[1] - knee[1]), y1 = knee[1] + 0.6 * (hip[1] - knee[1]);
    const L = LIMBS.find((l) => l.id === 'thigh.L')!.bones.map((n) => b.skeleton.bones.findIndex((x) => x.name === n));
    const R = LIMBS.find((l) => l.id === 'thigh.R')!.bones.map((n) => b.skeleton.bones.findIndex((x) => x.name === n));
    const s = b.surface;
    let minLeftX = Infinity, maxRightX = -Infinity;
    for (let v = 0; v < s.vertexCount; v++) {
      const y = s.positions[3 * v + 1];
      if (y < y0 || y > y1) continue;
      if (L.includes(s.bone[v])) minLeftX = Math.min(minLeftX, s.positions[3 * v]);
      if (R.includes(s.bone[v])) maxRightX = Math.max(maxRightX, s.positions[3 * v]);
    }
    return { gap: minLeftX - maxRightX, body: b };
  }

  it('all controls at 0 give exactly the base shape', async () => {
    const raw = await load('female');
    const a = prepareBody(raw, {}).geometry.getAttribute('position').array;
    const zero = prepareBody(raw, { local: { belly: 0, thighs: 0, bust: 0 } }).geometry.getAttribute('position').array;
    let worst = 0;
    for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - zero[i]));
    expect(worst).toBe(0);
  });

  it('belly +1 pushes the stomach forward by several centimetres and keeps the height exact', async () => {
    const raw = await load('female');
    const zmax = (local: Record<string, number>) => {
      const b = prepareBody(raw, { heightM: 1.65, weight: 0.5, muscle: 0.5, local });
      const pos = b.surface.positions;
      const navelY = jointPos(b.skeleton, 'spine04')[1];
      let z = -Infinity, top = -Infinity, bottom = Infinity;
      for (let v = 0; v < b.surface.vertexCount; v++) {
        top = Math.max(top, pos[3 * v + 1]);
        bottom = Math.min(bottom, pos[3 * v + 1]);
        if (Math.abs(pos[3 * v + 1] - navelY) < 0.05 && Math.abs(pos[3 * v]) < 0.08) z = Math.max(z, pos[3 * v + 2]);
      }
      return { z, height: top - bottom };
    };
    const flat = zmax({}), round = zmax({ belly: 1 });
    expect(round.z - flat.z).toBeGreaterThan(0.04);
    expect(round.height).toBeCloseTo(1.65, 4);
  });

  it('thigh gap opens with the control and thighs never pass through each other', async () => {
    const neutral = await thighGap({});
    const open = await thighGap({ thighGap: 1 });
    const closed = await thighGap({ thighGap: -1 });
    const worst = await thighGap({ thighGap: localRange('thighGap')[0], thighs: 1, hips: 1 }, 1);
    console.log(`thigh gap: neutral ${(neutral.gap * 100).toFixed(1)} cm, open ${(open.gap * 100).toFixed(1)} cm, closed ${(closed.gap * 100).toFixed(1)} cm, heaviest closed ${(worst.gap * 100).toFixed(1)} cm`);
    expect(open.gap).toBeGreaterThan(neutral.gap + 0.015);
    expect(closed.gap).toBeLessThan(neutral.gap);
    expect(worst.gap).toBeGreaterThan(-0.005); // touching is fine, overlapping by more than 5 mm is not
  });
});
