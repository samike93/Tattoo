import { BackSide, BoxGeometry, Color, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, SphereGeometry } from 'three';

export type LightingPreset = 'studio' | 'shop';

/**
 * Procedural lighting environments, rendered into an environment map with PMREMGenerator.
 * Built in code rather than downloaded (works offline, no licence questions).
 *
 * studio: a portrait-studio setup that flatters skin and shows ink clearly: a big warm softbox
 *         key above-front-left, a cooler fill right, a strip rim light behind, soft grey walls and
 *         a slightly warm floor bounce.
 * shop:   a tattoo shop under overhead fluorescent tubes: flat, cool, top-down, harsher contrast,
 *         for checking how the piece reads under the light it will be seen in at the shop.
 */
export function buildEnvironmentScene(preset: LightingPreset): Scene {
  const scene = new Scene();
  const room = new Mesh(new BoxGeometry(12, 7, 12), new MeshBasicMaterial({ color: preset === 'studio' ? 0x5c5c5e : 0x7a7e82, side: BackSide }));
  room.position.y = 2.5;
  scene.add(room);
  const floor = new Mesh(new PlaneGeometry(12, 12), new MeshBasicMaterial({ color: preset === 'studio' ? 0x605c59 : 0x6a6d70 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.99;
  scene.add(floor);

  const panel = (w: number, h: number, color: string, intensity: number, pos: [number, number, number]) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity) }));
    m.position.set(...pos);
    m.lookAt(0, 1, 0);
    scene.add(m);
  };

  if (preset === 'studio') {
    panel(2.6, 2.6, '#fffaf4', 9, [-2.6, 3.2, 3.2]); // key softbox
    panel(2.0, 2.4, '#f2f5ff', 3.4, [3.4, 2.0, 2.4]); // fill
    panel(0.6, 4.0, '#ffffff', 7, [1.8, 2.4, -3.6]); // rim strip
    panel(0.6, 4.0, '#ffffff', 5, [-2.2, 2.2, -3.4]); // second rim
    const bounce = new Mesh(new SphereGeometry(1.2, 16, 8), new MeshBasicMaterial({ color: new Color('#f3e6da').multiplyScalar(0.5) }));
    bounce.position.set(0, -0.6, 2.8);
    scene.add(bounce);
  } else {
    for (let x = -3; x <= 3; x += 2) {
      for (let z = -3; z <= 3; z += 3) {
        const tube = new Mesh(new PlaneGeometry(0.25, 2.4), new MeshBasicMaterial({ color: new Color('#eef6ff').multiplyScalar(16) }));
        tube.rotation.x = Math.PI / 2;
        tube.position.set(x, 5.9, z);
        scene.add(tube);
      }
    }
  }
  return scene;
}

/** Matching direct lights (the environment map gives soft fill; these give shape and the floor shadow). */
export const DIRECT_LIGHTS: Record<LightingPreset, { key: { pos: [number, number, number]; color: string; intensity: number }; fill: { pos: [number, number, number]; color: string; intensity: number }; env: number; exposure: number }> = {
  studio: { key: { pos: [-1.6, 3.2, 2.4], color: '#fffaf5', intensity: 2.0 }, fill: { pos: [2.2, 1.6, -2.2], color: '#eef2ff', intensity: 0.6 }, env: 0.9, exposure: 1.1 },
  shop: { key: { pos: [0.2, 5, 1.2], color: '#f4f9ff', intensity: 2.4 }, fill: { pos: [0, 2.5, 3], color: '#eef4ff', intensity: 0.6 }, env: 1.1, exposure: 1.15 },
};
