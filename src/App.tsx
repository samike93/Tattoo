import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Panel } from './ui/Panel';
import { Scene } from './ui/Scene';
import { DebugPanel } from './debug/DebugPanel';
import { ImportDialog } from './ui/ImportDialog';
import { DesignBox } from './ui/DesignBox';
import { installPenTracking, isIPad, isTouchDevice } from './ui/input';
import { hashToState, stateToHash, useApp } from './state';
import { installHistory, redo, undo } from './history';
import { PhotoStage } from './photo/PhotoStage';

export function App() {
  const ui = useApp((s) => s.ui);
  const status = useApp((s) => s.status);
  const mode = useApp((s) => s.mode);

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
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        st.deleteDesign();
      } else if (e.key === 'Escape') st.set({ selected: false, photoCalibrating: false });
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
    const stopHistory = installHistory();
    if (isIPad()) document.documentElement.classList.add('ipad');
    if (isTouchDevice()) document.documentElement.classList.add('touch');
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      stopPen();
      stopHistory();
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('hashchange', apply);
      window.removeEventListener('keydown', onKey);
      unsub();
    };
  }, []);

  return (
    <div className={`app ${ui ? '' : 'no-ui'}`}>
      <main className={`stage ${mode === 'photo' ? 'photo-mode' : ''}`}>
        <ErrorBoundary>
          <Canvas
            frameloop={mode === 'photo' ? 'never' : 'always'}
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
        {mode === 'photo' && <PhotoStage />}
        {status !== 'Ready' && mode === 'body' && <div className="status">{status}</div>}
        {mode === 'body' && <DesignBox />}
        {(status === 'Ready' || mode === 'photo') && <UndoBar />}
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

/** Undo / redo buttons over the 3D view (an iPad has no keyboard for Ctrl+Z). */
function UndoBar() {
  const { undo: canUndo, redo: canRedo } = useApp((s) => s.history);
  if (!canUndo && !canRedo) return null;
  return (
    <div className="undo-bar">
      <button onClick={undo} disabled={!canUndo} aria-label="Undo (Ctrl/⌘+Z)" title="Undo (Ctrl/⌘+Z)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button onClick={redo} disabled={!canRedo} aria-label="Redo (Shift+Ctrl/⌘+Z)" title="Redo (Shift+Ctrl/⌘+Z)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
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
        <button onClick={undo}>Undo</button>
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
