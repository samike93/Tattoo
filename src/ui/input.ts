import { getProjector } from '../placement/box';
import { useApp } from '../state';

/**
 * Touch, Apple Pencil and iPad handling.
 *
 * Convention (as in Procreate): once a Pencil is used, the Pencil works on the design and fingers
 * move the view. Finger taps then never place or drag the design, which doubles as palm rejection.
 * Without a Pencil, a finger can drag the design and two fingers on it pinch to resize and twist to
 * rotate.
 */

/** iPadOS Safari reports itself as a Mac ("desktop-class browsing"); touch support gives it away. */
export function isIPad(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

export const isTouchDevice = () => typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

const PENCIL_KEY = 'tattoo.pencilMode';

export function savedPencilMode(): boolean {
  try {
    return localStorage.getItem(PENCIL_KEY) === '1';
  } catch {
    return false;
  }
}

export function savePencilMode(on: boolean) {
  try {
    localStorage.setItem(PENCIL_KEY, on ? '1' : '0');
  } catch {
    /* private mode: fine, it just won't be remembered */
  }
}

/**
 * Global listeners (capture phase, so they run before the 3D view's own):
 * - the first Pencil touch switches Pencil mode on and explains it once;
 * - a Pencil never orbits the camera (it is for the design), so orbiting pauses while it is down.
 */
/** Type of the most recent pointer press ('mouse' | 'pen' | 'touch'); click events on older Safari lack it. */
export let lastPointerType = 'mouse';

export function installPenTracking(): () => void {
  let penPointers = 0;
  const down = (e: PointerEvent) => {
    lastPointerType = e.pointerType || 'mouse';
    if (e.pointerType !== 'pen') return;
    const st = useApp.getState();
    if (!st.pencilMode) {
      st.set({ pencilMode: true, notice: 'Apple Pencil detected: the Pencil places and moves the design, fingers turn and zoom the view.' });
      savePencilMode(true);
    }
    penPointers++;
    getProjector()?.setOrbitEnabled(false);
  };
  const up = (e: PointerEvent) => {
    if (e.pointerType !== 'pen' || penPointers === 0) return;
    penPointers--;
    if (penPointers === 0) getProjector()?.setOrbitEnabled(true);
  };
  window.addEventListener('pointerdown', down, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
  return () => {
    window.removeEventListener('pointerdown', down, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', up, true);
  };
}

/**
 * Two-finger pinch/twist on the design (when fingers may edit it). Starts when a second touch lands
 * while one finger is already dragging the design; scales from the change in finger distance and
 * rotates by the change in angle. Returns a stop function.
 */
export function trackPinch(first: PointerEvent, onActive: (active: boolean) => void): () => void {
  const pts = new Map<number, { x: number; y: number }>([[first.pointerId, { x: first.clientX, y: first.clientY }]]);
  let start: { d: number; a: number; w: number; h: number; rot: number } | null = null;
  const geom = () => {
    const [p, q] = [...pts.values()];
    return { d: Math.hypot(q.x - p.x, q.y - p.y), a: Math.atan2(q.y - p.y, q.x - p.x) };
  };
  const down = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || pts.size >= 2 || pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = geom();
    const s = useApp.getState();
    const [w, h] = s.mode === 'photo' ? [s.widthIn, s.heightIn] : s.appliedSize;
    start = { d: Math.max(g.d, 1), a: g.a, w, h, rot: s.rotationDeg };
    onActive(true);
  };
  const move = (e: PointerEvent) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!start || pts.size < 2) return;
    const g = geom();
    const k = g.d / start.d;
    const clamp = (v: number) => Math.round(Math.min(Math.max(v, 0.25), 30) * 100) / 100;
    let rot = start.rot - ((g.a - start.a) * 180) / Math.PI;
    rot = ((((rot + 180) % 360) + 360) % 360) - 180;
    useApp.getState().set({ widthIn: clamp(start.w * k), heightIn: clamp(start.h * k), rotationDeg: Math.round(rot) });
  };
  const stop = () => {
    window.removeEventListener('pointerdown', down, true);
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', up, true);
  };
  const up = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    if (start) {
      start = null;
      onActive(false);
    }
    // All fingers lifted: clean up even if the 3D view missed the end of the gesture.
    if (pts.size === 0) stop();
  };
  window.addEventListener('pointerdown', down, true);
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
  return stop;
}
