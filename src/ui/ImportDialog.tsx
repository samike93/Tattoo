import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { ImportError } from '../import/detect';
import { openDesignFile, type PdfSource } from '../import/rasterize';
import { canvasToImage, imageToCanvas, removeBackgroundAsync, scaledCopy, Superseded } from '../bgremove/client';
import { DEFAULT_OPTIONS, type BgMode, type BgOptions, type BgResult } from '../bgremove/pipeline';
import { useApp } from '../state';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.ai,.svg,.pdf';
const PREVIEW_SIDE = 1200;

const MODES: { id: BgMode | 'auto'; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Picks a mode from the image.' },
  { id: 'lineart', label: 'Line art', hint: 'Black and grey artwork on white. White between lines clears too, so skin shows through.' },
  { id: 'outer', label: 'Outer background', hint: 'Colour designs with intentional white ink: only the background around the design clears.' },
  { id: 'colorkey', label: 'Colour key', hint: 'Design on a coloured background. Tap the original to pick the colour to remove.' },
  { id: 'keep', label: 'Keep as is', hint: 'The file already has a transparent background.' },
];

type Stage = { kind: 'pick' } | { kind: 'pages'; source: PdfSource } | { kind: 'clean'; name: string; original: HTMLCanvasElement } | { kind: 'busy'; message: string };

