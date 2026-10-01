import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import {
  CanvasTexture,
  Color,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  NeutralToneMapping,
  PCFSoftShadowMap,
  DirectionalLight,
  MeshBasicMaterial,
  Raycaster,
  SRGBColorSpace,
  Vector3,
  BufferGeometry,
  type Texture,
} from 'three';
import { buildEnvironmentScene, DIRECT_LIGHTS } from './environment';
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
import { chooseMethod, limbAt, type AutoChoice } from '../placement/resolve';
import { createSkinMaterial, setCylinderUniforms, setDesignUniforms, setInkLook } from '../ink/skinMaterial';
import { drawChecker } from '../phase0/checker';
import { limbSurfacePoint, shoulderBladePoint } from '../phase0/scenarios';
import { expmapRadius } from '../phase0/study';
import { useApp, type AppState, type CameraPreset, type Spot } from '../state';
import { Exporter } from './Exporter';
import { lastPointerType, trackPinch } from './input';
import { HANDLE_UV, locateUV, setBox, setProjector, type HandleId, type SurfacePoint } from '../placement/box';
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
  const bodyLocal = useDeferredValue(useApp((s) => s.bodyLocal));
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
    const b = prepareBody(raw, { heightM: clientHeight, weight: bodyWeight, muscle: bodyMuscle, local: bodyLocal });
    (b.geometry as BvhGeometry).computeBoundsTree();
    useApp.getState().setTiming('bodyPrepareMs', performance.now() - t0);
    return b;
  }, [raw, bodyId, clientHeight, bodyWeight, bodyMuscle, bodyLocal]);

  // Every reshape (height, build, muscle) builds a new geometry: free the old one's BVH and GPU
  // buffers, or dragging a body slider leaks GPU memory (fatal on iPads).
  useEffect(
    () => () => {
      (body?.geometry as BvhGeometry | undefined)?.disposeBoundsTree();
      body?.geometry.dispose();
    },
    [body],
  );

  return (
    <>
      <Lights height={body?.skeleton.height_m ?? 1.75} />
      <CameraRig body={body} />
      {body && <Body body={body} />}
      <FrameStats />
      <TestHooks body={body} />
      <Exporter body={body} />
      <BoxProjector />
    </>
  );
}

function Lights({ height }: { height: number }) {
  const { gl, scene } = useThree();
  const preset = useApp((s) => s.lighting);
  const L = DIRECT_LIGHTS[preset];
  useEffect(() => {
    // Procedural environment: no HDR download, works offline (ui/environment.ts).
    const pmrem = new PMREMGenerator(gl);
    const envScene = buildEnvironmentScene(preset);
    const env = pmrem.fromScene(envScene, 0.035).texture;
    scene.environment = env;
    scene.environmentIntensity = L.env;
    // Khronos PBR Neutral tone mapping keeps skin and ink colours true (made for product colour).
    gl.toneMapping = NeutralToneMapping;
    gl.toneMappingExposure = L.exposure;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;
    return () => {
      env.dispose();
      pmrem.dispose();
      envScene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        (m.material as MeshBasicMaterial | undefined)?.dispose?.();
      });
    };
  }, [gl, scene, preset, L.env, L.exposure]);
  const keyRef = useRef<DirectionalLight>(null);
  useEffect(() => {
    // Shadow camera sized to the body, so the floor shadow is sharp enough and cheap.
    const k = keyRef.current;
    if (!k) return;
    const cam = k.shadow.camera;
    cam.left = -1.2;
    cam.right = 1.2;
    cam.top = height + 0.3;
    cam.bottom = -0.5;
    cam.near = 0.5;
    cam.far = 12;
    cam.updateProjectionMatrix();
    k.target.position.set(0, height / 2, 0);
    k.target.updateMatrixWorld();
  }, [height, preset]);
  return (
    <>
      <directionalLight
        ref={keyRef}
        position={L.key.pos}
        intensity={L.key.intensity}
        color={L.key.color}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-radius={6}
        shadow-bias={-0.0005}
      />
      <directionalLight position={L.fill.pos} intensity={L.fill.intensity} color={L.fill.color} />
      <ContactFloor />
    </>
  );
}

