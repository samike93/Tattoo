import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Panel } from './ui/Panel';
import { Scene } from './ui/Scene';
import { DebugPanel } from './debug/DebugPanel';
import { ImportDialog } from './ui/ImportDialog';
import { DesignBox } from './ui/DesignBox';
import { installPenTracking, isIPad, isTouchDevice } from './ui/input';
import { hashToState, stateToHash, useApp } from './state';

export function App() {
  const ui = useApp((s) => s.ui);
  const status = useApp((s) => s.status);

  // Share links: state lives in the URL hash, so any link reproduces exactly what you see.
  useEffect(() => {
    const apply = () => useApp.getState().set(hashToState(location.hash));
    apply();
    window.addEventListener('hashchange', apply);
    let timer = 0;
    const unsub = useApp.subscribe((s) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        const h = '#' + stateToHash(s);
        // Some embeds (sandboxed iframes) refuse history changes; the app works without them.
        try {
          if (h !== location.hash) history.replaceState(null, '', h);
        } catch {
          /* share links unavailable here */
        }
      }, 250);
    });
    const onKey = (e: KeyboardEvent) => {
      // Ignore keys only while typing; Delete still works after ticking a checkbox or moving a slider.
      const typing = 'textarea, select, [contenteditable], input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=color])';
      if ((e.target as HTMLElement).closest(typing)) return;
      const st = useApp.getState();
      if (st.importDialog.open) return; // the dialog has its own keys
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        st.undoDelete();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        st.deleteDesign();
      } else if (e.key === 'Escape') st.set({ selected: false });
      else if (e.key === 'd' || e.key === 'D') st.set({ debugOpen: !st.debugOpen });
    };
    window.addEventListener('keydown', onKey);
    // Drop a design anywhere on the page.
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const file = e.dataTransfer?.files[0];
      if (!file || useApp.getState().importDialog.open) return;
      e.preventDefault();
      useApp.getState().set({ importDialog: { open: true, file } });
    };
    const stopPen = installPenTracking();
    if (isIPad()) document.documentElement.classList.add('ipad');
    if (isTouchDevice()) document.documentElement.classList.add('touch');
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      stopPen();
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('hashchange', apply);
      window.removeEventListener('keydown', onKey);
      unsub();
    };
  }, []);

  return (
    <div className={`app ${ui ? '' : 'no-ui'}`}>
      <main className="stage">
        <ErrorBoundary>
          <Canvas
            camera={{ fov: 35, near: 0.02, far: 50, position: [0, 1, 2.6] }}
            dpr={[1, 2]}
            gl={{ antialias: true, preserveDrawingBuffer: true }}
            onCreated={({ gl }) => gl.setClearColor('#2b2d33')}
            onPointerMissed={() => useApp.getState().set({ selected: false })}
          >
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
        {status !== 'Ready' && <div className="status">{status}</div>}
        <DesignBox />
        <DeletedToast />
        <Notice />
      </main>
      {ui && <Panel />}
      <DebugPanel />
      <ImportDialog />
    </div>
  );
}

function Notice() {
  const notice = useApp((s) => s.notice);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => useApp.getState().set({ notice: null }), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  if (!notice) return null;
  return (
    <div className="toast notice" role="status">
      {notice}
      <button onClick={() => useApp.getState().set({ notice: null })}>OK</button>
    </div>
  );
}

function DeletedToast() {
  const deleted = useApp((s) => s.deleted);
  const none = useApp((s) => s.design.kind === 'none');
  if (!none) return null;
  return (
    <div className="toast" role="status">
      {deleted ? 'Design deleted.' : 'No design on the body.'}
      {deleted ? (
        <button onClick={() => useApp.getState().undoDelete()}>Undo</button>
      ) : (
        <button onClick={() => useApp.getState().set({ importDialog: { open: true } })}>Import</button>
      )}
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  componentDidCatch(e: Error) {
    useApp.getState().logError(`Render error: ${e.message}`);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fatal">
          <h2>The 3D view stopped working</h2>
          <p>{this.state.error}</p>
          <p>Open the Debug panel, copy the debug report and send it over. Reloading the page usually recovers.</p>
          <button onClick={() => location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
