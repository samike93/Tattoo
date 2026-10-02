import { useEffect, useMemo, useReducer, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp, type AppState } from '../state';
import { beginGesture, endGesture } from '../history';
import { trackPinch } from '../ui/input';
import { sizeLabel } from '../ui/DesignBox';
import { drawChecker } from '../phase0/checker';
import { designToPhoto, estimatedPxPerInch, fitView, photoToDesign, type PhotoDesign, type PhotoView } from './geometry';
import { PhotoRenderer } from './photoRenderer';
import { AREA_AGING } from '../ink/aging';
import { loadPhoto } from './loadPhoto';

type Corner = 'nw' | 'ne' | 'se' | 'sw';
const CORNER_UV: Record<Corner, [number, number]> = { nw: [0, 0], ne: [1, 0], se: [1, 1], sw: [0, 1] };
const clampIn = (v: number) => Math.round(Math.min(Math.max(v, 0.25), 30) * 100) / 100;

/** The design's placement on the photo, from app state. */
export function photoDesign(s: Pick<AppState, 'photo' | 'photoAt' | 'photoPxPerInch' | 'photoCurve' | 'widthIn' | 'heightIn' | 'rotationDeg' | 'mirror'>): PhotoDesign | null {
  if (!s.photo) return null;
  const { width: pw, height: ph } = s.photo.canvas;
  const ppi = s.photoPxPerInch ?? estimatedPxPerInch(pw, ph);
  return {
    at: s.photoAt ?? [pw / 2, ph / 2],
    w: s.widthIn * ppi,
    h: s.heightIn * ppi,
    rotation: (s.rotationDeg * Math.PI) / 180,
    curve: s.photoCurve,
    mirror: s.mirror,
  };
}

/** Open a client photo and switch to photo mode. */
export async function choosePhoto(file: File) {
  const app = useApp.getState();
  try {
    const canvas = await loadPhoto(file);
    app.set({ photo: { canvas, name: file.name }, photoAt: null, photoPxPerInch: null, photoCalibrating: false, mode: 'photo', selected: true });
  } catch (e) {
    app.set({ notice: (e as Error).message });
  }
}

let exportFn: (() => Promise<Blob>) | null = null;
/** The photo with the design, at the photo's full resolution. */
export function exportPhoto(): Promise<Blob> {
  return exportFn ? exportFn() : Promise.reject(new Error('Open a photo first'));
}

