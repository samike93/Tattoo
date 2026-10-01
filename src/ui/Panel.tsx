import { useState, type ReactNode } from 'react';
import { exportImage, EXPORT_LONG_SIDE, type ExportView } from './Exporter';
import { LIMBS, type BodyId } from '../body/skeleton';
import { formatSize, INCH } from '../projection/design';
import { DEFAULT_HEIGHTS, useApp, type Method } from '../state';

const SKIN_TONES = ['#f4d8c4', '#e9bf9f', '#d9a57e', '#b47b52', '#8a5636', '#5c3720', '#3b2214'];

const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto (recommended)', hint: 'Follows the skin anywhere, and wraps around a limb when the design is wide or a full band.' },
  { id: 'expmap', label: 'Surface (exponential map)', hint: 'Low-distortion patch around the spot you tap. Best for back, chest, shoulders and limb patches.' },
  { id: 'cylinder', label: 'Cylindrical wrap', hint: 'Wraps around the limb axis. For bands and sleeve sections on arms, legs and the neck.' },
  { id: 'decal', label: 'Flat projection (three.js decal)', hint: 'The usual web method, for comparison. Stretches on curves and bleeds through limbs.' },
];
const METHOD_NAMES = { expmap: 'Surface wrap', cylinder: 'Cylindrical wrap', decal: 'Flat projection' };

