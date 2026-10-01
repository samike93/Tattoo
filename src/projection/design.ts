/**
 * Common last step for every placement method: surface coordinates (x right, y up, meters,
 * origin at the design centre) -> design texture coordinates (u, v), where the design occupies
 * [0, 1] x [0, 1]. Mirrors the GLSL in ink/skinMaterial.ts.
 */
export interface DesignTransform {
  /** Design width and height on the skin, meters. */
  width: number;
  height: number;
  /** Rotation of the design on the skin, radians, counter-clockwise when looking at the skin. */
  rotation: number;
  mirror: boolean;
  /** Band mode: the design's width is stretched to exactly one ring circumference C so a full band closes. */
  band: boolean;
}

export const INCH = 0.0254;

export function designUV(x: number, y: number, C: number, tf: DesignTransform): [number, number] {
  if (tf.band) {
    const u = x / C + 0.5;
    return [tf.mirror ? 1 - u : u, y / tf.height + 0.5];
  }
  const c = Math.cos(tf.rotation), s = Math.sin(tf.rotation);
  const xr = c * x + s * y;
  const yr = -s * x + c * y;
  const u = xr / tf.width + 0.5;
  return [tf.mirror ? 1 - u : u, yr / tf.height + 0.5];
}

export function formatSize(widthM: number, heightM: number): string {
  const wi = widthM / INCH, hi = heightM / INCH;
  return `${wi.toFixed(2)} in × ${hi.toFixed(2)} in (${(widthM * 100).toFixed(1)} × ${(heightM * 100).toFixed(1)} cm)`;
}
