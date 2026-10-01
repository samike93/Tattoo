# Decisions

Newest last. Each entry: what, why, and what would change it.

### 2026-10-01: Body model source is Anny (Apache 2.0 + CC0 MakeHuman assets)

Anny generates MakeHuman-topology bodies from a Python package, so the GLBs are reproducible from a
script (`tools/export_bodies.py`) instead of manual Blender work. Licensing is in
[licenses.md](licenses.md). MPFB2/Blender stays the fallback if we need clothing-free sculpt
fixes or hand-tuned regions.

### 2026-10-01: Default Anny phenotype, young adult, uniform scale to client height

`age=0.72` (young adult), all other phenotypes 0.5. Exported heights are 1.90 m (male) and 1.77 m
(female); the app scales uniformly to the client's height (defaults 5'10" and 5'5"). Uniform
scaling makes girth follow height, which is wrong by a few percent for very tall or short clients.
Phase 1: export height/weight/muscle as morph targets (or a small set of pre-baked bodies) instead.

### 2026-10-01: Ship our own minimal GLB writer, no compression yet

Each body is 840 KB uncompressed (13.5k vertices), far under the 10 MB budget, so Draco/Meshopt is
not worth the decoder weight yet. Revisit when we add a skin normal map and KTX2 textures.

### 2026-10-01: Rest pose as exported (A-pose, elbows slightly bent)

Anny's rest pose is an A-pose with relaxed elbows. Fine for placement. Phase 1 may straighten the
elbows a few degrees so the inner forearm faces the camera better.

### 2026-10-01: Cylindrical wrap uses a fitted axis and true arc length, not θ·r

Measured on the real forearm (see the Phase 0 report):

- The elbow and wrist joints sit off-centre in the limb, so an axis through the joints shears the
  grid. Fitting the axis through the cross-section centres and measuring angles around each ring's
  centre cut the 95th-percentile size error from ~8% to ~6%.
- Forearms are oval. `x = θ·r` (the textbook formula, used in the spec) is exact only for circles;
  on the forearm it gives 10–33% p95 size errors. True arc length around each ring gives ~5–7%.
- Along the limb we use skin distance along the meridian, not distance along the bone.

The remaining ~5% comes from the forearm's cross-section twisting along its length (pronation).
No cylinder coordinate removes that; the exponential map does better for patches.

### 2026-10-01: Recommendation: exponential map for patches, cylinder for bands

Exponential map: 91–100% of a 3×4 in grid within 5% on the forearm, 100% on the shoulder blade,
never mirrored, 1–19 ms. Cylinder: needed when a design wraps more than about half way round a
limb (the exponential map cannot close a band), and closes bands exactly (0.00 mm seam).
three.js DecalGeometry: not usable on limbs (16–34% of a forearm design mirrors through to the
other side). Phase 1 picks the method automatically: limb + width over ~45% of the circumference
or "full band" means cylinder, anything else means exponential map.

### 2026-10-01: Ink is multiplied into skin albedo

Matches the spec's "ink as absorption". A side effect worth keeping: white backgrounds on uploaded
line art already disappear in the preview, before background removal exists.

### 2026-10-01: Remove @react-three/drei

Only `OrbitControls` was used; drei pulled in `webgl-constants` (no license field) and dozens of
unrelated modules. three.js ships the same controls.

### 2026-10-01: Static build with relative paths

`vite.config.ts` uses `base: './'` so the same `dist/` works at a domain root, in a sub-folder of
an existing website, on GitHub Pages, or embedded in an `<iframe>`. State lives in the URL hash so
share links work on static hosting without rewrites.

### 2026-10-01: Body shape from Anny's 18 corner shapes (Phase 1)

Separate height/weight/muscle morphs added together were off by up to 10 cm. Anny's mesh is
exactly trilinear over its anchor grid, so the GLB carries the 18 corners and the app blends them
(< 1e-9 mm from Anny). Client height is matched by solving for the height parameter; uniform
scaling only outside 1.36–2.45 m (male) / 1.22–2.31 m (female). Supersedes "uniform scale to
client height". Cost: GLB 0.84 → 3.8 MB per body.

### 2026-10-01: Straighten the elbows to 5 degrees

Supersedes "rest pose as exported". The 44.5° rest bend made the inner elbow a crease (designs
across it 15–31% true to size, up to 38% mirrored). Straightened: 70–97%, 0% mirrored. Done with
linear blend skinning on the rest shape in the exporter so the 18 shapes stay exactly blendable
(posing through Anny itself re-centres on the root and adds ~3 mm of blend error).

### 2026-10-01: Auto switches to the cylinder at 72% of the circumference

Supersedes the Phase 0 guess of ~45%. Measured: the surface wrap keeps 98–100% of a design within
5% up to 66% of the forearm's circumference and starts folding (mirrored areas) at 77–78%. The
cylinder is worse at every width, so it is used only past 72%, for a full band, or when the surface
wrap result has more than 0.5% of the design mirrored (checked on every placement; the switch
point depends on the client's arm, so a fixed threshold alone let a 1.4% fold through).

### 2026-10-01: Background removal works in linear light, white-balanced to the paper

Colour-to-alpha straight against cream paper turned neutral grey wash blue-grey. Dividing by the
paper colour first (a scan tints ink and paper alike) and treating near-neutral marks as diluted
black ink keeps grey wash neutral and renders correctly when multiplied into skin. Feathering only
softens inwards so cleared background never returns as a halo.

### 2026-10-01: pdf.js legacy build

pdf.js 6's default build needs `Map.prototype.getOrInsertComputed`, which current Chrome and iPad
Safari lack (found by the end-to-end test). The legacy build is transpiled for them.

### 2026-10-01: Skin detail is procedural

Pores, fine bumps and tone variation come from 3D noise in object space (real-world size, no texture
download, no UV seams). Subsurface scattering is approximated with per-channel wrap lighting (red
wraps furthest). A "Skin detail" toggle turns both off for slow devices. A photographed skin texture
set can replace the noise later without touching the ink code.

### 2026-10-01: Expected import problems are not logged as errors

Wrong file types and old `.ai` files are explained in the import dialog. Only unexpected failures go
to the debug panel's error list, so the list stays useful for troubleshooting.