export function Panel() {
  const s = useApp();
  const ft = Math.floor(s.clientHeight / 0.3048);
  const inch = Math.round((s.clientHeight / INCH) % 12);

  const setWidth = (w: number) => s.set(s.lockAspect ? { widthIn: w, heightIn: +(w / s.design.aspect).toFixed(2) } : { widthIn: w });
  const setHeight = (h: number) => s.set(s.lockAspect ? { heightIn: h, widthIn: +(h * s.design.aspect).toFixed(2) } : { heightIn: h });
  const setFeetInches = (f: number, i: number) => s.set({ clientHeight: (f * 12 + i) * INCH, placement: null });

  return (
    <aside className="panel">
      <header className="panel-head">
        <h1>Tattoo Preview</h1>
        <span className="tag">Phase 1</span>
      </header>

      <Section title="Body">
        <div className="seg">
          {(['male', 'female'] as BodyId[]).map((id) => (
            <button key={id} className={s.bodyId === id ? 'on' : ''} onClick={() => s.set({ bodyId: id, clientHeight: DEFAULT_HEIGHTS[id], placement: null })}>
              {id === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
        <label className="row">
          <span>Client height</span>
          <span className="inline">
            <input type="number" min={4} max={7} value={ft} onChange={(e) => setFeetInches(+e.target.value, inch)} /> ft
            <input type="number" min={0} max={11} value={inch} onChange={(e) => setFeetInches(ft, +e.target.value)} /> in
            <small>({(s.clientHeight * 100).toFixed(0)} cm)</small>
          </span>
        </label>
        <Slider label="Build" value={s.bodyWeight} min={0} max={1} step={0.05} fmt={(v) => (v < 0.35 ? 'Slim' : v > 0.65 ? 'Heavy' : 'Average')} onChange={(v) => s.set({ bodyWeight: v })} />
        <Slider label="Muscle" value={s.bodyMuscle} min={0} max={1} step={0.05} fmt={(v) => (v < 0.35 ? 'Soft' : v > 0.65 ? 'Muscular' : 'Average')} onChange={(v) => s.set({ bodyMuscle: v })} />
        <div className="swatches" role="radiogroup" aria-label="Skin tone">
          {SKIN_TONES.map((c) => (
            <button key={c} aria-label={`Skin tone ${c}`} className={s.skinTone === c ? 'on' : ''} style={{ background: c }} onClick={() => s.set({ skinTone: c })} />
          ))}
          <input type="color" aria-label="Custom skin tone" value={s.skinTone} onChange={(e) => s.set({ skinTone: e.target.value })} />
        </div>
      </Section>

      <Section title="Design">
        <div className="seg wrap">
          <button className="primary" onClick={() => s.set({ importDialog: { open: true } })}>{s.design.kind === 'image' ? 'Import another…' : 'Import design…'}</button>
          {s.design.original && <button onClick={() => s.set({ importDialog: { open: true, edit: true } })}>Edit background</button>}
          <button className={s.design.kind === 'checker' ? 'on' : ''} onClick={() => s.set({ design: { kind: 'checker', name: '1-inch checkerboard', aspect: s.widthIn / s.heightIn }, lockAspect: false })}>
            1-inch grid
          </button>
        </div>
        <p className="hint">{s.design.kind === 'image' ? s.design.name : 'PNG, JPG, SVG, PDF or Illustrator. You can also drop a file anywhere on the page.'}</p>
      </Section>

      <Section title="Placement">
        <p className="using">
          {METHOD_NAMES[s.resolved.method]}
          {s.resolved.limbLabel ? ` on the ${s.resolved.limbLabel.toLowerCase()}` : ''}
        </p>
        <p className="hint">Tap the body to place the design. Drag the design to move it.</p>
        {s.method !== 'cylinder' && (
          <div className="seg">
            <button className={!s.placement && s.spot === 'forearm' ? 'on' : ''} onClick={() => s.set({ spot: 'forearm', placement: null })}>Outer forearm</button>
            <button className={!s.placement && s.spot === 'shoulderBlade' ? 'on' : ''} onClick={() => s.set({ spot: 'shoulderBlade', placement: null })}>Shoulder blade</button>
          </div>
        )}
        {(s.resolved.limbLabel || s.method === 'cylinder') && s.method !== 'decal' && s.method !== 'expmap' && (
          <label className="check">
            <input type="checkbox" checked={s.band} onChange={(e) => s.set({ band: e.target.checked })} /> Full band (all the way around)
          </label>
        )}
      </Section>


      <Section title="Size and rotation">
        <Slider label="Width" value={s.widthIn} min={0.5} max={14} step={0.25} fmt={(v) => `${v} in`} onChange={setWidth} disabled={s.resolved.method === 'cylinder' && s.band} />
        <Slider label="Height" value={s.heightIn} min={0.5} max={14} step={0.25} fmt={(v) => `${v} in`} onChange={setHeight} />
        <Slider label="Rotation" value={s.rotationDeg} min={-180} max={180} step={1} fmt={(v) => `${v}°`} onChange={(v) => s.set({ rotationDeg: v })} disabled={s.resolved.method === 'cylinder' && s.band} />
        <Slider label="Opacity" value={s.opacity} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => s.set({ opacity: v })} />
        <div className="checks">
          <label className="check"><input type="checkbox" checked={s.lockAspect} onChange={(e) => s.set({ lockAspect: e.target.checked })} /> Lock aspect</label>
          <label className="check"><input type="checkbox" checked={s.mirror} onChange={(e) => s.set({ mirror: e.target.checked })} /> Mirror</label>
        </div>
        <p className="size">{formatSize(s.appliedSize[0] * INCH, s.appliedSize[1] * INCH)}</p>
      </Section>

      <Section title="View">
        <div className="seg wrap">
          {(['front', 'back', 'left', 'right', 'design', 'opposite'] as const).map((p) => (
            <button key={p} onClick={() => s.requestCamera(p)}>
              {p === 'design' ? 'Frame design' : p === 'opposite' ? 'Behind design' : p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="checks">
          <label className="check"><input type="checkbox" checked={s.showRegion} onChange={(e) => s.set({ showRegion: e.target.checked })} /> Show wrap region</label>
          <label className="check"><input type="checkbox" checked={s.skinDetail} onChange={(e) => s.set({ skinDetail: e.target.checked })} /> Skin detail</label>
          <label className="check"><input type="checkbox" checked={s.wireframe} onChange={(e) => s.set({ wireframe: e.target.checked })} /> Wireframe</label>
        </div>
      </Section>

      <Export />

      <details className="section advanced">
        <summary>Method (advanced)</summary>
        <div className="stack">
          {METHODS.map((m) => (
            <label key={m.id} className={`choice ${s.method === m.id ? 'on' : ''}`}>
              <input type="radio" name="method" checked={s.method === m.id} onChange={() => s.set({ method: m.id })} />
              <span>
                <b>{m.label}</b>
                <small>{m.hint}</small>
              </span>
            </label>
          ))}
        </div>
        {s.method === 'cylinder' && (
          <>
            <label className="row">
              <span>Limb</span>
              <select value={s.limbId} onChange={(e) => s.set({ limbId: e.target.value })}>
                {LIMBS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </label>
            <Slider label="Along the limb" value={s.slide} min={0} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => s.set({ slide: v })} />
            <Slider label="Around the limb" value={s.around} min={-180} max={180} step={1} fmt={(v) => `${v}°`} onChange={(v) => s.set({ around: v })} />
            <label className="row">
              <span>Circumference</span>
              <select value={s.cylMode} onChange={(e) => s.set({ cylMode: e.target.value as 'arc' | 'naive' })}>
                <option value="arc">Arc length (recommended)</option>
                <option value="naive">θ × r (textbook formula)</option>
              </select>
            </label>
          </>
        )}
        <Metrics />
      </details>
    </aside>
  );
}

const EXPORTS: { view: ExportView; label: string }[] = [
  { view: 'current', label: 'This view' },
  { view: 'front', label: 'Front' },
  { view: 'back', label: 'Back' },
  { view: 'design', label: 'Close-up' },
];

function Export() {
  const [busy, setBusy] = useState<ExportView | null>(null);
  const [note, setNote] = useState('');
  const save = async (view: ExportView) => {
    setBusy(view);
    setNote('');
    try {
      const blob = await exportImage(view);
      const name = `tattoo-preview-${view === 'design' ? 'close-up' : view}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      // On iPad and phones, the share sheet saves to Photos or sends to the client directly.
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ files: [file], title: 'Tattoo preview' });
        setNote('Shared.');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        setNote(`Saved ${name} (${EXPORT_LONG_SIDE} px).`);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setNote(`Couldn’t save the image: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Section title="Save images">
      <div className="seg wrap">
        {EXPORTS.map((x) => (
          <button key={x.view} onClick={() => save(x.view)} disabled={busy !== null}>
            {busy === x.view ? 'Saving…' : x.label}
          </button>
        ))}
      </div>
      <p className="hint">{note || `High-resolution PNG, ${EXPORT_LONG_SIDE} px on the long side.`}</p>
    </Section>
  );
}

function Metrics() {
  const m = useApp((s) => s.metrics);
  const note = useApp((s) => s.metricsNote);
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  const good = m && m.within5 > 0.9 && m.flippedFraction === 0;
  return (
    <div className="metrics">
      <h3>Distortion (live)</h3>
      {m ? (
        <>
          <p className={`verdict ${good ? 'ok' : 'bad'}`}>
            {pct(m.within5)} of the design within 5% of true size and square
          </p>
          <table className="kv">
            <tbody>
              <tr><td>Size error, mean / 95th pct</td><td>{pct(m.sizeErrMean)} / {pct(m.sizeErrP95)}</td></tr>
              <tr><td>Not square, mean / 95th pct</td><td>{pct(m.anisoMean)} / {pct(m.anisoP95)}</td></tr>
              <tr><td>Mirrored (bleed-through)</td><td>{pct(m.flippedFraction)}</td></tr>
              <tr><td>Skin area / design area</td><td>{(m.skinArea / m.designArea).toFixed(2)}×</td></tr>
            </tbody>
          </table>
        </>
      ) : (
        <p className="hint">Waiting for the body…</p>
      )}
      {note && <p className="hint">{note}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Slider(props: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className={`slider ${props.disabled ? 'disabled' : ''}`}>
      <span>
        {props.label} <output>{props.fmt(props.value)}</output>
      </span>
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(+e.target.value)} />
    </label>
  );
}
