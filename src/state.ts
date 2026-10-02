import { create } from 'zustand';
import { skinHex } from './ink/skinTone';
import { savedPencilMode } from './ui/input';
import type { BodyId } from './body/skeleton';
import type { CylMode } from './projection/cylindrical';
import type { DistortionStats } from './projection/distortion';
import type { Vec3 } from './projection/vec';

export type Method = 'auto' | 'decal' | 'cylinder' | 'expmap';
export type CameraPreset = 'front' | 'back' | 'left' | 'right' | 'design' | 'opposite';
export type Spot = 'forearm' | 'shoulderBlade' | 'innerElbow';

export interface DesignSource {
  /** 'none' = the design was deleted (see `deleted` for undo). */
  kind: 'checker' | 'image' | 'none';
  name: string;
  /** Pixel aspect (width / height) of an uploaded image. */
  aspect: number;
  /** The design as placed on skin (background removed). */
  canvas?: HTMLCanvasElement;
  /** The imported image before background removal, for re-editing. */
  original?: HTMLCanvasElement;
  /** Background-removal settings used, for re-editing. */
  bgOptions?: Partial<import('./bgremove/pipeline').BgOptions>;
}

export interface Placement {
  point: Vec3;
  normal: Vec3;
  /**
   * The same spot pinned to the mesh (welded triangle + barycentric weights), so the design stays
   * on the same patch of skin when the body is reshaped. Point and normal are the fallback (share links).
   */
  triangle?: [number, number, number];
  bary?: [number, number, number];
}

/** A photo of the client, kept on this device only (never in share links). */
export interface ClientPhoto {
  canvas: HTMLCanvasElement;
  name: string;
}

export interface AppState {
  /** What the design is shown on: the 3D body or a photo of the client. */
  mode: 'body' | 'photo';
  photo: ClientPhoto | null;
  /** Design centre on the photo, photo pixels. Null = middle of the photo. */
  photoAt: [number, number] | null;
  /** Measured scale (photo pixels per inch); null = not measured (sizes are estimates). */
  photoPxPerInch: number | null;
  /** How much the design bends around a limb in the photo, 0 (flat) .. 1. */
  photoCurve: number;
  /** Setting the scale: tap two points on the photo, then enter the real distance. */
  photoCalibrating: boolean;
  bodyId: BodyId;
  /** Client height in meters. */
  clientHeight: number;
  /** Anny weight and muscle, 0..1 (0.5 = average). */
  bodyWeight: number;
  bodyMuscle: number;
  /** Body-shape controls (belly, bust, thighs...) by id, each -1..1, 0 = average. */
  bodyLocal: Record<string, number>;
  /** Skin colour actually used (sRGB hex). Set from melanin/undertone, or by the custom picker. */
  skinTone: string;
  /** Position on the skin-colour scale (0 very light .. 1 very dark) and undertone (-1 cool .. 1 warm). */
  skinMelanin: number;
  skinUndertone: number;
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
  /** Pores and subsurface glow (turn off on slow devices). */
  skinDetail: boolean;
  /** Studio (flattering, default) or shop (overhead fluorescent) lighting. */
  lighting: 'studio' | 'shop';
  /** How the ink is shown: fresh (just done), healed (default), aged (10+ years). */
  inkLook: 'fresh' | 'healed' | 'aged';
  debugOpen: boolean;
  ui: boolean;
  /** The design is selected: shows the on-body box with resize, rotate and delete handles. */
  selected: boolean;
  /** Apple Pencil mode: the Pencil edits the design, fingers only move the view. */
  pencilMode: boolean;
  /** One-off message shown over the 3D view (auto-hides). */
  notice: string | null;
  /** Undo / redo steps available (see history.ts). */
  history: { undo: number; redo: number };
  /** Last deleted design, for the "Design deleted" message. */
  deleted: { name: string } | null;
  /** Import dialog: closed, open, or open with a file dropped onto the page. */
  importDialog: { open: boolean; file?: File; edit?: boolean };
  camera: { preset: CameraPreset; nonce: number };
  // Readouts (written by the scene)
  /** Where the design currently sits, for the "frame design" camera. */
  focus: Placement | null;
  /** The skin directly behind the design (other side of the limb or body), for the "behind" camera. */
  focusOpposite: Placement | null;
  /** Size actually applied (band mode overrides width with the ring circumference), inches. */
  appliedSize: [number, number];
  metrics: DistortionStats | null;
  /** What the placement actually uses (auto mode picks per spot and size). */
  resolved: { method: 'expmap' | 'cylinder' | 'decal'; limbLabel: string | null };
  metricsNote: string;
  timings: Record<string, number>;
  status: string;
  errors: { time: string; message: string }[];
  set: (patch: Partial<AppState>) => void;
  logError: (message: string) => void;
  setTiming: (key: string, ms: number) => void;
  requestCamera: (preset: CameraPreset) => void;
  deleteDesign: () => void;
}

