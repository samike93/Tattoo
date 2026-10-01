import { removeBackground, type BgOptions, type BgResult, type RGBAImage } from './pipeline';

/**
 * Runs background removal in a Web Worker so the 3D view keeps rendering. Only the latest request
 * resolves; older ones are dropped (dragging a slider fires many). Falls back to the main thread
 * where workers are unavailable.
 */
let worker: Worker | null | undefined;
let nextId = 1;
let latest = 0;
const pending = new Map<number, { resolve: (r: BgResult) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./bg.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; result?: BgResult; error?: string }>) => {
      const p = pending.get(e.data.id);
      pending.delete(e.data.id);
      if (!p) return;
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(e.data.result!);
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || 'Background removal worker failed'));
      pending.clear();
      worker = null; // fall back to the main thread from now on
    };
  } catch {
    worker = null;
  }
  return worker;
}

export class Superseded extends Error {}

export function removeBackgroundAsync(image: RGBAImage, options: Partial<BgOptions>): Promise<BgResult> {
  const id = nextId++;
  latest = id;
  const w = getWorker();
  if (!w) {
    return new Promise((resolve) => setTimeout(() => resolve(removeBackground(image, options)), 0));
  }
  // Older requests still pending will never be used: reject them now.
  for (const [pid, p] of pending) {
    if (pid < id) {
      p.reject(new Superseded());
      pending.delete(pid);
    }
  }
  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: (r) => (id === latest ? resolve(r) : reject(new Superseded())),
      reject,
    });
    const copy = new Uint8ClampedArray(image.data); // the original stays usable for the next run
    w.postMessage({ id, image: { width: image.width, height: image.height, data: copy }, options }, [copy.buffer]);
  });
}

export function canvasToImage(c: HTMLCanvasElement): RGBAImage {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
  return { width: d.width, height: d.height, data: d.data };
}

export function imageToCanvas(img: RGBAImage): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

/** Downscale for fast interactive previews. */
export function scaledCopy(c: HTMLCanvasElement, maxSide: number): HTMLCanvasElement {
  const k = Math.min(1, maxSide / Math.max(c.width, c.height));
  if (k === 1) return c;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(c.width * k));
  out.height = Math.max(1, Math.round(c.height * k));
  const g = out.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, 0, 0, out.width, out.height);
  return out;
}
