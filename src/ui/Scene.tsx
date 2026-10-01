import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import {
  CanvasTexture,
  Color,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  Raycaster,
  SRGBColorSpace,
  Vector3,
  BufferGeometry,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { fetchRawBody, hitFromIntersection, prepareBody, raycastBody, type LoadedBody, type RawBody, type SurfaceHit } from '../body/loadBody';
import { LIMBS, type BodyId } from '../body/skeleton';
import { buildLimbFrame, cylCoords, ringCircumference, type CylPlacement, type LimbFrame } from '../projection/cylindrical';
import { buildDecal, decalSamples } from '../projection/decal';
import { designUV, INCH, type DesignTransform } from '../projection/design';
import type { DistortionStats } from '../projection/distortion';
import { cylinderSamples, measureSamples, vertexCoordSamples } from '../projection/evaluate';
import { computeExpMapAsync, setExpMapSurface } from '../projection/expmapClient';
import { chooseMethod, limbAt } from '../placement/resolve';
import { createSkinMaterial, setCylinderUniforms, setDesignUniforms } from '../ink/skinMaterial';
import { drawChecker } from '../phase0/checker';
import { limbSurfacePoint, shoulderBladePoint } from '../phase0/scenarios';
import { expmapRadius } from '../phase0/study';
import { useApp, type AppState, type Spot } from '../state';
import { add, dot, normalize, scale, sub, tangentFrame, type Vec3 } from '../projection/vec';

// three-mesh-bvh: fast raycasts on the body (tapping to place a design).
type BvhGeometry = BufferGeometry & { computeBoundsTree: typeof computeBoundsTree; disposeBoundsTree: typeof disposeBoundsTree };
Object.assign(BufferGeometry.prototype, { computeBoundsTree, disposeBoundsTree });
Object.assign(Mesh.prototype, { raycast: acceleratedRaycast });

const rawCache = new Map<BodyId, Promise<RawBody>>();
let framedOnce = false;
function loadRaw(id: BodyId) {
  if (!rawCache.has(id)) rawCache.set(id, fetchRawBody(id, import.meta.env.BASE_URL));
  return rawCache.get(id)!;
}

export function Scene() {
  const bodyId = useApp((s) => s.bodyId);
  // Deferred so dragging a body-shape slider stays smooth: the reshape catches up between frames.
  const clientHeight = useDeferredValue(useApp((s) => s.clientHeight));
  const bodyWeight = useDeferredValue(useApp((s) => s.bodyWeight));
  const bodyMuscle = useDeferredValue(useApp((s) => s.bodyMuscle));
  const [raw, setRaw] = useState<RawBody | null>(null);

  useEffect(() => {
    let alive = true;
    useApp.getState().set({ status: `Loading ${bodyId} body…` });
    const t0 = performance.now();
    loadRaw(bodyId)
      .then((r) => {
        if (!alive) return;
        useApp.getState().setTiming('bodyLoadMs', performance.now() - t0);
        setRaw(r);
      })
      .catch((e: Error) => {
        rawCache.delete(bodyId);
        useApp.getState().logError(e.message);
        useApp.getState().set({ status: `Could not load the body: ${e.message}` });
      });
    return () => {
      alive = false;
    };
  }, [bodyId]);

  const body = useMemo(() => {
    if (!raw || raw.id !== bodyId) return null;
    const t0 = performance.now();
    const b = prepareBody(raw, { heightM: clientHeight, weight: bodyWeight, muscle: bodyMuscle });
    (b.geometry as BvhGeometry).computeBoundsTree();
    useApp.getState().setTiming('bodyPrepareMs', performance.now() - t0);
    return b;
  }, [raw, bodyId, clientHeight, bodyWeight, bodyMuscle]);

  useEffect(() => () => (body?.geometry as BvhGeometry | undefined)?.disposeBoundsTree(), [body]);

  return (
    <>
      <Lights />
      <CameraRig body={body} />
      {body && <Body body={body} />}
      <FrameStats />
      <TestHooks body={body} />
    </>
  );
}

function Lights() {
  const { gl, scene } = useThree();
  useEffect(() => {
    // Procedural studio environment: no HDR download, works offline.
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.75;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return (
    <>
      <directionalLight position={[1.5, 3, 2.5]} intensity={1.6} color="#fff4ea" />
      <directionalLight position={[-2, 1.5, -2]} intensity={0.6} color="#dfe8ff" />
      <hemisphereLight args={['#ffffff', '#5a4d45', 0.35]} />
    </>
  );
}

function CameraRig({ body }: { body: LoadedBody | null }) {
  const camera = useApp((s) => s.camera);
  const cam = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const setThree = useThree((s) => s.set);
  const h = body?.skeleton.height_m ?? 1.75;
  const controls = useMemo(() => {
    const c = new OrbitControls(cam, dom);
    Object.assign(c, { enableDamping: true, dampingFactor: 0.12, minDistance: 0.15, maxDistance: 6 });
    return c;
  }, [cam, dom]);
  useEffect(() => {
    setThree({ controls });
    return () => controls.dispose();
  }, [controls, setThree]);
  useFrame(() => controls.update());

  useEffect(() => {
    const mid = h * 0.55;
    const dist = h * 1.45;
    let pos: Vec3, target: Vec3;
    const focus = useApp.getState().focus;
    switch (camera.preset) {
      case 'back': [pos, target] = [[0, mid, -dist], [0, mid, 0]]; break;
      case 'left': [pos, target] = [[dist, mid, 0], [0, mid, 0]]; break;
      case 'right': [pos, target] = [[-dist, mid, 0], [0, mid, 0]]; break;
      case 'design':
        [pos, target] = focus ? [add(focus.point, scale(focus.normal, 0.42)), focus.point] : [[0, mid, dist], [0, mid, 0]];
        break;
      case 'opposite': {
        const o = useApp.getState().focusOpposite ?? focus;
        [pos, target] = o ? [add(o.point, scale(o.normal, 0.42)), o.point] : [[0, mid, -dist], [0, mid, 0]];
        break;
      }
      default: [pos, target] = [[0, mid, dist], [0, mid, 0]];
    }
    cam.position.set(...pos);
    controls.target.set(...target);
    controls.update();
  }, [camera, controls, cam, h]);

  return null;
}

/** Hooks for automated tests and console debugging: window.tattoo.project(p) and .bodyHeight(). */
function TestHooks({ body }: { body: LoadedBody | null }) {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const t = (window as unknown as { tattoo: Record<string, unknown> }).tattoo;
    if (!t) return;
    t.project = (p: Vec3) => {
      const v = new Vector3(...p).project(camera);
      const r = dom.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    };
    t.bodyHeight = () => {
      const bb = body?.geometry.boundingBox;
      return bb ? bb.max.y - bb.min.y : NaN;
    };
  }, [camera, dom, body]);
  return null;
}

function FrameStats() {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ frames: 0, t: performance.now() });
  useFrame(() => {
    const a = acc.current;
    a.frames++;
    const now = performance.now();
    if (now - a.t > 1000) {
      const st = useApp.getState();
      st.set({
        timings: {
          ...st.timings,
          fps: (1000 * a.frames) / (now - a.t),
          triangles: gl.info.render.triangles,
          drawCalls: gl.info.render.calls,
        },
      });
      a.frames = 0;
      a.t = now;
    }
  });
  return null;
}