export function ImportDialog() {
  const dialog = useApp((s) => s.importDialog);
  const design = useApp((s) => s.design);
  const [stage, setStage] = useState<Stage>({ kind: 'pick' });
  const [error, setError] = useState('');
  const close = () => {
    if (stage.kind === 'pages') stage.source.close();
    setStage({ kind: 'pick' });
    setError('');
    useApp.getState().set({ importDialog: { open: false } });
  };

  const openFile = async (file: File) => {
    setError('');
    setStage({ kind: 'busy', message: `Reading ${file.name}…` });
    try {
      const opened = await openDesignFile(file);
      if (opened.kind === 'pages') setStage({ kind: 'pages', source: opened.source });
      else setStage({ kind: 'clean', name: opened.design.name, original: opened.design.canvas });
    } catch (e) {
      setStage({ kind: 'pick' });
      setError(e instanceof ImportError ? e.userMessage : `Couldn’t open ${file.name}: ${String(e)}`);
      // Expected problems (wrong type, old .ai) are explained in the dialog; log only surprises.
      if (!(e instanceof ImportError) || e.message !== e.userMessage) useApp.getState().logError(`Import: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  useEffect(() => {
    if (!dialog.open) return;
    if (dialog.file) void openFile(dialog.file);
    else if (dialog.edit && design.original) setStage({ kind: 'clean', name: design.name, original: design.original });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  if (!dialog.open) return null;
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <header className="modal-head">
          <h2 id="import-title">{stage.kind === 'clean' ? 'Remove background' : stage.kind === 'pages' ? 'Choose a page' : 'Import a design'}</h2>
          <button className="icon" onClick={close} aria-label="Close">×</button>
        </header>
        {error && <p className="error" role="alert">{error}</p>}
        {stage.kind === 'pick' && <DropZone onFile={openFile} />}
        {stage.kind === 'busy' && <p className="busy">{stage.message}</p>}
        {stage.kind === 'pages' && (
          <Pages
            source={stage.source}
            onPick={async (i) => {
              setStage({ kind: 'busy', message: `Rendering page ${i + 1}…` });
              try {
                const d = await stage.source.render(i);
                stage.source.close();
                setStage({ kind: 'clean', name: d.name, original: d.canvas });
              } catch (e) {
                setStage({ kind: 'pick' });
                setError(`Couldn’t render that page: ${String(e)}`);
              }
            }}
          />
        )}
        {stage.kind === 'clean' && <Clean name={stage.name} original={stage.original} initial={dialog.edit ? design.bgOptions : undefined} onDone={close} />}
      </div>
    </div>
  );
}

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };
  return (
    <div
      className={`drop ${over ? 'over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <p><b>Drop a design here</b></p>
      <p className="hint">PNG, JPG, WEBP, SVG, PDF or Illustrator (.ai). Files stay on this device.</p>
      <button className="primary" onClick={() => input.current?.click()}>Choose a file…</button>
      <input
        ref={input}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

function Pages({ source, onPick }: { source: PdfSource; onPick: (i: number) => void }) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const count = Math.min(source.pageCount, 48);
  useEffect(() => {
    let alive = true;
    (async () => {
      for (let i = 0; i < count && alive; i++) {
        const c = await source.thumbnail(i, 220);
        if (alive) setThumbs((t) => [...t, c.toDataURL()]);
      }
    })().catch((e) => useApp.getState().logError(`Page thumbnails: ${String(e)}`));
    return () => {
      alive = false;
    };
  }, [source, count]);
  return (
    <>
      <p className="hint">
        {source.name} has {source.pageCount} {source.format === 'ai-pdf' ? 'artboards' : 'pages'}
        {source.pageCount > count ? ` (showing the first ${count})` : ''}. Pick one.
      </p>
      <div className="pages">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} className="page" onClick={() => onPick(i)}>
            {thumbs[i] ? <img src={thumbs[i]} alt={`Page ${i + 1}`} /> : <span className="hint">…</span>}
            <span>{i + 1}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function Clean({ name, original, initial, onDone }: { name: string; original: HTMLCanvasElement; initial?: Partial<BgOptions>; onDone: () => void }) {
  const [opts, setOpts] = useState<BgOptions>({ ...DEFAULT_OPTIONS, ...initial });
  const [result, setResult] = useState<BgResult | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const preview = useMemo(() => scaledCopy(original, PREVIEW_SIDE), [original]);
  const previewImage = useMemo(() => canvasToImage(preview), [preview]);
  const beforeUrl = useMemo(() => preview.toDataURL(), [preview]);
  const afterUrl = useMemo(() => (result ? imageToCanvas(result.image).toDataURL() : ''), [result]);
  const set = (patch: Partial<BgOptions>) => setOpts((o) => ({ ...o, ...patch }));

  useEffect(() => {
    const t = setTimeout(() => {
      setWorking(true);
      removeBackgroundAsync(previewImage, opts)
        .then((r) => {
          setResult(r);
          setWorking(false);
        })
        .catch((e) => {
          if (e instanceof Superseded) return;
          setWorking(false);
          setError(String(e));
        });
    }, 120);
    return () => clearTimeout(t);
  }, [opts, previewImage]);

  const fullRes = async () => {
    setWorking(true);
    const scale = original.width / preview.width;
    // Despeckle is relative to image area, so it carries over; feather is in pixels, so scale it.
    const r = await removeBackgroundAsync(canvasToImage(original), { ...opts, feather: opts.feather * scale });
    setWorking(false);
    return imageToCanvas(r.image);
  };

  const use = async (skip = false) => {
    try {
      const canvas = skip ? original : await fullRes();
      const s = useApp.getState();
      const aspect = canvas.width / canvas.height;
      s.set({
        design: { kind: 'image', name, aspect, canvas, original, bgOptions: skip ? { mode: 'keep' } : opts },
        heightIn: +(s.widthIn / aspect).toFixed(2),
        lockAspect: true,
      });
      onDone();
    } catch (e) {
      if (!(e instanceof Superseded)) setError(String(e));
    }
  };

  const download = async () => {
    try {
      const c = await fullRes();
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `${name.replace(/\.[a-z0-9]+$/i, '')}-transparent.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }, 'image/png');
    } catch (e) {
      if (!(e instanceof Superseded)) setError(String(e));
    }
  };

  const pickColor = (e: React.MouseEvent<HTMLImageElement>) => {
    if (opts.mode !== 'colorkey') return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * preview.width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * preview.height);
    const d = preview.getContext('2d')!.getImageData(x, y, 1, 1).data;
    set({ keyColor: [d[0], d[1], d[2]] });
  };

  const modeUsed = result?.mode;
  return (
    <>
      <div className="compare">
        <figure>
          <figcaption>Original</figcaption>
          <div className="checker">
            <img src={beforeUrl} alt="Original design" onClick={pickColor} className={opts.mode === 'colorkey' ? 'pick' : ''} />
          </div>
        </figure>
        <figure>
          <figcaption>
            Result {working && <span className="hint">· working…</span>}
          </figcaption>
          <div className="checker">{afterUrl && <img src={afterUrl} alt="Design with background removed" />}</div>
        </figure>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="seg wrap" role="radiogroup" aria-label="Background mode">
        {MODES.map((m) => (
          <button key={m.id} className={opts.mode === m.id ? 'on' : ''} title={m.hint} onClick={() => set({ mode: m.id })}>
            {m.label}
            {m.id === 'auto' && opts.mode === 'auto' && modeUsed ? ` (${MODES.find((x) => x.id === modeUsed)?.label})` : ''}
          </button>
        ))}
      </div>
      <p className="hint">{MODES.find((m) => m.id === (opts.mode === 'auto' ? modeUsed : opts.mode))?.hint}</p>
      {opts.mode === 'colorkey' && (
        <p className="hint">
          Removing{' '}
          <span className="chip" style={{ background: `rgb(${(opts.keyColor ?? result?.analysis.background ?? [255, 255, 255]).join(',')})` }} />{' '}
          {opts.keyColor ? 'the colour you picked' : 'the detected background'}. Tap the original to pick another.
        </p>
      )}
      <div className="grid2">
        <Range label="Tolerance" value={opts.tolerance} min={0} max={100} onChange={(v) => set({ tolerance: v })} />
        <Range label="Despeckle" value={opts.despeckle} min={0} max={100} onChange={(v) => set({ despeckle: v })} />
        <Range label="Edge feather" value={opts.feather} min={0} max={3} step={0.25} fmt={(v) => `${v} px`} onChange={(v) => set({ feather: v })} />
        <label className="check">
          <input type="checkbox" checked={opts.defringe} onChange={(e) => set({ defringe: e.target.checked })} /> Remove white halos
        </label>
      </div>
      {result && (
        <p className="hint">
          {Math.round(result.transparentFraction * 100)}% cleared{result.removedSpecks ? `, ${result.removedSpecks} specks removed` : ''}, cropped to{' '}
          {result.crop.w} × {result.crop.h} px (preview) in {result.ms.toFixed(0)} ms.
        </p>
      )}
      <footer className="modal-foot">
        <button onClick={() => use(true)}>Skip, use original</button>
        <button onClick={download}>Download PNG</button>
        <button className="primary" onClick={() => use(false)} disabled={working && !result}>
          Use design
        </button>
      </footer>
    </>
  );
}

function Range(p: { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>
        {p.label} <output>{p.fmt ? p.fmt(p.value) : p.value}</output>
      </span>
      <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={p.value} onChange={(e) => p.onChange(+e.target.value)} />
    </label>
  );
}
