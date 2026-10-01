# Prompt for Gemini: realism and code review

Paste everything below the line into Gemini. If Gemini can't open GitHub links, attach the files
listed under "Files to read first" (or a zip of the repo).

---

You are a senior real-time graphics engineer (three.js / WebGL2 / GLSL) and a senior TypeScript +
React reviewer. Review my project and help me make the 3D body and the tattoo rendering look much
more realistic, and improve the code. Be concrete: name files and functions, and give code I can
apply.

## The project

A browser app for tattoo artists. During a consultation (often on an iPad) the artist loads a
true-to-scale 3D human body, imports a tattoo design, places it on the skin, and shows the client
how it will look and how big it is. Everything runs in the browser; client designs never leave the
device.

Repo (public): https://github.com/samike93/Tattoo, branch `claude/tattoo-3d-preview-research-ubsa0k`
(the default branch). Background: `docs/spec.md` (product spec), `docs/phase0/REPORT.md` and
`docs/phase1/REPORT.md` (what's built and measured), `docs/decisions.md`, and
`reports/Tattoo mockup tools for artists.md` (market and UX research).

Stack: Vite + React 19 + TypeScript (strict), three.js r186 via @react-three/fiber 9,
three-mesh-bvh, zustand, pdf.js (legacy build), Vitest, Playwright end-to-end tests.

How it works today:
- **Body model.** `tools/export_bodies.py` generates male and female bodies from Anny
  (NAVER LABS Europe, Apache 2.0, built on MakeHuman CC0 assets) and writes GLBs: 13,503 vertices,
  24,864 triangles, skin only (eyes, mouth cavity and tongue removed), meters, +Y up. Each GLB has
  custom attributes `_VID` (welded vertex id, used to rebuild the surface across UV seams) and
  `_BONE` (dominant skinning bone), plus 18 morph targets: the corners of Anny's
  height x weight x muscle grid, which the app blends exactly (`src/body/shape.ts`). The exporter
  straightens the elbows to 5 degrees. A skeleton JSON holds joint positions per morph corner.
- **Placement.** Designs are placed with a discrete exponential map (Schmidt et al. 2006, in a Web
  Worker: `src/projection/expmap.ts`) or, for bands and very wide limb designs, a cylindrical wrap
  with an arc-length lookup table (`src/projection/cylindrical.ts`). `src/placement/resolve.ts`
  picks the method automatically. Accuracy is measured by `npm run measure` (a 1-inch grid stays
  within 5% over 92-100% of the design on forearm and back).
- **Rendering.** `src/ink/skinMaterial.ts` patches MeshPhysicalMaterial with onBeforeCompile: ink
  is multiplied into the skin albedo (computed per fragment in 3D, so UV seams don't matter),
  procedural pores and tone variation from 3D noise, and a subsurface-scattering approximation
  using per-channel wrap lighting. Lighting is three's RoomEnvironment plus two directional lights
  (`src/ui/Scene.tsx`). There are no skin textures yet.
- **UI.** `src/ui/Panel.tsx` (controls), `src/ui/DesignBox.tsx` (on-body resize/rotate/delete
  handles), `src/ui/ImportDialog.tsx` (import plus background removal in `src/bgremove/`),
  `src/ui/Exporter.tsx` (3000 px PNG export), `src/state.ts` (zustand store).

## Hard constraints (please respect all of these)

1. **Commercial licensing.** Every asset and dependency that ships must be MIT, Apache 2.0, BSD, ISC
   or CC0. Do not suggest SMPL / SMPL-X / SMPL+H or anything derived from them, Anny's optional
   "smplx" topology, MetaHuman assets (Unreal-only license), Daz3D or Character Creator content,
   Mixamo characters, or textures with NC / no-redistribution terms. For every asset you suggest,
   give its exact license and source URL. If you are not sure of a license, say so.
2. **True scale is the product.** Anything that changes the mesh must keep the `_VID` and `_BONE`
   attributes, the 18 morph targets, real-world meters and the exact height matching, and must not
   make `npm run measure` worse. If you propose a denser mesh (subdivision etc.), explain how the
   attributes, morphs and welded surface survive it.
3. **Performance.** 60 fps on a recent iPad and a mid-range laptop, WebGL2 only, body GLB under
   10 MB each (currently 3.8 MB), first load under 4 seconds on studio Wi-Fi. No main-thread work
   over 50 ms while interacting. Must work offline once loaded.
4. **No server.** Pure static site (GitHub Pages / any static host).
5. Don't invent three.js APIs. If an API is version-specific, say which version (we're on r186).

## What I want from you

### A. Realistic body and skin (main goal)
Give a ranked plan (impact vs effort) to make the body and skin look photo-real enough for a client
to picture their own tattoo. Cover at least:
- Skin textures: can we use MakeHuman's CC0 skin packs (Anny's UVs are MakeHuman's) for albedo,
  normal, roughness and cavity maps? Several skin tones from one set? How to tint per client tone
  without making it look painted?
- Mesh resolution and smoothness: is 13.5k vertices enough? Options (subdivision at export,
  normal maps baked from a high-res MakeHuman/MPFB2 mesh, tessellation alternatives in WebGL2)
  and how they interact with constraint 2.
- Subsurface scattering in WebGL2 on an iPad: better than per-channel wrap lighting? (screen-space
  SSS, pre-integrated skin BRDF, thickness maps for ears/fingers). Code sketch for the best option.
- Lighting and presentation: CC0 HDRIs (Poly Haven), tone mapping, exposure, soft shadows, a
  ground/contact shadow, a studio look that flatters skin and shows ink clearly.
- Face, hands, feet, nails, eyes, eyebrows: what minimum makes the body stop looking like a
  mannequin (no hair needed)?
- Skin detail sliders my artist asked for: wrinkles / skin age, stretch marks, cellulite, scars.
  How to do them procedurally or with masks so the ink breaks up over them like real skin.
- Tattoo ink realism: fresh vs healed vs aged (line spread, blur, blacks shifting toward blue-grey,
  lower saturation, colour ink on dark skin). Physically motivated but cheap shader approaches.
- Body shape: Anny exposes local changes like `stomach-pregnant-incr`, `measure-thigh-circ-incr`,
  `l-upperleg-fat-incr`, `breast-volume-vert-up`, `hip-scale-horiz-incr` and phenotypes `cupsize`,
  `firmness`. How to add belly, thigh, hip, bust and "thigh gap" controls as extra morph targets
  on top of the 18-corner grid, given that local changes are linear but cupsize/firmness interact
  with weight and muscle. Sketch the changes to `tools/export_bodies.py` and `src/body/shape.ts`.

### B. Code review
Review the code for bugs, performance problems, iPad/Safari issues, memory leaks (three.js
geometries, textures, workers), React re-render hot spots, accessibility and maintainability.
Prioritise by severity. For each finding: file, function, what's wrong, the failure scenario, and
the fix.

### C. Product suggestions
From a tattoo artist's point of view (consultations, sizing, quoting), what would make this
noticeably better? Keep it to the ten most valuable ideas, ranked.

## Output format
1. A one-paragraph summary of your top recommendations.
2. Section A as a ranked table (rank, change, impact, effort, license notes), then details and code
   for the top five.
3. Section B as a severity-ranked list with code fixes.
4. Section C as a ranked list.
5. A list of anything you were unsure about or couldn't verify (licenses, APIs, performance).
Give code as complete functions or unified diffs against the files named above, not fragments
without context.