export function PhotoStage() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<PhotoRenderer | null>(null);
  const [size, setSize] = useState<[number, number]>([1, 1]);
  const [zoomPan, setZoomPan] = useState<{ zoom: number; pan: [number, number] }>({ zoom: 1, pan: [0, 0] });
  const [calib, setCalib] = useState<[number, number][]>([]);
  const [calibLen, setCalibLen] = useState('');
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  const s = useApp(
    useShallow((a: AppState) => ({
      photo: a.photo, photoAt: a.photoAt, photoPxPerInch: a.photoPxPerInch, photoCurve: a.photoCurve, photoCalibrating: a.photoCalibrating,
      widthIn: a.widthIn, heightIn: a.heightIn, rotationDeg: a.rotationDeg, mirror: a.mirror, design: a.design, inkLook: a.inkLook,
      opacity: a.opacity, selected: a.selected, pencilMode: a.pencilMode, photoArea: a.photoArea,
    })),
  );
  const d = photoDesign(s);
  const view: PhotoView | null = s.photo ? fitView(s.photo.canvas.width, s.photo.canvas.height, size[0], size[1], zoomPan.zoom, zoomPan.pan) : null;
  const ink = useMemo(() => {
    if (s.design.kind === 'none') return null;
    if (s.design.kind === 'checker') return { key: `checker:${s.widthIn}x${s.heightIn}`, canvas: drawChecker(s.widthIn, s.heightIn) };
    return { key: `image:${s.design.name}:${s.design.canvas!.width}x${s.design.canvas!.height}`, canvas: s.design.canvas! };
  }, [s.design, s.widthIn, s.heightIn]);

  // Stage size.
  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => setSize([Math.max(1, el.clientWidth), Math.max(1, el.clientHeight)]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Renderer lifetime.
  useEffect(() => {
    renderer.current = new PhotoRenderer(canvasRef.current!);
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);

  // Draw.
  useEffect(() => {
    const r = renderer.current;
    if (!r || !s.photo || !d || !view) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ppi = s.photoPxPerInch ?? estimatedPxPerInch(s.photo.canvas.width, s.photo.canvas.height);
    const frame = { photo: s.photo.canvas, ink, design: d, pxPerMm: ppi / 25.4, look: s.inkLook, areaFactor: AREA_AGING[s.photoArea].factor, opacity: s.opacity, view };
    r.render(frame, Math.round(size[0] * dpr), Math.round(size[1] * dpr), dpr);
    exportFn = async () => {
      const { width: pw, height: ph } = s.photo!.canvas;
      try {
        r.render({ ...frame, view: { scale: 1, ox: 0, oy: 0 } }, pw, ph, 1);
        return await new Promise<Blob>((res, rej) => r.renderer.domElement.toBlob((b) => (b ? res(b) : rej(new Error('The browser could not encode the image'))), 'image/png'));
      } finally {
        r.render(frame, Math.round(size[0] * dpr), Math.round(size[1] * dpr), dpr);
      }
    };
  });
  useEffect(() => () => void (exportFn = null), []);

  // Screen <-> photo.
  const toPhoto = (clientX: number, clientY: number): [number, number] => {
    const rect = wrap.current!.getBoundingClientRect();
    return [(clientX - rect.left - view!.ox) / view!.scale, (clientY - rect.top - view!.oy) / view!.scale];
  };
  const toScreen = (p: [number, number]): [number, number] => [p[0] * view!.scale + view!.ox, p[1] * view!.scale + view!.oy];

  // Test hook: where a photo pixel is on screen.
  useEffect(() => {
    const t = (window as unknown as { tattoo?: Record<string, unknown> }).tattoo;
    if (!t) return;
    t.photoToClient = (p: [number, number]) => {
      if (!view || !wrap.current) return null;
      const rect = wrap.current.getBoundingClientRect();
      const [x, y] = toScreen(p);
      return { x: rect.left + x, y: rect.top + y };
    };
    t.photoDesign = () => photoDesign(useApp.getState());
  });

  // Gestures on the photo.
  const g = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    drag?: { id: number; offset: [number, number]; pinching?: boolean; stopPinch?: () => void };
    pan?: { id: number; x: number; y: number; pan0: [number, number]; moved: boolean };
    pinch?: { d0: number; zoom0: number; mid: [number, number]; photoMid: [number, number] };
  }>({ pointers: new Map() });

  const setView = (zoom: number, anchorScreen: [number, number], anchorPhoto: [number, number]) => {
    if (!s.photo) return;
    const z = Math.min(Math.max(zoom, 1), 8);
    const v = fitView(s.photo.canvas.width, s.photo.canvas.height, size[0], size[1], z, [0, 0]);
    // Keep the anchor photo point under the anchor screen point.
    const pan: [number, number] = [anchorScreen[0] - anchorPhoto[0] * v.scale - v.ox, anchorScreen[1] - anchorPhoto[1] * v.scale - v.oy];
    setZoomPan({ zoom: z, pan: z === 1 ? [0, 0] : pan });
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!s.photo || !view) return;
    const st = g.current;
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = toPhoto(e.clientX, e.clientY);
    if (s.photoCalibrating) {
      setCalib((c) => (c.length >= 2 ? [p] : [...c, p]));
      return;
    }
    const rect = wrap.current!.getBoundingClientRect();
    if (st.pointers.size === 2 && !st.drag) {
      // Two fingers off the design: zoom the photo.
      const [a, b] = [...st.pointers.values()];
      const mid: [number, number] = [(a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top];
      st.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom0: zoomPan.zoom, mid, photoMid: toPhoto((a.x + b.x) / 2, (a.y + b.y) / 2) };
      st.pan = undefined;
      return;
    }
    if (st.pointers.size > 1) return;
    const fingerOnly = s.pencilMode && e.pointerType === 'touch'; // Pencil mode: fingers move the view
    const onDesign = d && s.design.kind !== 'none' && photoToDesign(d, p[0], p[1], 0.02);
    if (onDesign && !fingerOnly) {
      e.currentTarget.setPointerCapture(e.pointerId);
      beginGesture();
      st.drag = { id: e.pointerId, offset: [d!.at[0] - p[0], d!.at[1] - p[1]] };
      if (e.pointerType === 'touch') {
        const drag = st.drag;
        drag.stopPinch = trackPinch(e.nativeEvent, (active) => (drag.pinching = active));
      }
      if (!useApp.getState().selected) useApp.getState().set({ selected: true });
      return;
    }
    st.pan = { id: e.pointerId, x: e.clientX, y: e.clientY, pan0: zoomPan.pan, moved: false };
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const st = g.current;
    if (!st.pointers.has(e.pointerId)) return;
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (st.pinch && st.pointers.size === 2) {
      const [a, b] = [...st.pointers.values()];
      setView(st.pinch.zoom0 * (Math.hypot(a.x - b.x, a.y - b.y) / st.pinch.d0), st.pinch.mid, st.pinch.photoMid);
      return;
    }
    if (st.drag && st.drag.id === e.pointerId && !st.drag.pinching && s.photo) {
      const p = toPhoto(e.clientX, e.clientY);
      const { width: pw, height: ph } = s.photo.canvas;
      const at: [number, number] = [Math.min(Math.max(p[0] + st.drag.offset[0], 0), pw), Math.min(Math.max(p[1] + st.drag.offset[1], 0), ph)];
      useApp.getState().set({ photoAt: [Math.round(at[0] * 10) / 10, Math.round(at[1] * 10) / 10] });
      return;
    }
    if (st.pan && st.pan.id === e.pointerId) {
      const dx = e.clientX - st.pan.x, dy = e.clientY - st.pan.y;
      if (Math.hypot(dx, dy) > 6) st.pan.moved = true;
      if (st.pan.moved && zoomPan.zoom > 1) setZoomPan({ zoom: zoomPan.zoom, pan: [st.pan.pan0[0] + dx, st.pan.pan0[1] + dy] });
    }
  };

  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    const st = g.current;
    st.pointers.delete(e.pointerId);
    if (st.pointers.size < 2) st.pinch = undefined;
    if (st.drag && st.drag.id === e.pointerId) {
      st.drag.stopPinch?.();
      st.drag = undefined;
      endGesture();
      return;
    }
    if (st.pan && st.pan.id === e.pointerId) {
      const tap = !st.pan.moved;
      st.pan = undefined;
      if (!tap || !s.photo) return;
      // A tap on the photo (not on the design): put the design there.
      const app = useApp.getState();
      if (app.design.kind === 'none') {
        app.set({ notice: 'Import a design (or press Undo) to place it.' });
        return;
      }
      if (s.pencilMode && e.pointerType === 'touch') return;
      const p = toPhoto(e.clientX, e.clientY);
      const { width: pw, height: ph } = s.photo.canvas;
      if (p[0] < 0 || p[1] < 0 || p[0] > pw || p[1] > ph) {
        app.set({ selected: false });
        return;
      }
      app.set({ photoAt: [Math.round(p[0]), Math.round(p[1])], selected: true });
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!s.photo) return;
    const rect = wrap.current!.getBoundingClientRect();
    setView(zoomPan.zoom * Math.exp(-e.deltaY * 0.002), [e.clientX - rect.left, e.clientY - rect.top], toPhoto(e.clientX, e.clientY));
  };

  // Selection box handles (screen space, like the 3D view's box).
  const grab = useRef<{ kind: Corner | 'rotate'; id: number; c: [number, number]; h0: [number, number]; w0: number; hgt0: number; rot0: number } | null>(null);
  const startHandle = (e: RPointerEvent<HTMLElement>, kind: Corner | 'rotate', at: [number, number]) => {
    if (s.pencilMode && e.pointerType === 'touch') return; // let fingers reach the photo
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    beginGesture();
    const st = useApp.getState();
    grab.current = { kind, id: e.pointerId, c: toScreen(d!.at), h0: at, w0: st.widthIn, hgt0: st.heightIn, rot0: st.rotationDeg };
  };
  const moveHandle = (e: RPointerEvent<HTMLElement>) => {
    const gr = grab.current;
    if (!gr || gr.id !== e.pointerId) return;
    const rect = wrap.current!.getBoundingClientRect();
    const px = e.clientX - rect.left - gr.c[0], py = e.clientY - rect.top - gr.c[1];
    const hx = gr.h0[0] - gr.c[0], hy = gr.h0[1] - gr.c[1];
    if (gr.kind === 'rotate') {
      let rot = gr.rot0 - ((Math.atan2(py, px) - Math.atan2(hy, hx)) * 180) / Math.PI;
      if (e.shiftKey) rot = Math.round(rot / 15) * 15;
      rot = ((((rot + 180) % 360) + 360) % 360) - 180;
      useApp.getState().set({ rotationDeg: Math.round(rot) });
    } else {
      const k = Math.hypot(px, py) / (Math.hypot(hx, hy) || 1);
      useApp.getState().set({ widthIn: clampIn(gr.w0 * k), heightIn: clampIn(gr.hgt0 * k) });
    }
  };
  const endHandle = (e: RPointerEvent<HTMLElement>) => {
    if (!grab.current || grab.current.id !== e.pointerId) return;
    grab.current = null;
    endGesture();
  };

  useEffect(() => {
    if (!s.photoCalibrating) {
      setCalib([]);
      setCalibLen('');
    }
  }, [s.photoCalibrating]);
  useEffect(() => redraw(), [size]);

  const showBox = !!(d && view && s.selected && s.design.kind !== 'none' && !s.photoCalibrating);
  const outline = showBox
    ? [
        ...Array.from({ length: 17 }, (_, i) => designToPhoto(d!, i / 16, 0)),
        ...Array.from({ length: 17 }, (_, i) => designToPhoto(d!, 1 - i / 16, 1)),
      ].map((p) => toScreen(p).join(',')).join(' ')
    : '';
  const corners = showBox ? (Object.keys(CORNER_UV) as Corner[]).map((k) => [k, toScreen(designToPhoto(d!, ...CORNER_UV[k]))] as const) : [];
  let knob: [number, number] | null = null, bin: [number, number] | null = null, label: [number, number] | null = null;
  if (showBox) {
    const c = toScreen(d!.at);
    const top = toScreen(designToPhoto(d!, 0.5, 0));
    const ne = corners.find(([k]) => k === 'ne')![1];
    const out = (p: [number, number], gap: number): [number, number] => {
      const dx = p[0] - c[0], dy = p[1] - c[1], L = Math.hypot(dx, dy) || 1;
      return [p[0] + (dx / L) * gap, p[1] + (dy / L) * gap];
    };
    knob = out(top, 40);
    bin = out(ne, 40);
    label = [c[0], Math.max(...corners.map(([, q]) => q[1]), toScreen(designToPhoto(d!, 0.5, 1))[1]) + 34];
  }
  const fixed = (p: [number, number]) => {
    const rect = wrap.current?.getBoundingClientRect();
    return { transform: `translate(${(rect?.left ?? 0) + p[0]}px, ${(rect?.top ?? 0) + p[1]}px)`, visibility: 'visible' as const };
  };

  return (
    <div
      ref={wrap}
      className="photo-stage"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <canvas ref={canvasRef} className="photo-canvas" />
      {!s.photo && (
        <div className="photo-empty">
          <p>Take or choose a photo of the client’s skin where the tattoo will go.</p>
          <label className="primary photo-pick">
            Take or choose photo
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && choosePhoto(e.target.files[0])} />
          </label>
          <small>The photo stays on this device.</small>
        </div>
      )}
      {showBox && (
        <>
          <svg className="photo-outline" width={size[0]} height={size[1]} aria-hidden="true">
            <polygon points={outline} />
          </svg>
          {corners.map(([k, p]) => (
            <div key={k} className={`box-handle corner h-${k}`} style={fixed(p)} role="slider" aria-label="Resize design (keeps proportions)" aria-valuenow={0}
              onPointerDown={(e) => startHandle(e, k, p)} onPointerMove={moveHandle} onPointerUp={endHandle} onPointerCancel={endHandle} />
          ))}
          <div className="box-handle rotate" style={fixed(knob!)} role="slider" aria-label="Rotate design (Shift snaps to 15°)" aria-valuenow={0}
            onPointerDown={(e) => startHandle(e, 'rotate', knob!)} onPointerMove={moveHandle} onPointerUp={endHandle} onPointerCancel={endHandle}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <button className="box-handle trash" style={fixed(bin!)} aria-label="Delete design (Delete key)" title="Delete (Delete key)"
            onPointerDown={(e) => e.stopPropagation()} onClick={() => useApp.getState().deleteDesign()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="box-size" style={fixed(label!)}>
            {(s.photoPxPerInch ? '' : '≈ ') + sizeLabel(s.widthIn, s.heightIn, s.rotationDeg, false)}
          </div>
        </>
      )}
      {s.photoCalibrating && view && (
        <>
          <div className="toast notice photo-calib-help">
            {calib.length < 2 ? `Tap two points a known distance apart (${calib.length}/2), e.g. the ends of a ruler or tape in the photo.` : 'How far apart are they?'}
            <button onClick={() => useApp.getState().set({ photoCalibrating: false })}>Cancel</button>
          </div>
          <svg className="photo-outline calib" width={size[0]} height={size[1]} aria-hidden="true">
            {calib.length === 2 && <line x1={toScreen(calib[0])[0]} y1={toScreen(calib[0])[1]} x2={toScreen(calib[1])[0]} y2={toScreen(calib[1])[1]} />}
            {calib.map((p, i) => <circle key={i} cx={toScreen(p)[0]} cy={toScreen(p)[1]} r={7} />)}
          </svg>
          {calib.length === 2 && (
            <form
              className="photo-calib-form"
              style={{ left: (toScreen(calib[0])[0] + toScreen(calib[1])[0]) / 2, top: (toScreen(calib[0])[1] + toScreen(calib[1])[1]) / 2 + 18 }}
              onPointerDown={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                const len = parseFloat(calibLen);
                const dist = Math.hypot(calib[1][0] - calib[0][0], calib[1][1] - calib[0][1]);
                if (!(len > 0) || dist < 5) return;
                useApp.getState().set({ photoPxPerInch: dist / len, photoCalibrating: false, notice: `Scale set: ${len} in = ${Math.round(dist)} px. Sizes on this photo are now true to size.` });
              }}
            >
              <input type="number" inputMode="decimal" min={0.1} step={0.1} autoFocus placeholder="inches" value={calibLen} onChange={(e) => setCalibLen(e.target.value)} aria-label="Distance in inches" />
              <span>in</span>
              <button type="submit" className="primary">Set</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
