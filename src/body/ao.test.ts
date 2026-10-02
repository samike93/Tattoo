import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { vertexAO } from './ao';
import { parseBodyGlb, prepareBody } from './loadBody';
import { jointPos, type Skeleton } from './skeleton';
import type { Vec3 } from '../projection/vec';

const root = resolve(import.meta.dirname, '../..');

describe('ambient occlusion', () => {
  it('darkens creases, leaves open skin bright, and is quick', async () => {
    const buf = readFileSync(resolve(root, 'public/models/female.glb'));
    const sk = JSON.parse(readFileSync(resolve(root, 'public/models/female.skeleton.json'), 'utf8')) as Skeleton;
    const raw = await parseBodyGlb('female', buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, sk);
    const body = prepareBody(raw, {});
    const s = body.surface;
    const t0 = performance.now();
    const ao = vertexAO(s.positions, s.normals, s.triangles, s.vertexCount);
    const ms = performance.now() - t0;
    // Nearest surface vertex to a point.
    const at = (p: Vec3) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < s.vertexCount; i++) {
        const d = (s.positions[3 * i] - p[0]) ** 2 + (s.positions[3 * i + 1] - p[1]) ** 2 + (s.positions[3 * i + 2] - p[2]) ** 2;
        if (d < bd) [best, bd] = [i, d];
      }
      return ao[best];
    };
    const j = (n: string) => jointPos(body.skeleton, n);
    const hipL = j('upperleg01.L'), hipR = j('upperleg01.R'), chest = j('spine03'), shoulder = j('upperarm01.L');
    const crotch = at([(hipL[0] + hipR[0]) / 2, hipL[1] - 0.06, hipL[2]]);
    const armpit = at([shoulder[0] - 0.02, shoulder[1] - 0.09, shoulder[2]]);
    const upperBack = at([chest[0], chest[1] + 0.05, chest[2] - 0.2]);
    const shin = at([j('lowerleg02.L')[0], j('lowerleg02.L')[1], j('lowerleg02.L')[2] + 0.1]);
    console.log(`AO ${ms.toFixed(0)} ms; crotch ${crotch.toFixed(2)}, armpit ${armpit.toFixed(2)}, upper back ${upperBack.toFixed(2)}, shin ${shin.toFixed(2)}`);
    expect(upperBack).toBeGreaterThan(0.9);
    expect(shin).toBeGreaterThan(0.9);
    expect(crotch).toBeLessThan(0.7);
    expect(armpit).toBeLessThan(0.7);
    expect(ms).toBeLessThan(1500); // generous for CI; typically far less
  });
});