type Shared = Pick<
  AppState,
  'method' | 'limbId' | 'cylMode' | 'band' | 'slide' | 'around' | 'placement' | 'spot' | 'widthIn' | 'heightIn' | 'rotationDeg' | 'mirror' | 'opacity' | 'design' | 'showRegion' | 'skinTone'
>;

function Body({ body }: { body: LoadedBody }) {
  const meshRef = useRef<Mesh>(null);
  const { material, uniforms } = useMemo(() => createSkinMaterial('#d9a57e'), []);
  const frames = useMemo(() => new Map<string, LimbFrame>(), [body]);
  const [decal, setDecal] = useState<BufferGeometry | null>(null);
  const designTexRef = useRef<{ key: string; tex: Texture } | null>(null);
  const decalMat = useMemo(() => new MeshStandardMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.55 }), []);
  const wireframe = useApp((s) => s.wireframe);
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  /** What is currently drawn, for hit-testing drags. */
  const live = useRef<{ kind: 'none' } | { kind: 'cylinder'; frame: LimbFrame; pl: CylPlacement; tf: DesignTransform } | { kind: 'expmap'; coords: Float64Array; tf: DesignTransform } | { kind: 'decal'; hit: SurfaceHit; tf: DesignTransform }>({ kind: 'none' });
  const seq = useRef(0);
  const drag = useRef<{ offset: Vec3; pointerId: number } | null>(null);

  const shared = useApp(useShallow((s: AppState): Shared => ({
    method: s.method, limbId: s.limbId, cylMode: s.cylMode, band: s.band, slide: s.slide, around: s.around,
    placement: s.placement, spot: s.spot, widthIn: s.widthIn, heightIn: s.heightIn, rotationDeg: s.rotationDeg, mirror: s.mirror,
    opacity: s.opacity, design: s.design, showRegion: s.showRegion, skinTone: s.skinTone,
  })));

  const frameFor = (id: string) => {
    if (!frames.has(id)) {
      const t0 = performance.now();
      frames.set(id, buildLimbFrame(body.surface, body.skeleton, LIMBS.find((l) => l.id === id)!));
      useApp.getState().setTiming('limbFrameMs', performance.now() - t0);
    }
    return frames.get(id)!;
  };

  useEffect(() => {
    setExpMapSurface(`${body.id}:${body.skeleton.height_m}:${body.surface.positions[0]}:${body.surface.positions[300]}`, body.surface);
  }, [body]);

  // Recompute placement, uniforms and metrics whenever anything relevant changes.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const my = ++seq.current;
    const app = useApp.getState();
    const fail = (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      app.logError(msg);
      app.set({ status: `Error: ${msg}` });
    };
    try {
      const t0 = performance.now();
      material.color = new Color(shared.skinTone);
      const geo = body.geometry;
      const inkCoord = geo.getAttribute('inkCoord');
      const inkMask = geo.getAttribute('inkMask');
      const vid = body.surface.vid;
      const height = shared.heightIn * INCH;
      let width = shared.widthIn * INCH;

      // 1. Where, and with which method.
      let method: 'expmap' | 'cylinder' | 'decal';
      let frame: LimbFrame | null = null;
      let pl: CylPlacement | null = null;
      let hit: SurfaceHit | null = null;
      let limbLabel: string | null = null;
      if (shared.method === 'cylinder') {
        method = 'cylinder';
        frame = frameFor(shared.limbId);
        pl = { centerT: shared.slide * frame.length, centerAngle: (shared.around * Math.PI) / 180, mode: shared.cylMode };
        limbLabel = frame.limb.label;
      } else {
        hit = resolvePlacement(body, mesh, shared.placement) ?? defaultSpot(body, mesh, shared.spot, frameFor('forearm.L'));
        if (!hit) throw new Error('Could not find a spot on the body for the design');
        if (shared.method === 'auto') {
          const choice = chooseMethod(body, hit, width, shared.band, frameFor);
          method = choice.method;
          limbLabel = choice.limb?.label ?? null;
          if (choice.method === 'cylinder' && choice.limb) {
            frame = frameFor(choice.limb.id);
            pl = { centerT: choice.centerT!, centerAngle: choice.centerAngle!, mode: 'arc' };
          }
        } else {
          method = shared.method;
          limbLabel = limbAt(body, hit)?.label ?? null;
        }
      }
      const band = method === 'cylinder' && shared.band;
      if (band && frame && pl) width = ringCircumference(frame, pl.centerT);
      const tf: DesignTransform = { width, height, rotation: (shared.rotationDeg * Math.PI) / 180, mirror: shared.mirror, band };

      // 2. Design texture (the checkerboard is redrawn so cells stay exactly 1 inch at any size).
      const texKey = shared.design.kind === 'checker' ? `checker:${(width / INCH).toFixed(3)}x${shared.heightIn.toFixed(3)}:${band}` : `image:${shared.design.name}:${shared.design.canvas?.width}:${shared.design.canvas?.height}`;
      if (designTexRef.current?.key !== texKey) {
        const canvas = shared.design.kind === 'checker' ? drawChecker(width / INCH, shared.heightIn, band) : shared.design.canvas!;
        const tex = new CanvasTexture(canvas);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 8;
        designTexRef.current?.tex.dispose();
        designTexRef.current = { key: texKey, tex };
      }
      const tex = designTexRef.current.tex;

      const finish = (metrics: DistortionStats | null, focus: SurfaceHit | null, note: string) => {
        uniforms.uInk.value = tex;
        setDesignUniforms(uniforms, tf, shared.opacity);
        uniforms.uShowRegion.value = shared.showRegion;
        const behind = focus && raycastBody(body, mesh, add(focus.point, scale(focus.normal, -0.4)), focus.normal);
        app.set({
          metrics,
          metricsNote: note,
          resolved: { method, limbLabel },
          appliedSize: [width / INCH, height / INCH],
          focus: focus ? { point: focus.point, normal: focus.normal } : null,
          focusOpposite: behind ? { point: behind.point, normal: behind.normal } : null,
          status: 'Ready',
        });
        app.setTiming('placementMs', performance.now() - t0);
        if (!framedOnce && focus) {
          // Open on the design, not the whole body: the placement is the point of the page.
          framedOnce = true;
          app.requestCamera('design');
        }
      };

      // 3. Apply.
      if (method === 'cylinder' && frame && pl) {
        setCylinderUniforms(uniforms, frame, pl);
        for (let i = 0; i < vid.length; i++) inkMask.setX(i, frame.vertexMask[vid[i]]);
        inkMask.needsUpdate = true;
        uniforms.uInkMode.value = 2;
        live.current = { kind: 'cylinder', frame, pl, tf };
        setDecal(null);
        const metrics = measureSamples(cylinderSamples(body.surface, frame, pl, tf), tf, band ? width : undefined);
        finish(metrics, hit ?? limbSurfacePoint(body, mesh, frame, pl.centerT, pl.centerAngle), band ? 'Full band: the width follows the limb so the band closes exactly.' : `Wraps around the ${frame.limb.label.toLowerCase()}.`);
      } else if (method === 'expmap' && hit) {
        const seedHit = hit;
        computeExpMapAsync(seedHit, [0, 1, 0], expmapRadius(tf))
          .then((em) => {
            if (!em || my !== seq.current) return; // superseded by a newer placement
            app.setTiming('expmapMs', em.ms);
            app.setTiming('expmapVertices', em.reached);
            for (let i = 0; i < vid.length; i++) {
              const x = em.coords[2 * vid[i]], y = em.coords[2 * vid[i] + 1];
              const ok = Number.isFinite(x);
              inkCoord.setXY(i, ok ? x : 0, ok ? y : 0);
              inkMask.setX(i, ok ? 1 : 0);
            }
            inkCoord.needsUpdate = true;
            inkMask.needsUpdate = true;
            uniforms.uInkMode.value = 1;
            live.current = { kind: 'expmap', coords: em.coords, tf };
            setDecal(null);
            finish(measureSamples(vertexCoordSamples(body.surface, em.coords, tf), tf), seedHit, '');
          })
          .catch(fail);
      } else if (hit) {
        uniforms.uInkMode.value = 0;
        const t1 = performance.now();
        const g = buildDecal(mesh, hit.point, hit.normal, width, height, tf.rotation, Math.max(width, height));
        app.setTiming('decalMs', performance.now() - t1);
        decalMat.map = tex;
        decalMat.needsUpdate = true;
        live.current = { kind: 'decal', hit, tf };
        setDecal((old) => {
          old?.dispose();
          return g;
        });
        finish(measureSamples(decalSamples(g), tf), hit, 'three.js DecalGeometry: a flat box projection, shown for comparison. Watch the sides of curved areas and the back of the arm.');
      }
    } catch (e) {
      fail(e);
    }
  }, [shared, body, material, uniforms, decalMat]);

  useEffect(() => () => material.dispose(), [material]);

  /** Is this hit inside the design? Used to start a drag instead of orbiting. */
  const onDesign = (h: SurfaceHit): boolean => {
    const L = live.current;
    let x = NaN, y = NaN, C = 1;
    if (L.kind === 'cylinder') {
      const c = cylCoords(L.frame, h.point, L.pl);
      if (!L.frame.vertexMask[h.triangle[0]]) return false;
      [x, y, C] = [c.x, c.y, c.C];
    } else if (L.kind === 'expmap' && h.bary) {
      x = 0;
      y = 0;
      for (let k = 0; k < 3; k++) {
        x += h.bary[k] * L.coords[2 * h.triangle[k]];
        y += h.bary[k] * L.coords[2 * h.triangle[k] + 1];
      }
    } else if (L.kind === 'decal') {
      const { e1, e2 } = tangentFrame(L.hit.normal, [0, 1, 0]);
      const d = sub(h.point, L.hit.point);
      [x, y] = [dot(d, e1), dot(d, e2)];
    } else return false;
    if (!Number.isFinite(x)) return false;
    const [u, v] = designUV(x, y, C, L.tf);
    return u >= -0.02 && u <= 1.02 && v >= -0.02 && v <= 1.02;
  };

  const surfaceHitFromRay = (ray: { origin: Vector3; direction: Vector3 }) => {
    const mesh = meshRef.current;
    if (!mesh) return null;
    const hits = new Raycaster(ray.origin, ray.direction).intersectObject(mesh, false);
    return hits.length ? hitFromIntersection(body, hits[0]) : null;
  };

  const moveTo = (h: SurfaceHit) => {
    const app = useApp.getState();
    if (app.method === 'cylinder') {
      const f = frameFor(app.limbId);
      const c = cylCoords(f, h.point, { centerT: 0, centerAngle: 0, mode: 'arc' });
      if (!f.vertexMask[h.triangle[0]]) return;
      app.set({ slide: Math.min(Math.max(c.t / f.length, 0), 1), around: Math.round((c.theta * 180) / Math.PI) });
    } else {
      app.set({ placement: toPlacement(h) });
    }
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const h = hitFromIntersection(body, e.intersections[0]);
    if (!h || !onDesign(h)) return;
    e.stopPropagation();
    const focus = useApp.getState().focus;
    drag.current = { offset: focus ? sub(focus.point, h.point) : [0, 0, 0], pointerId: e.pointerId };
    if (controls) controls.enabled = false; // the gesture moves the design, not the camera
    (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
    document.body.style.cursor = 'grabbing';
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) {
      const h = hitFromIntersection(body, e.intersections[0]);
      document.body.style.cursor = h && onDesign(h) ? 'grab' : '';
      return;
    }
    const h = surfaceHitFromRay(e.ray);
    if (!h) return;
    // Keep the grabbed point under the finger: shift by the grab offset and snap back onto the skin.
    const target = add(h.point, drag.current.offset);
    const snapped = raycastBody(body, meshRef.current!, add(target, scale(h.normal, 0.05)), scale(h.normal, -1)) ?? h;
    moveTo(snapped);
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    if (controls) controls.enabled = true;
    document.body.style.cursor = '';
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // that was an orbit drag, not a tap
    e.stopPropagation();
    const hit = hitFromIntersection(body, e.intersections[0]);
    if (!hit) return;
    const app = useApp.getState();
    if (app.method === 'cylinder') {
      // Tap a limb: pick it and move the design there.
      const limb = limbAt(body, hit);
      if (!limb) {
        app.set({ status: 'Cylindrical wrap works on arms, legs and the neck. Tap a limb, or switch to Auto.' });
        return;
      }
      const f = frameFor(limb.id);
      const c = cylCoords(f, hit.point, { centerT: 0, centerAngle: 0, mode: 'arc' });
      app.set({ limbId: limb.id, slide: Math.min(Math.max(c.t / f.length, 0), 1), around: Math.round((c.theta * 180) / Math.PI) });
    } else {
      app.set({ placement: toPlacement(hit) });
    }
  };

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={body.geometry}
        material={material}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => !drag.current && (document.body.style.cursor = '')}
        onLostPointerCapture={endDrag}
      />
      {wireframe && (
        <mesh geometry={body.geometry}>
          <meshBasicMaterial wireframe color="#000" transparent opacity={0.12} />
        </mesh>
      )}
      {decal && <mesh geometry={decal} material={decalMat} renderOrder={1} />}
    </>
  );
}

