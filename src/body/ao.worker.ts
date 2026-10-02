import { vertexAO } from './ao';

self.onmessage = (e: MessageEvent<{ id: number; positions: Float64Array; normals: Float64Array; triangles: Uint32Array; n: number }>) => {
  const { id, positions, normals, triangles, n } = e.data;
  try {
    const ao = vertexAO(positions, normals, triangles, n);
    (self as unknown as Worker).postMessage({ id, ao }, [ao.buffer]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