/** Soft shadow and a contact darkening under the feet, so the body stands on something. */
function ContactFloor() {
  const blob = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => blob.dispose(), [blob]);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <shadowMaterial opacity={0.28} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0.02]} scale={[0.9, 0.55, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={blob} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

/**
 * Camera position and target for a preset view. Whole-body views back off until the body fits the
 * frame at this aspect ratio (portrait phones and exports included).
 */
export function presetPose(preset: CameraPreset, h: number, aspect = 1, fovDeg = 35): { pos: Vec3; target: Vec3 } {
  const mid = h * 0.5;
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const fit = (halfW: number) => Math.max((0.54 * h) / t, halfW / (t * aspect)) + 0.15;
  const front = fit(0.4 * h), side = fit(0.2 * h);
  const st = useApp.getState();
  const focus = st.focus;
  switch (preset) {
    case 'back':
      return { pos: [0, mid, -front], target: [0, mid, 0] };
    case 'left':
      return { pos: [side, mid, 0], target: [0, mid, 0] };
    case 'right':
      return { pos: [-side, mid, 0], target: [0, mid, 0] };
    case 'design':
      return focus ? { pos: add(focus.point, scale(focus.normal, 0.42)), target: focus.point } : { pos: [0, mid, front], target: [0, mid, 0] };
    case 'opposite': {
      const o = st.focusOpposite ?? focus;
      return o ? { pos: add(o.point, scale(o.normal, 0.42)), target: o.point } : { pos: [0, mid, -front], target: [0, mid, 0] };
    }
    default:
      return { pos: [0, mid, front], target: [0, mid, 0] };
  }
}

function CameraRig({ body }: { body: LoadedBody | null }) {
  const camera = useApp((s) => s.camera);
  const size = useThree((s) => s.size);
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
    const { pos, target } = presetPose(camera.preset, h, size.width / Math.max(size.height, 1));
    cam.position.set(...pos);
    controls.target.set(...target);
    controls.update();
  }, [camera, controls, cam, h]);

  return null;
}

/** Lets the DOM selection box project skin points to the screen and pause orbiting while dragging. */
function BoxProjector() {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const controls = useThree((s) => s.controls) as OrbitControls | null;
  useEffect(() => {
    const v = new Vector3();
    setProjector({
      project: (p, n) => {
        v.set(...p).project(camera);
        const r = dom.getBoundingClientRect();
        const toCam = sub([camera.position.x, camera.position.y, camera.position.z], p);
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, visible: v.z < 1 && (!n || dot(n, toCam) > 0) };
      },
      setOrbitEnabled: (on) => {
        if (controls) controls.enabled = on;
      },
    });
    return () => setProjector(null);
  }, [camera, dom, controls]);
  return null;
}

