/// <reference lib="webworker" />
import { removeBackground, type BgOptions, type RGBAImage } from './pipeline';

export interface BgRequest {
  id: number;
  image: RGBAImage;
  options: Partial<BgOptions>;
}

self.onmessage = (e: MessageEvent<BgRequest>) => {
  const { id, image, options } = e.data;
  try {
    const result = removeBackground(image, options);
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, result }, [result.image.data.buffer]);
  } catch (err) {
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, error: String(err) });
  }
};
