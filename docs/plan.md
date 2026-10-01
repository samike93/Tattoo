# Plan and architecture

The full product spec is in [spec.md](spec.md). This file records how it is being built.
Running decisions are in [decisions.md](decisions.md).

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Body models, three placement methods compared on a 1-inch grid, distortion measured, test page | **Done**. Results: [phase0/REPORT.md](phase0/REPORT.md) |
| 1 | MVP: body shape, import (PNG/JPG/SVG/PDF/.ai), background removal, auto placement with drag, skin, image export | **Done**. Results: [phase1/REPORT.md](phase1/REPORT.md) |
| 2 | Pro features: part/area picker, layers, ink map baking, healed/fresh/aged, styles, consult PDF, PWA | Next |
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
 │ body/       load GLB, blend Anny shapes for the client,      │
 │             weld UV seams (BodySurface: positions, adjacency)│
 │ import/     sniff file type, rasterise SVG/PDF/.ai (pdf.js)  │
 │ bgremove/   tattoo-tuned background removal (Web Worker)     │
 │ placement/  Auto: surface wrap vs cylinder per spot and size │
 │ projection/ pure math, no three.js (worker-ready, unit-tested)│
 │   cylindrical.ts  limb axis fit + ring table, band closing   │
 │   expmap.ts       discrete exponential map (Schmidt 2006),   │
 │                   run in a Web Worker (expmapClient.ts)      │
 │   design.ts       surface (x, y) meters -> design (u, v)     │
 │   distortion.ts   per-triangle size / squareness / mirroring │
 │   decal.ts        three.js DecalGeometry baseline            │
 │ ink/        skin material: ink multiplied into albedo,       │
 │             placement evaluated per fragment in 3D           │
 │ ui/         React + react-three-fiber scene, controls,       │
 │             import dialog, high-res image export             │
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

Meters everywhere in code. Inches and centimetres only at the UI edge (`formatSize`). The body's
height comes from Anny's height parameter (solved for the client's height), with build and muscle
from Anny's shapes; uniform scaling is only used outside Anny's range.

## File structure

```
src/
  body/        loadBody.ts, surface.ts, skeleton.ts, shape.ts (+ tests)
  import/      detect.ts, rasterize.ts (+ tests)
  bgremove/    pipeline.ts, bg.worker.ts, client.ts (+ tests)
  placement/   resolve.ts (Auto method choice)
  projection/  vec.ts, cylindrical.ts, expmap.ts, expmap.worker.ts, expmapClient.ts,
               design.ts, distortion.ts, evaluate.ts, decal.ts (+ tests)
  ink/         skinMaterial.ts (ink, pores, subsurface approximation)
  phase0/      checker.ts, scenarios.ts, study.ts, phase0.measure.test.ts (the distortion study)
  ui/          Scene.tsx, Panel.tsx, ImportDialog.tsx, Exporter.tsx
  debug/       DebugPanel.tsx
  test/        synthetic.ts, designs.ts, fixtures.ts (meshes, images and PDFs built in code)
tools/         export_bodies.py
scripts/       e2e.mjs, screenshots.mjs, check-licenses.mjs, models-as-text.mjs
public/models/ male.glb, female.glb, *.skeleton.json
docs/          spec, plan, decisions, licenses, regions, phase0 and phase1 reports
```

## Tests

- `npm test`: unit tests on synthetic shapes with exact answers (plane, round and oval tubes):
  vector math, the distortion metric, cylinder circumference, arc-length vs θ·r, band closing,
  exponential map exactness on a plane and on a cylinder, handedness (never mirrored).
- `npm run measure`: the distortion study on the real male and female bodies; writes
  `docs/phase1/metrics.md` and `metrics.json` (Phase 0's are kept in `docs/phase0/`).
- `node scripts/e2e.mjs`: end-to-end checks in headless Chromium against the production build
  (placement, drag, body shape, import, background removal, export).
- `npm run screenshots`: headless Chromium (SwiftShader) renders via share links.
- `node scripts/check-licenses.mjs`: dependency license gate.
