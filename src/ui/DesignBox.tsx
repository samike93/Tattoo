import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { getBox, getProjector, onBox, type BoxGeometry, type HandleId } from '../placement/box';
import { useApp } from '../state';
import { beginGesture, endGesture } from '../history';

const CORNERS: HandleId[] = ['nw', 'ne', 'se', 'sw'];
const EDGES: HandleId[] = ['n', 'e', 's', 'w'];
const MIN_IN = 0.25;
const MAX_IN = 30;
const clampIn = (v: number) => Math.round(Math.min(Math.max(v, MIN_IN), MAX_IN) * 100) / 100;
const inches = (v: number) => String(Math.round(v * 100) / 100);

/** The live measurement under the box: size in inches and centimetres, and the angle if turned. */
export function sizeLabel(w: number, h: number, rot: number, band: boolean): string {
  const turned = !band && rot !== 0 ? `  ·  ${rot > 0 ? '↺' : '↻'} ${Math.abs(rot)}°` : '';
  return `${inches(w)} × ${inches(h)} in${turned}\n${(w * 2.54).toFixed(1)} × ${(h * 2.54).toFixed(1)} cm`;
}

type Grab = {
  kind: 'corner' | 'edge-x' | 'edge-y' | 'rotate';
  pointerId: number;
  c: { x: number; y: number };
  h0: { x: number; y: number };
  w0: number;
  hgt0: number;
  rot0: number;
};

/**
 * On-body selection box: handles at the design's corners and edges (positions come from the skin,
 * so they follow the wrap), a rotate knob above the top edge and a delete button. Dragging works in
 * screen space: corners scale proportionally, edge handles stretch one side, the knob rotates
 * (hold Shift to snap to 15°). Positions are updated every animation frame without React renders.
 */