export const DEFAULT_HEIGHTS: Record<BodyId, number> = { male: 1.78, female: 1.65 };

export const useApp = create<AppState>((set) => ({
  mode: 'body',
  photo: null,
  photoAt: null,
  photoPxPerInch: null,
  photoCurve: 0.3,
  photoCalibrating: false,
  bodyId: 'male',
  clientHeight: DEFAULT_HEIGHTS.male,
  bodyWeight: 0.5,
  bodyMuscle: 0.5,
  bodyLocal: {},
  skinTone: skinHex({ melanin: 0.33, undertone: 0 }),
  skinMelanin: 0.33,
  skinUndertone: 0,
  method: 'auto',
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
  skinDetail: true,
  inkLook: 'healed',
  lighting: 'studio',
  debugOpen: false,
  ui: true,
  importDialog: { open: false },
  selected: true,
  pencilMode: savedPencilMode(),
  notice: null,
  deleted: null,
  history: { undo: 0, redo: 0 },
  camera: { preset: 'front', nonce: 0 },
  focus: null,
  focusOpposite: null,
  appliedSize: [3, 4],
  metrics: null,
  resolved: { method: 'expmap', limbLabel: null },
  metricsNote: '',
  timings: {},
  status: 'Loading body…',
  errors: [],
  set: (patch) => set(patch),
  logError: (message) =>
    set((s) => ({ errors: [...s.errors.slice(-49), { time: new Date().toISOString().slice(11, 19), message }] })),
  setTiming: (key, ms) => set((s) => ({ timings: { ...s.timings, [key]: ms } })),
  requestCamera: (preset) => set((s) => ({ camera: { preset, nonce: s.camera.nonce + 1 } })),
  deleteDesign: () =>
    set((s) =>
      s.design.kind === 'none'
        ? {}
        : {
            deleted: { name: s.design.name },
            design: { kind: 'none', name: '', aspect: 1 },
            selected: false,
          },
    ),
}));

/** State that goes into a share link (everything except uploaded images and readouts). */
const LINK_KEYS = [
  'bodyId', 'clientHeight', 'bodyWeight', 'bodyMuscle', 'skinTone', 'skinMelanin', 'skinUndertone', 'method', 'limbId', 'cylMode', 'band', 'slide', 'around', 'spot',
  'widthIn', 'heightIn', 'rotationDeg', 'mirror', 'opacity', 'showRegion', 'wireframe', 'skinDetail', 'inkLook', 'lighting', 'debugOpen', 'ui',
] as const;

export function stateToHash(s: AppState): string {
  const p = new URLSearchParams();
  for (const k of LINK_KEYS) p.set(k, String(s[k]));
  const shape = Object.entries(s.bodyLocal).filter(([, v]) => v !== 0);
  if (shape.length) p.set('shape', shape.map(([k, v]) => `${k}:${v}`).join(','));
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
  // A link with a skin-scale position but no explicit colour gets the colour from the scale.
  if ((p.has('skinMelanin') || p.has('skinUndertone')) && !p.has('skinTone')) {
    out.skinTone = skinHex({
      melanin: Number(p.get('skinMelanin') ?? defaults.skinMelanin),
      undertone: Number(p.get('skinUndertone') ?? defaults.skinUndertone),
    });
  }
  const shape = p.get('shape');
  if (shape) {
    const local: Record<string, number> = {};
    for (const part of shape.split(',')) {
      const [k, v] = part.split(':');
      if (k && Number.isFinite(Number(v))) local[k] = Number(v);
    }
    out.bodyLocal = local;
  }
  const at = p.get('at')?.split(',').map(Number);
  if (at && at.length === 6 && at.every(Number.isFinite)) {
    out.placement = { point: at.slice(0, 3) as Vec3, normal: at.slice(3) as Vec3 };
  }
  return out as Partial<AppState>;
}
