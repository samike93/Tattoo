import { create } from 'zustand';
import type { BodyId } from './body/skeleton';
import type { CylMode } from './projection/cylindrical';
import type { DistortionStats } from './projection/distortion';
import type { Vec3 } from './projection/vec';

export type Method = 'decal' | 'cylinder' | 'expmap';
export type CameraPreset = 'front' | 'back' | 'left' | 'right' | 'design' | 'opposite';
export type Spot = 'forearm' | 'shoulderBlade';

export interface DesignSource {
  kind: 'checker' | 'image';
  name: string;
  /** Pixel aspect (width / height) of an uploaded image. */
  aspect: number;
  canvas?: HTMLCanvasElement;
}

export interface Placement {
  point: Vec3;
  normal: Vec3;
}

export interface AppState {
  bodyId: BodyId;
  /** Client height in meters. */
  clientHeight: number;
  skinTone: string;
  method: Method;
  limbId: string;
  cylMode: CylMode;
  band: boolean;
  /** 0..1 along the limb from the proximal joint. */
  slide: number;
  /** Degrees around the limb, 0 = front. */
  around: number;
  /** Surface placement for decal / exponential map. Null = use `spot`. */
  placement: Placement | null;
  /** Named starting spot for decal / exponential map. */
  spot: Spot;
  widthIn: number;
  heightIn: number;
  lockAspect: boolean;
  rotationDeg: number;
  mirror: boolean;
  opacity: number;
  design: DesignSource;
  showRegion: boolean;
  wireframe: boolean;
  debugOpen: boolean;
  ui: boolean;
  camera: { preset: CameraPreset; nonce: number };
  // Readouts (written by the scene)
  /** Where the design currently sits, for the "frame design" camera. */
  focus: Placement | null;
  /** The skin directly behind the design (other side of the limb or body), for the "behind" camera. */
  focusOpposite: Placement | null;
  /** Size actually applied (band mode overrides width with the ring circumference), inches. */
  appliedSize: [number, number];
  metrics: DistortionStats | null;
  metricsNote: string;
  timings: Record<string, number>;
  status: string;
  errors: { time: string; message: string }[];
  set: (patch: Partial<AppState>) => void;
  logError: (message: string) => void;
  setTiming: (key: string, ms: number) => void;
  requestCamera: (preset: CameraPreset) => void;
}

export const DEFAULT_HEIGHTS: Record<BodyId, number> = { male: 1.78, female: 1.65 };

export const useApp = create<AppState>((set) => ({
  bodyId: 'male',
  clientHeight: DEFAULT_HEIGHTS.male,
  skinTone: '#d9a57e',
  method: 'expmap',
  limbId: 'forearm.L',
  cylMode: 'arc',
  band: false,
  slide: 0.5,
  around: 90,
  placement: null,
  spot: 'forearm',
  widthIn: 3,
  heightIn: 4,
  lockAspect: false,
  rotationDeg: 0,
  mirror: false,
  opacity: 1,
  design: { kind: 'checker', name: '1-inch checkerboard', aspect: 0.75 },
  showRegion: false,
  wireframe: false,
  debugOpen: false,
  ui: true,
  camera: { preset: 'front', nonce: 0 },
  focus: null,
  focusOpposite: null,
  appliedSize: [3, 4],
  metrics: null,
  metricsNote: '',
  timings: {},
  status: 'Loading body…',
  errors: [],
  set: (patch) => set(patch),
  logError: (message) =>
    set((s) => ({ errors: [...s.errors.slice(-49), { time: new Date().toISOString().slice(11, 19), message }] })),
  setTiming: (key, ms) => set((s) => ({ timings: { ...s.timings, [key]: ms } })),
  requestCamera: (preset) => set((s) => ({ camera: { preset, nonce: s.camera.nonce + 1 } })),
}));

/** State that goes into a share link (everything except uploaded images and readouts). */
const LINK_KEYS = [
  'bodyId', 'clientHeight', 'skinTone', 'method', 'limbId', 'cylMode', 'band', 'slide', 'around', 'spot',
  'widthIn', 'heightIn', 'rotationDeg', 'mirror', 'opacity', 'showRegion', 'wireframe', 'debugOpen', 'ui',
] as const;

export function stateToHash(s: AppState): string {
  const p = new URLSearchParams();
  for (const k of LINK_KEYS) p.set(k, String(s[k]));
  if (s.placement) p.set('at', [...s.placement.point, ...s.placement.normal].map((v) => v.toFixed(5)).join(','));
  return p.toString();
}

export function hashToState(hash: string): Partial<AppState> {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const out: Record<string, unknown> = {};
  const defaults = useApp.getState();
  for (const k of LINK_KEYS) {
    const v = p.get(k);
    if (v === null) continue;
    const d = defaults[k];
    out[k] = typeof d === 'number' ? Number(v) : typeof d === 'boolean' ? v === 'true' : v;
    if (typeof d === 'number' && !Number.isFinite(out[k] as number)) delete out[k];
  }
  const at = p.get('at')?.split(',').map(Number);
  if (at && at.length === 6 && at.every(Number.isFinite)) {
    out.placement = { point: at.slice(0, 3) as Vec3, normal: at.slice(3) as Vec3 };
  }
  return out as Partial<AppState>;
}