export function DesignBox() {
  const selected = useApp((s) => s.selected);
  const kind = useApp((s) => s.design.kind);
  const importOpen = useApp((s) => s.importDialog.open);
  const [box, setBoxState] = useState<BoxGeometry | null>(getBox());
  const els = useRef<Partial<Record<HandleId | 'rotate' | 'trash' | 'label', HTMLElement | null>>>({});
  const grab = useRef<Grab | null>(null);
  const show = selected && kind !== 'none' && !!box && !importOpen;

  useEffect(() => onBox(setBoxState), []);

  // Follow the camera.
  useEffect(() => {
    if (!show || !box) return;
    let raf = 0;
    const place = (el: HTMLElement | null | undefined, x: number, y: number, visible: boolean) => {
      if (!el) return;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.visibility = visible ? 'visible' : 'hidden';
    };
    // Touch screens get bigger handles (styles.css), so the knob and bin sit further out.
    const touch = document.documentElement.classList.contains('touch');
    const knobGap = touch ? 50 : 34;
    const binGap = touch ? 48 : 30;
    const labelGap = touch ? 36 : 30; // to the label's centre
    const minGap = touch ? 52 : 42; // corner + edge hit radii
    const tick = () => {
      const pj = getProjector();
      if (pj) {
        const c = pj.project(box.center.point, box.center.normal);
        const screen: Partial<Record<HandleId, { x: number; y: number; visible: boolean }>> = {};
        for (const id of [...CORNERS, ...EDGES]) {
          const h = box.handles[id];
          if (!h) {
            place(els.current[id], 0, 0, false);
            continue;
          }
          screen[id] = pj.project(h.point, h.normal);
        }
        // Small on screen: the edge handles' hit areas would cover the corners, so show corners only.
        const near = (a?: { x: number; y: number }, b?: { x: number; y: number }) => !!a && !!b && Math.hypot(a.x - b.x, a.y - b.y) < minGap;
        const crowded = !box.band && (near(screen.n, screen.ne) || near(screen.e, screen.ne) || near(screen.s, screen.sw) || near(screen.w, screen.sw));
        for (const id of [...CORNERS, ...EDGES]) {
          const s = screen[id];
          if (s) place(els.current[id], s.x, s.y, s.visible && !(crowded && EDGES.includes(id)));
        }
        // Rotate knob: beyond the top edge, along the centre -> top direction on screen.
        const n = screen.n;
        if (n && !box.band) {
          const dx = n.x - c.x, dy = n.y - c.y, L = Math.hypot(dx, dy) || 1;
          place(els.current.rotate, n.x + (dx / L) * knobGap, n.y + (dy / L) * knobGap, n.visible);
        } else place(els.current.rotate, 0, 0, false);
        // Size label: centred under the lowest visible point of the box, so it never overlaps it.
        const label = els.current.label;
        const shown = Object.values(screen).filter((p) => p.visible);
        if (label && shown.length) {
          const bottom = Math.max(...shown.map((p) => p.y));
          place(label, c.x, bottom + labelGap, c.visible);
          const st = useApp.getState();
          const text = sizeLabel(st.appliedSize[0], st.appliedSize[1], st.rotationDeg, box.band);
          if (label.textContent !== text) label.textContent = text;
        } else place(label, 0, 0, false);
        // Delete: just outside the top-right corner (top edge for bands).
        const t = screen.ne ?? screen.n;
        if (t) {
          const dx = t.x - c.x, dy = t.y - c.y, L = Math.hypot(dx, dy) || 1;
          place(els.current.trash, t.x + (dx / L) * binGap, t.y + (dy / L) * binGap, t.visible);
        } else place(els.current.trash, 0, 0, false);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [show, box]);

  const start = (e: RPointerEvent<HTMLElement>, id: HandleId | 'rotate') => {
    const pj = getProjector();
    if (!pj || !box) return;
    if (useApp.getState().pencilMode && e.pointerType === 'touch') {
      // Pencil mode: handles are for the Pencil; a finger (or palm) on one turns the view instead.
      // Small designs are mostly covered by handle hit areas, so pass the touch on to the 3D view.
      e.stopPropagation();
      document.querySelector('.stage canvas')?.dispatchEvent(new PointerEvent('pointerdown', e.nativeEvent));
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    (document.activeElement as HTMLElement | null)?.blur?.(); // so Delete and Escape reach the page
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = useApp.getState();
    const c = pj.project(box.center.point);
    const r = e.currentTarget.getBoundingClientRect();
    const h0 = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    grab.current = {
      kind: id === 'rotate' ? 'rotate' : CORNERS.includes(id) ? 'corner' : id === 'e' || id === 'w' ? 'edge-x' : 'edge-y',
      pointerId: e.pointerId,
      c,
      h0,
      w0: s.appliedSize[0],
      hgt0: s.appliedSize[1],
      rot0: s.rotationDeg,
    };
    pj.setOrbitEnabled(false);
    beginGesture();
  };

  const move = (e: RPointerEvent<HTMLElement>) => {
    const g = grab.current;
    if (!g || e.pointerId !== g.pointerId) return;
    const px = e.clientX - g.c.x, py = e.clientY - g.c.y;
    const hx = g.h0.x - g.c.x, hy = g.h0.y - g.c.y;
    const hl = Math.hypot(hx, hy) || 1;
    const app = useApp.getState();
    if (g.kind === 'rotate') {
      const delta = ((Math.atan2(py, px) - Math.atan2(hy, hx)) * 180) / Math.PI;
      // Screen y points down, so a clockwise drag on screen is a clockwise turn of the design.
      let rot = g.rot0 - delta;
      if (e.shiftKey) rot = Math.round(rot / 15) * 15;
      rot = ((((rot + 180) % 360) + 360) % 360) - 180;
      app.set({ rotationDeg: Math.round(rot) });
      return;
    }
    if (g.kind === 'corner') {
      const k = Math.hypot(px, py) / hl;
      app.set({ widthIn: clampIn(g.w0 * k), heightIn: clampIn(g.hgt0 * k) });
      return;
    }
    // Edge: how far along the centre -> handle direction the pointer is.
    const k = Math.max((px * hx + py * hy) / (hl * hl), 0.02);
    if (g.kind === 'edge-x') app.set({ widthIn: clampIn(g.w0 * k), lockAspect: false });
    else app.set({ heightIn: clampIn(g.hgt0 * k), lockAspect: false });
  };

  const end = (e: RPointerEvent<HTMLElement>) => {
    if (!grab.current || e.pointerId !== grab.current.pointerId) return;
    grab.current = null;
    getProjector()?.setOrbitEnabled(true);
    endGesture();
  };

  if (!show || !box) return null;
  const handle = (id: HandleId, cls: string, label: string) => (
    <div
      key={id}
      ref={(el) => void (els.current[id] = el)}
      className={`box-handle ${cls} h-${id}`}
      role="slider"
      aria-label={label}
      aria-valuenow={0}
      onPointerDown={(e) => start(e, id)}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
  return (
    <div className="design-box" aria-label="Design handles">
      {!box.band && CORNERS.map((id) => handle(id, 'corner', 'Resize design (keeps proportions)'))}
      {EDGES.map((id) => (box.band && (id === 'e' || id === 'w') ? null : handle(id, 'edge', id === 'e' || id === 'w' ? 'Stretch width' : 'Stretch height')))}
      {!box.band && (
        <div
          ref={(el) => void (els.current.rotate = el)}
          className="box-handle rotate"
          role="slider"
          aria-label="Rotate design (Shift snaps to 15°)"
          aria-valuenow={0}
          onPointerDown={(e) => start(e, 'rotate')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      )}
      <div ref={(el) => void (els.current.label = el)} className="box-size" aria-live="polite" />
      <button
        ref={(el) => void (els.current.trash = el)}
        className="box-handle trash"
        aria-label="Delete design (Delete key)"
        title="Delete (Delete key)"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => useApp.getState().deleteDesign()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}
