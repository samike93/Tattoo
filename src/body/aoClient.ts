import type { BodySurface } from './surface';
import { vertexAO } from './ao';

/**
 * Ambient occlusion in a Web Worker, so dragging a body-shape slider stays smooth (~0.1 s on a
 * laptop, more on an iPad). Only the latest request resolves with data; older ones resolve null.
 * Falls back to the main thread if workers are unavailable.
 */
let worker: Worker | null | undefined;
let nextId = 1;
let latest = 0;
const pending = new Map<number, (ao: Float32Array | null) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./ao.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; ao?: Float32Array; error?: string }>) => {
      const done = pending.get(e.data.id);
      pending.delete(e.data.id);
      done?.(e.data.id === latest && e.data.ao ? e.data.ao : null);
    };
    worker.onerror = () => {
      for (const done of pending.values()) done(null);
      pending.clear();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Welded per-vertex AO for this surface (null if a newer request superseded it). */
export function computeAO(s: BodySurface): Promise<Float32Array | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(vertexAO(s.positions, s.normals, s.triangles, s.vertexCount));
  const id = (latest = nextId++);
  return new Promise((resolve) => {
    pending.set(id, resolve);
    // Copies: the surface stays in use on the main thread.
    w.postMessage({ id, positions: s.positions.slice(), normals: s.normals.slice(), triangles: s.triangles, n: s.vertexCount });
  });
}
