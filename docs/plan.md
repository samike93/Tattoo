# Plan and architecture

The full product spec is in [spec.md](spec.md). This file records how it is being built.
Running decisions are in [decisions.md](decisions.md).

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Body models, three placement methods compared on a 1-inch grid, distortion measured, test page | **Done**. Results: [phase0/REPORT.md](phase0/REPORT.md) |
| 1 | MVP: viewer, import (PNG/JPG/SVG/PDF/.ai), background removal, limb + surface placement, inches, screenshots | Next |
| 2 | Pro features: part/area picker, layers, ink map baking, healed/fresh/aged, styles, consult PDF, PWA | Later |
| 3 | Backend: accounts, clients, sessions, share links | Later |

## Runtime architecture

Everything runs in the browser. The build is static files (HTML, JS, GLB), so it can be hosted on
any static host or a sub-folder of an existing website. No server, no uploads: designs never leave
the device.

```
           tools/export_bodies.py (offline, Python + Anny)
                           │  male.glb, female.glb, *.skeleton.json
                           ▼
 ┌──────────────────────── browser ─────────────────────────────┐
 │ body/       load GLB, scale to client height, weld UV seams  │
 │             (BodySurface: positions, normals, adjacency)     │
 │ projection/ pure math, no three.js (worker-ready, unit-tested)│
 │   cylindrical.ts  limb axis fit + ring table, band closing   │
 │   expmap.ts       discrete exponential map (Schmidt 2006)    │
 │   design.ts       surface (x, y) meters -> design (u, v)     │
 │   distortion.ts   per-triangle size / squareness / mirroring │
 │   decal.ts        three.js DecalGeometry baseline            │
 │ ink/        skin material: ink multiplied into albedo,       │
 │             placement evaluated per fragment in 3D           │
 │ ui/         React + react-three-fiber scene and controls     │
 │ debug/      debug panel, error capture, debug report         │
 │ state.ts    zustand store, share-link (URL hash) sync        │
 └──────────────────────────────────────────────────────────────┘
```

### Why placement math is done in 3D

The body's UV layout has seams. Each method computes design coordinates from 3D position (cylinder:
per fragment from the limb's ring table; exponential map: per welded vertex, interpolated), so a
design crosses UV seams without breaking. Phase 2 bakes the live layers into one UV-space ink map
for speed; the bake samples the same 3D math.

### Units

Meters everywhere in code. Inches and centimetres only at the UI edge (`formatSize`). The body is
scaled uniformly to the client's height in Phase 0; Phase 1 swaps this for Anny's height/weight/
muscle blend shapes so girth does not scale with height.

## File structure

```
src/
  body/        loadBody.ts, surface.ts, skeleton.ts
  projection/  vec.ts, cylindrical.ts, expmap.ts, design.ts, distortion.ts, evaluate.ts, decal.ts (+ tests)
  ink/         skinMaterial.ts
  phase0/      checker.ts, scenarios.ts, study.ts, phase0.measure.test.ts
  ui/          Scene.tsx, Panel.tsx
  debug/       DebugPanel.tsx
  test/        synthetic.ts (tube and plane meshes with known answers)
tools/         export_bodies.py
scripts/       screenshots.mjs, check-licenses.mjs
public/models/ male.glb, female.glb, *.skeleton.json
docs/          spec, plan, decisions, licenses, regions, phase0 report and screenshots
```

Phase 1 adds `import/`, `bgremove/` (Web Worker), and moves `expmap` into a worker if it ever
exceeds ~8 ms on an iPad (it is 1–19 ms in Node today; see the report).

## Tests

- `npm test`: unit tests on synthetic shapes with exact answers (plane, round and oval tubes):
  vector math, the distortion metric, cylinder circumference, arc-length vs θ·r, band closing,
  exponential map exactness on a plane and on a cylinder, handedness (never mirrored).
- `npm run measure`: the Phase 0 study on the real male and female bodies; writes
  `docs/phase0/metrics.md` and `metrics.json`.
- `npm run screenshots`: headless Chromium (SwiftShader) renders of each method via share links.
- `node scripts/check-licenses.mjs`: dependency license gate.
