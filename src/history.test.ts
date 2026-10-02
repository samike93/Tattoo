import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginGesture, endGesture, installHistory, redo, undo } from './history';
import { useApp } from './state';

describe('undo / redo', () => {
  let stop: () => void;
  let now = 0;
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    useApp.getState().set({ widthIn: 3, heightIn: 4, rotationDeg: 0, bodyId: 'male' });
    stop = installHistory();
  });
  afterEach(() => {
    stop();
    vi.restoreAllMocks();
  });
  const set = (patch: Parameters<ReturnType<typeof useApp.getState>['set']>[0], dt = 1000) => {
    now += dt;
    useApp.getState().set(patch);
  };
  const w = () => useApp.getState().widthIn;

  it('undoes and redoes separate edits one at a time', () => {
    set({ widthIn: 5 });
    set({ widthIn: 7 });
    expect(useApp.getState().history).toEqual({ undo: 2, redo: 0 });
    undo();
    expect(w()).toBe(5);
    undo();
    expect(w()).toBe(3);
    redo();
    expect(w()).toBe(5);
    expect(useApp.getState().history).toEqual({ undo: 1, redo: 1 });
  });

  it('merges quick successive changes (a slider drag) into one step', () => {
    for (let v = 4; v <= 9; v++) set({ widthIn: v }, 50);
    undo();
    expect(w()).toBe(3);
  });

  it('makes a whole gesture one step, even with pauses', () => {
    beginGesture();
    set({ widthIn: 4 }, 50);
    set({ widthIn: 6 }, 2000);
    set({ rotationDeg: 30 }, 2000);
    endGesture();
    set({ widthIn: 8 }, 100); // right after the gesture: a new step
    undo();
    expect(w()).toBe(6);
    undo();
    expect([w(), useApp.getState().rotationDeg]).toEqual([3, 0]);
  });

  it('a new edit clears redo; settings outside the design are ignored', () => {
    set({ widthIn: 5 });
    undo();
    set({ skinMelanin: 0.8 });
    expect(useApp.getState().history.redo).toBe(1);
    set({ heightIn: 6 });
    expect(useApp.getState().history).toEqual({ undo: 1, redo: 0 });
  });

  it('switching body clears the history', () => {
    set({ widthIn: 5 });
    set({ bodyId: 'female' });
    expect(useApp.getState().history).toEqual({ undo: 0, redo: 0 });
  });

  it('undoing a delete brings the design back, selected', () => {
    set({ selected: false });
    now += 1000;
    useApp.getState().deleteDesign();
    expect(useApp.getState().design.kind).toBe('none');
    undo();
    expect(useApp.getState().design.kind).toBe('checker');
    expect(useApp.getState().selected).toBe(true);
  });
});
