import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector2 } from 'three';
import type { LoadedBody } from '../body/loadBody';
import type { CameraPreset } from '../state';
import { presetPose } from './Scene';

export type ExportView = 'current' | Extract<CameraPreset, 'front' | 'back' | 'design'>;

/** Long side of exported images, px. 3000 px prints a 10 in wide image at 300 dpi. */
export const EXPORT_LONG_SIDE = 3000;

type ExportFn = (view: ExportView) => Promise<Blob>;
let exportFn: ExportFn | null = null;

/** Render a view at high resolution and return a PNG. Available once the 3D view is up. */
export function exportImage(view: ExportView): Promise<Blob> {
  if (!exportFn) return Promise.reject(new Error('The 3D view is not ready yet'));
  return exportFn(view);
}

/**
 * Renders a still at EXPORT_LONG_SIDE by temporarily resizing the drawing buffer (and using a copy of
 * the camera for preset views), then restores everything. The UI never sees the resize because it all
 * happens between two animation frames.
 */
export function Exporter({ body }: { body: LoadedBody | null }) {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    exportFn = async (view) => {
      const src = camera as PerspectiveCamera;
      const cam = src.clone();
      const max = Math.min(EXPORT_LONG_SIDE, gl.capabilities.maxTextureSize);
      const aspect = view === 'current' ? size.width / size.height : view === 'design' ? 1 : 3 / 4; // portrait for body views
      if (view !== 'current') {
        cam.fov = 35;
        const { pos, target } = presetPose(view, body?.skeleton.height_m ?? 1.75, aspect, cam.fov);
        cam.position.set(...pos);
        cam.lookAt(...target);
      }
      const w = Math.round(aspect >= 1 ? max : max * aspect);
      const h = Math.round(aspect >= 1 ? max / aspect : max);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      const oldSize = gl.getSize(new Vector2());
      const oldRatio = gl.getPixelRatio();
      try {
        gl.setPixelRatio(1);
        gl.setSize(w, h, false);
        gl.render(scene, cam);
        return await new Promise<Blob>((resolve, reject) =>
          gl.domElement.toBlob((b) => (b ? resolve(b) : reject(new Error('The browser could not encode the image'))), 'image/png'),
        );
      } finally {
        gl.setPixelRatio(oldRatio);
        gl.setSize(oldSize.x, oldSize.y, false);
        gl.render(scene, camera);
      }
    };
    return () => {
      exportFn = null;
    };
  }, [gl, scene, camera, size, body]);
  return null;
}
