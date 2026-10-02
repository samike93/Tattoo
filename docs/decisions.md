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

### 2026-10-01: Body-shape controls from Anny's local changes (after Gemini's review)

Belly, bust, bust lift, hips, buttocks, thighs, thigh gap, upper arms and calves. Gemini suggested
MakeHuman's MHAPI and `morphTargetInfluences`; neither fits: the exporter uses Anny, and shapes must
be baked on the CPU because the wrapping math needs the real vertex positions. Anny's local changes
are exactly linear on each side of 0 and independent of height/weight/muscle (0.00 mm), so each
control is two sparse glTF morph targets (+1/-1) plus joint offsets. GLB 3.76 → 4.0 MB. Thigh gap has
no Anny target; a mix of pelvis width, thigh width and leg angle opens it from 5.1 to 7.9 cm, and
the closed end stops at -0.7 so thighs never overlap even at maximum build (tested).

### 2026-10-01: Skin colour on the dermatology ITA scale, not a physics model

Gemini proposed a melanin LUT. A three-wavelength two-layer skin model (melanin over haemoglobin)
could not match real skin colours (light skin too pink, dark skin orange) without full spectral
integration, so skin colour follows typical CIELAB values along the Individual Typology Angle scale
used in dermatology (very light > 55° ... dark < -30°), with an undertone slider (cool/pink to
warm/golden). Albedos are now real skin reflectance, darker than the old swatches; lighting and
Khronos PBR Neutral tone mapping compensate.

### 2026-10-01: Fresh / healed / aged ink

Ink spread is a radius in real millimetres (fresh 0.05, healed 0.15, aged 0.4), done as a 9-tap disc
blur rather than a mip bias (which looked blocky and ignores the design's real size), so small
lettering blurs out before large shapes, which is what the client needs to see. Aged blacks shift
toward blue-grey (Tyndall), colours desaturate. Ink still multiplies into the skin (Gemini's snippet
painted it on top). Fresh adds sheen and redness around the lines. Estimates, labelled as such.

### 2026-10-01: Procedural studio and shop lighting, floor shadow

Poly Haven HDRIs are CC0 but the download was blocked here, and a runtime download would break
offline use, so the environment is built in code: a portrait-studio softbox setup (default) and an
overhead-fluorescent "shop" setup. A shadow-casting key light and a soft contact blob ground the body.

### 2026-10-01: Apple Pencil and touch

iPadOS Safari reports itself as a Mac, so an iPad is detected from touch support
(`maxTouchPoints > 1`); the Pencil is detected from `pointerType === 'pen'` on its first touch, which
switches on Pencil mode (remembered on the device). Pencil mode follows Procreate: Pencil edits,
fingers move the camera, which also gives palm rejection. A finger on a selection handle in Pencil
mode is handed to the camera, because on a small design the handles cover most of it. Touch screens
get larger handles; when the box is small on screen the edge handles hide so they never cover the
corners. Without a Pencil, one finger drags the design and a second finger pinches/twists it.
Tested in headless Chromium with simulated touch and pen input (`scripts/e2e-input.mjs`), not yet
on a real iPad.

### 2026-10-02: Undo / redo and the live size label

History covers the design only (where it is, its size, angle, mirror, band, and the design itself,
so deleting and swapping designs are undoable); body, skin and view settings are not, since
undoing a skin-tone change while trying to put a design back would be surprising. A drag, pinch
or handle grab is one step; other changes less than 0.6 s apart (a slider being dragged) merge.
Switching body clears the history because placements are pinned to that body's mesh. The size
label sits centred under the box's lowest point rather than along its axis, so it never overlaps
a rotated design, and it shows the size actually applied (band mode uses the ring length).

### 2026-10-02: A more realistic body without new assets or licences

The body looked like a mannequin: empty eye sockets, one flat colour, no contact shading. Fixed
with data Anny already ships (all CC0 or computed) rather than a new model:
- Eyes: Anny's eyeball fronts were shaded as skin. The exporter stores each eye vertex's direction
  from the fitted eyeball centre; the shader draws sclera, a fibred iris with a limbal ring, the
  pupil, a wet (low roughness) cornea, and shading under the upper lid.
- Colour variation: MPFB2's UV masks (lips, areolae, nails, ears, eyelids, face, genitals) packed
  into one RGB texture per body; palms and soles (lighter, strongest on dark skin), knees, elbows
  and knuckles from the skeleton and normals. How dark the skin is comes from its colour, so custom
  colours work too.
- Eyebrows are painted into the same texture by the exporter from 3-D positions relative to each
  eye (shape, taper, hair direction), thinner and more arched on the female body.
- Ambient occlusion per vertex (disc-based, after Bunnell), recomputed for every body shape in a
  worker (~0.1 s); the previous shape's AO shows meanwhile. Screen-space AO was rejected: a
  full-screen pass costs too much on iPads for a mostly static scene.
Not done: hair (would need hair cards or a scalp texture), smoother silhouettes (Anny has no
finer mesh; subdividing would quadruple the morph data).

### 2026-10-02: Client photo mode instead of third-party human models

Asked for "live human models". Realistic scanned humans (Renderpeople, scan stores) don't allow
shipping the mesh in a web page, MetaHumans need Unreal and an Epic login to export, and MakeHuman's
CC0 photo skins could not be downloaded from this environment. The most realistic body is the
client's own, so photo mode puts the design on a photo of them: a WebGL shader multiplies the ink
into the photo in sRGB (like a multiply layer, so the photo's light, pores and hair stay on top)
with the same spread / fade / redness as the 3D ink looks, and bends it round a limb (design width
as arc length on a cylinder). True size comes from a measured reference (two taps on a ruler in the
photo); without it sizes are marked as estimates (≈). Photos are decoded upright, capped at
3072 px, and never uploaded or put in share links.