/** Hooks for automated tests and console debugging: window.tattoo.project(p) and .bodyHeight(). */
function TestHooks({ body }: { body: LoadedBody | null }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as OrbitControls | null;
  const dom = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const t = (window as unknown as { tattoo: Record<string, unknown> }).tattoo;
    if (!t) return;
    t.project = (p: Vec3) => {
      const v = new Vector3(...p).project(camera);
      const r = dom.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    };
    t.lookAt = (pos: Vec3, target: Vec3) => {
      camera.position.set(...pos);
      controls?.target.set(...target);
      controls?.update();
    };
    t.orbitEnabled = () => controls?.enabled ?? null;
    t.gpuMemory = () => ({ ...gl.info.memory });
    t.bodyHeight = () => {
      const bb = body?.geometry.boundingBox;
      return bb ? bb.max.y - bb.min.y : NaN;
    };
  }, [camera, dom, body, controls, gl]);
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
  'method' | 'limbId' | 'cylMode' | 'band' | 'slide' | 'around' | 'placement' | 'spot' | 'widthIn' | 'heightIn' | 'rotationDeg' | 'mirror' | 'opacity' | 'design' | 'showRegion' | 'skinTone' | 'skinDetail' | 'selected' | 'inkLook'
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
  const drag = useRef<{ offset: Vec3; pointerId: number; stopPinch?: () => void; pinching?: boolean } | null>(null);

  const shared = useApp(useShallow((s: AppState): Shared => ({
    method: s.method, limbId: s.limbId, cylMode: s.cylMode, band: s.band, slide: s.slide, around: s.around,
    placement: s.placement, spot: s.spot, widthIn: s.widthIn, heightIn: s.heightIn, rotationDeg: s.rotationDeg, mirror: s.mirror,
    opacity: s.opacity, design: s.design, showRegion: s.showRegion, skinTone: s.skinTone, skinDetail: s.skinDetail, selected: s.selected, inkLook: s.inkLook,
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
      uniforms.uDetail.value = shared.skinDetail ? 1 : 0;
      uniforms.uSSS.value = shared.skinDetail ? 1 : 0;
      uniforms.uSelected.value = shared.selected;
      setInkLook(uniforms, shared.inkLook);
      if (shared.design.kind === 'none') {
        // Deleted: bare skin, no box.
        uniforms.uInkMode.value = 0;
        live.current = { kind: 'none' };
        setDecal(null);
        setBox(null);
        app.set({ metrics: null, metricsNote: '', status: 'Ready' });
        return;
      }
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
      let autoChoice: AutoChoice | null = null;
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
          autoChoice = choice;
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

      const finish = (metrics: DistortionStats | null, focus: SurfaceHit | null, note: string, uv?: { field: Float64Array; skip?: (t: number) => boolean }) => {
        if (uv) {
          const ids = (band ? ['n', 's'] : Object.keys(HANDLE_UV)) as HandleId[];
          const found = locateUV([[0.5, 0.5], ...ids.map((id) => HANDLE_UV[id])], uv.field, body.surface.positions, body.surface.normals, body.surface.triangles, uv.skip);
          const handles: Partial<Record<HandleId, SurfacePoint>> = {};
          ids.forEach((id, k) => {
            if (found[k + 1]) handles[id] = found[k + 1]!;
          });
          const center = found[0] ?? (focus ? { point: focus.point, normal: focus.normal } : null);
          setBox(center ? { center, handles, band } : null);
        } else setBox(null);
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
          // Open on the design, not the whole body: the placement is the point of the page. But
          // never override a view the user (or a link) already picked while the body was loading.
          framedOnce = true;
          if (useApp.getState().camera.nonce === 0) app.requestCamera('design');
        }
      };

      // 3. Apply.
      const applyCylinder = (fr: LimbFrame, p: CylPlacement, note: string) => {
        method = 'cylinder';
        limbLabel = fr.limb.label;
        setCylinderUniforms(uniforms, fr, p);
        for (let i = 0; i < vid.length; i++) inkMask.setX(i, fr.vertexMask[vid[i]]);
        inkMask.needsUpdate = true;
        uniforms.uInkMode.value = 2;
        live.current = { kind: 'cylinder', frame: fr, pl: p, tf };
        setDecal(null);
        const metrics = measureSamples(cylinderSamples(body.surface, fr, p, tf), tf, band ? width : undefined);
        // Design coordinates per limb vertex, for the selection box; skip triangles across the seam.
        const n = body.surface.vertexCount;
        const field = new Float64Array(2 * n).fill(NaN);
        const xs = new Float64Array(n), cs = new Float64Array(n);
        for (let v = 0; v < n; v++) {
          if (!fr.vertexMask[v]) continue;
          const c = cylCoords(fr, [body.surface.positions[3 * v], body.surface.positions[3 * v + 1], body.surface.positions[3 * v + 2]], p);
          const [u, w] = designUV(c.x, c.y, c.C, tf);
          field[2 * v] = u;
          field[2 * v + 1] = w;
          xs[v] = c.x;
          cs[v] = c.C;
        }
        const tri = body.surface.triangles;
        const skip = (t: number) => {
          const a = tri[t], b = tri[t + 1], c = tri[t + 2];
          const half = Math.min(cs[a], cs[b], cs[c]) / 2;
          return Math.abs(xs[a] - xs[b]) > half || Math.abs(xs[b] - xs[c]) > half || Math.abs(xs[a] - xs[c]) > half;
        };
        finish(metrics, hit ?? limbSurfacePoint(body, mesh, fr, p.centerT, p.centerAngle), note, { field, skip });
      };

      if (method === 'cylinder' && frame && pl) {
        applyCylinder(frame, pl, band ? 'Full band: the width follows the limb so the band closes exactly.' : `Wraps around the ${frame.limb.label.toLowerCase()}.`);
      } else if (method === 'expmap' && hit) {
        const seedHit = hit;
        computeExpMapAsync(seedHit, [0, 1, 0], expmapRadius(tf))
          .then((em) => {
            if (!em || my !== seq.current) return; // superseded by a newer placement
            const metrics = measureSamples(vertexCoordSamples(body.surface, em.coords, tf), tf);
            if (autoChoice?.limb && metrics.flippedFraction > 0.005) {
              // The surface wrap folded over itself going round the limb: wrap with the cylinder.
              applyCylinder(frameFor(autoChoice.limb.id), { centerT: autoChoice.centerT!, centerAngle: autoChoice.centerAngle!, mode: 'arc' }, `Too wide for a surface wrap here, so it wraps around the ${autoChoice.limb.label.toLowerCase()}.`);
              return;
            }
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
            const field = new Float64Array(em.coords.length).fill(NaN);
            for (let v = 0; v < em.coords.length / 2; v++) {
              if (!Number.isFinite(em.coords[2 * v])) continue;
              const [u, w] = designUV(em.coords[2 * v], em.coords[2 * v + 1], 1, tf);
              field[2 * v] = u;
              field[2 * v + 1] = w;
            }
            finish(metrics, seedHit, '', { field });
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
        const fr = tangentFrame(hit.normal, [0, 1, 0]);
        const n = body.surface.vertexCount;
        const field = new Float64Array(2 * n).fill(NaN);
        for (let v = 0; v < n; v++) {
          const d = sub([body.surface.positions[3 * v], body.surface.positions[3 * v + 1], body.surface.positions[3 * v + 2]], hit.point);
          const nv: Vec3 = [body.surface.normals[3 * v], body.surface.normals[3 * v + 1], body.surface.normals[3 * v + 2]];
          if (Math.abs(dot(d, fr.n)) > Math.max(width, height) / 2 || dot(nv, fr.n) < 0.2) continue;
          const [u, w] = designUV(dot(d, fr.e1), dot(d, fr.e2), 1, tf);
          field[2 * v] = u;
          field[2 * v + 1] = w;
        }
        finish(measureSamples(decalSamples(g), tf), hit, 'three.js DecalGeometry: a flat box projection, shown for comparison. Watch the sides of curved areas and the back of the arm.', { field });
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
    const st = useApp.getState();
    if (st.design.kind === 'none') return;
    // Pencil mode: fingers only move the view (and a resting palm can't knock the design around).
    if (st.pencilMode && e.pointerType === 'touch') return;
    const h = hitFromIntersection(body, e.intersections[0]);
    if (!h) return;
    const pen = e.pointerType === 'pen';
    const grabbed = onDesign(h);
    // A Pencil works anywhere on the skin: touching off the design brings the design to the tip.
    if (!grabbed && !pen) return;
    e.stopPropagation();
    if (!grabbed) moveTo(h);
    const focus = st.focus;
    drag.current = { offset: grabbed && focus ? sub(focus.point, h.point) : [0, 0, 0], pointerId: e.pointerId };
    if (e.pointerType === 'touch') {
      // A second finger turns the drag into pinch-to-resize and twist-to-rotate.
      const d = drag.current;
      d.stopPinch = trackPinch(e.nativeEvent, (active) => (d.pinching = active));
    }
    if (!st.selected) st.set({ selected: true });
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
    if (drag.current.pinching || e.pointerId !== drag.current.pointerId) return;
    const h = surfaceHitFromRay(e.ray);
    if (!h) return;
    // Keep the grabbed point under the finger: shift by the grab offset and snap back onto the skin.
    const target = add(h.point, drag.current.offset);
    const snapped = raycastBody(body, meshRef.current!, add(target, scale(h.normal, 0.05)), scale(h.normal, -1)) ?? h;
    moveTo(snapped);
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current.stopPinch?.();
    drag.current = null;
    if (controls) controls.enabled = true;
    document.body.style.cursor = '';
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // that was an orbit drag, not a tap
    const app = useApp.getState();
    // Pencil mode: finger taps don't place the design (fingers are for the view).
    if (app.pencilMode && ((e.nativeEvent as PointerEvent).pointerType || lastPointerType) === 'touch') return;
    e.stopPropagation();
    const hit = hitFromIntersection(body, e.intersections[0]);
    if (!hit) return;
    if (app.design.kind === 'none') {
      app.set({ status: 'Import a design (or press Undo) to place it.' });
      return;
    }
    if (!app.selected) app.set({ selected: true });
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
        castShadow
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
  if (spot === 'innerElbow') return limbSurfacePoint(body, mesh, forearm, 0, 0);
  return limbSurfacePoint(body, mesh, forearm, forearm.length / 2, Math.PI / 2);
}

