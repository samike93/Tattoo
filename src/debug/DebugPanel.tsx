import { useEffect, useState } from 'react';
import { stateToHash, useApp } from '../state';

declare const __APP_VERSION__: string;

/** Everything needed to reproduce a problem, as one JSON blob. */
export function debugReport() {
  const s = useApp.getState();
  return {
    app: 'tattoo-3d-preview',
    version: __APP_VERSION__,
    time: new Date().toISOString(),
    link: `${location.origin}${location.pathname}#${stateToHash(s)}`,
    status: s.status,
    design: { kind: s.design.kind, name: s.design.name, aspect: s.design.aspect },
    appliedSizeIn: s.appliedSize,
    metrics: s.metrics,
    timings: s.timings,
    gpu: gpuInfo(),
    userAgent: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    errors: s.errors,
  };
}

let gpuCache: Record<string, string> | null = null;
function gpuInfo() {
  if (gpuCache) return gpuCache;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return (gpuCache = { webgl2: 'not available' });
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpuCache = {
      webgl2: 'yes',
      renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
      vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
      maxTexture: String(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
    };
  } catch (e) {
    gpuCache = { error: String(e) };
  }
  return gpuCache;
}

export function DebugPanel() {
  const s = useApp();
  const [copied, setCopied] = useState('');
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(''), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      // Clipboard can be blocked (iframes, http). Fall back to a download.
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = 'tattoo-debug.txt';
      a.click();
      setCopied('downloaded');
    }
  };

  if (!s.debugOpen) {
    return (
      <button className="debug-toggle" onClick={() => s.set({ debugOpen: true })} title="Debug panel (press D)">
        Debug{s.errors.length ? ` · ${s.errors.length} error${s.errors.length > 1 ? 's' : ''}` : ''}
      </button>
    );
  }
  const t = s.timings;
  const ms = (k: string) => (t[k] === undefined ? '–' : `${t[k].toFixed(1)} ms`);
  return (
    <div className="debug" role="dialog" aria-label="Debug panel">
      <div className="debug-head">
        <b>Debug</b>
        <span className="muted">v{__APP_VERSION__}</span>
        <button onClick={() => s.set({ debugOpen: false })} aria-label="Close debug panel">×</button>
      </div>
      <table className="kv">
        <tbody>
          <tr><td>Status</td><td>{s.status}</td></tr>
          <tr><td>FPS</td><td>{t.fps ? t.fps.toFixed(0) : '–'}</td></tr>
          <tr><td>Triangles / draw calls</td><td>{t.triangles ?? '–'} / {t.drawCalls ?? '–'}</td></tr>
          <tr><td>Body download + parse</td><td>{ms('bodyLoadMs')}</td></tr>
          <tr><td>Body prepare (scale, weld, BVH)</td><td>{ms('bodyPrepareMs')}</td></tr>
          <tr><td>Limb ring table</td><td>{ms('limbFrameMs')}</td></tr>
          <tr><td>Exponential map</td><td>{ms('expmapMs')} {t.expmapVertices ? `(${t.expmapVertices} vertices)` : ''}</td></tr>
          <tr><td>DecalGeometry build</td><td>{ms('decalMs')}</td></tr>
          <tr><td>Placement update total</td><td>{ms('placementMs')}</td></tr>
          <tr><td>GPU</td><td className="wrap">{gpuInfo().renderer ?? gpuInfo().webgl2}</td></tr>
        </tbody>
      </table>
      <div className="seg wrap">
        <button onClick={() => copy(JSON.stringify(debugReport(), null, 2), 'report')}>Copy debug report</button>
        <button onClick={() => copy(`${location.origin}${location.pathname}#${stateToHash(useApp.getState())}`, 'link')}>Copy share link</button>
        <button onClick={() => s.set({ ui: !s.ui })}>{s.ui ? 'Hide' : 'Show'} controls</button>
      </div>
      {copied && <p className="hint">Copied {copied}.</p>}
      <h3>Errors</h3>
      {s.errors.length === 0 ? (
        <p className="hint">None so far.</p>
      ) : (
        <ul className="errors">
          {s.errors.map((e, i) => (
            <li key={i}><span className="muted">{e.time}</span> {e.message}</li>
          ))}
        </ul>
      )}
      {s.errors.length > 0 && <button onClick={() => s.set({ errors: [] })}>Clear errors</button>}
    </div>
  );
}
