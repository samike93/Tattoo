import type { BodySurface } from '../body/surface';
import { computeExpMap, type ExpMapResult, type ExpMapSeed } from './expmap';
import type { Vec3 } from './vec';

/**
 * Exponential map in a Web Worker (spec: no main-thread work over 50 ms while interacting; a
 * 12 x 12 in back piece takes ~20 ms on a laptop and more on an iPad). The body surface is sent once;
 * each request sends only the seed. Only the latest request resolves, so dragging never queues up.
 * Falls back to the main thread if workers are unavailable.
 */
let worker: Worker | null | undefined;
let currentKey = '';
let fallbackSurface: BodySurface | null = null;
let nextId = 1;
let latest = 0;
const pending = new Map<number, { resolve: (r: ExpMapResult | null) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./expmap.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; result?: ExpMapResult; error?: string }>) => {
      const p = pending.get(e.data.id);
      pending.delete(e.data.id);
      if (!p) return;
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(e.data.id === latest ? e.data.result! : null);
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || 'Exponential map worker failed'));
      pending.clear();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Tell the worker which body to use. Cheap to call repeatedly with the same key. */
export function setExpMapSurface(key: string, surface: BodySurface) {
  fallbackSurface = surface;
  if (key === currentKey) return;
  currentKey = key;
  getWorker()?.postMessage({ type: 'surface', key, surface });
}

/** Resolves with the map, or null if a newer request superseded this one. */
export function computeExpMapAsync(seed: ExpMapSeed, up: Vec3, radius: number): Promise<ExpMapResult | null> {
  const id = nextId++;
  latest = id;
  const w = getWorker();
  if (!w) {
    const s = fallbackSurface;
    return Promise.resolve(s ? computeExpMap(s, seed, up, radius) : null);
  }
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: 'compute', id, key: currentKey, seed, up, radius });
  });
}
