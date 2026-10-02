import { useApp, type AppState } from './state';

/**
 * Undo / redo for edits to the design: moving, resizing, rotating, mirroring, deleting and
 * swapping it. A drag or pinch is one step (between beginGesture and endGesture); other changes
 * that follow each other quickly (a slider being dragged, typing a size) also merge into one step.
 * Body, skin and view settings are not part of the history.
 */
const KEYS = ['design', 'placement', 'spot', 'limbId', 'slide', 'around', 'band', 'widthIn', 'heightIn', 'lockAspect', 'rotationDeg', 'mirror'] as const;
type Snapshot = Pick<AppState, (typeof KEYS)[number]>;

const MERGE_MS = 600;
const LIMIT = 100;

let undoStack: Snapshot[] = [];
let redoStack: Snapshot[] = [];
let lastChange = 0;
let gestures = 0;
/** A step stays open (later changes merge into it) during a gesture and shortly after a change. */
let open = false;
let applying = false;

const snap = (s: AppState): Snapshot => Object.fromEntries(KEYS.map((k) => [k, s[k]])) as Snapshot;
const differs = (a: AppState, b: AppState) => KEYS.some((k) => a[k] !== b[k]);
const publish = () => useApp.getState().set({ history: { undo: undoStack.length, redo: redoStack.length } });

export function beginGesture() {
  gestures++;
  open = false; // a gesture always starts a new step
}

export function endGesture() {
  gestures = Math.max(gestures - 1, 0);
  open = false; // and the next change starts another
}

function restore(target: Snapshot, to: Snapshot[]) {
  const st = useApp.getState();
  to.push(snap(st));
  applying = true;
  st.set({ ...target, ...(target.design.kind !== 'none' ? { selected: true, deleted: null } : {}) });
  applying = false;
  open = false;
  publish();
}

export function undo() {
  const target = undoStack.pop();
  if (target) restore(target, redoStack);
}

export function redo() {
  const target = redoStack.pop();
  if (target) restore(target, undoStack);
}

export function clearHistory() {
  undoStack = [];
  redoStack = [];
  open = false;
  publish();
}

/** Starts recording. Returns a function that stops it. */
export function installHistory(): () => void {
  clearHistory();
  return useApp.subscribe((s, prev) => {
    if (applying) return;
    // Another body has a different mesh, so old placements would land in the wrong spot.
    if (s.bodyId !== prev.bodyId) return clearHistory();
    if (!differs(s, prev)) return;
    const now = performance.now();
    const merge = open && (gestures > 0 || now - lastChange < MERGE_MS);
    lastChange = now;
    open = true;
    if (merge) return;
    undoStack.push(snap(prev));
    if (undoStack.length > LIMIT) undoStack.shift();
    redoStack = [];
    publish();
  });
}
