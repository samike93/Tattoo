import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useApp } from './state';
import './styles.css';

// Capture every error so the Debug panel (and its copyable report) shows what went wrong.
window.addEventListener('error', (e) => useApp.getState().logError(e.message || String(e.error)));
window.addEventListener('unhandledrejection', (e) => useApp.getState().logError(`Unhandled: ${String(e.reason?.message ?? e.reason)}`));

// Hook for automated screenshots and for poking at state from the browser console.
(window as unknown as { tattoo: unknown }).tattoo = { get: useApp.getState, set: useApp.getState().set };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