function resolvePlacement(body: LoadedBody, mesh: Mesh, p: AppState['placement']): SurfaceHit | null {
  if (!p) return null;
  if (p.triangle && p.bary && p.triangle.every((v) => v < body.surface.vertexCount)) {
    // Pinned to the mesh: same skin, whatever the body shape.
    const point: Vec3 = [0, 0, 0], normal: Vec3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      for (let j = 0; j < 3; j++) {
        point[j] += p.bary[k] * body.surface.positions[3 * p.triangle[k] + j];
        normal[j] += p.bary[k] * body.surface.normals[3 * p.triangle[k] + j];
      }
    }
    return { point, normal: normalize(normal), triangle: p.triangle, bary: p.bary };
  }
  return raycastBody(body, mesh, add(p.point, scale(p.normal, 0.03)), scale(p.normal, -1));
}

const toPlacement = (h: SurfaceHit) => ({ point: h.point, normal: h.normal, triangle: h.triangle, bary: h.bary });

function defaultSpot(body: LoadedBody, mesh: Mesh, spot: Spot, forearm: LimbFrame): SurfaceHit | null {
  if (spot === 'shoulderBlade') return shoulderBladePoint(body, mesh);
  return limbSurfacePoint(body, mesh, forearm, forearm.length / 2, Math.PI / 2);
}

