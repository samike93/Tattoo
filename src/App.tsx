import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Panel } from './ui/Panel';
import { Scene } from './ui/Scene';
import { DebugPanel } from './debug/DebugPanel';
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
        if (h !== location.hash) history.replaceState(null, '', h);
      }, 250);
    });
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === 'd' || e.key === 'D') useApp.getState().set({ debugOpen: !useApp.getState().debugOpen });
    };
    window.addEventListener('keydown', onKey);
    return () => {
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
          >
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
        {status !== 'Ready' && <div className="status">{status}</div>}
      </main>
      {ui && <Panel />}
      <DebugPanel />
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
