/// <reference lib="webworker" />
import type { BodySurface } from '../body/surface';
import { computeExpMap, type ExpMapSeed } from './expmap';
import type { Vec3 } from './vec';

export type ExpMapWorkerMessage =
  | { type: 'surface'; key: string; surface: BodySurface }
  | { type: 'compute'; id: number; key: string; seed: ExpMapSeed; up: Vec3; radius: number };

const surfaces = new Map<string, BodySurface>();

self.onmessage = (e: MessageEvent<ExpMapWorkerMessage>) => {
  const m = e.data;
  const post = (self as unknown as DedicatedWorkerGlobalScope).postMessage.bind(self);
  if (m.type === 'surface') {
    surfaces.clear(); // one body at a time
    surfaces.set(m.key, m.surface);
    return;
  }
  const s = surfaces.get(m.key);
  if (!s) {
    post({ id: m.id, error: `unknown surface ${m.key}` });
    return;
  }
  try {
    const r = computeExpMap(s, m.seed, m.up, m.radius);
    post({ id: m.id, result: r }, [r.coords.buffer]);
  } catch (err) {
    post({ id: m.id, error: String(err) });
  }
};
