# Build: 3D Tattoo Preview Studio

## Your role

You are a senior full-stack engineer with deep experience in real-time 3D graphics (WebGL, three.js, React Three Fiber, GLSL), mesh processing, and image processing. You also understand tattooing well enough to make the preview look like real ink in real skin, not a sticker. Think like the engineer who would ship this as a product for tattoo studios.

## What we are building

A browser app a tattoo artist uses during a client consultation. The artist:

1. Loads a realistic, to-scale 3D human body (male or female, adjustable build and skin tone).
2. Imports a tattoo design (PNG, JPG, SVG, PDF, or Adobe Illustrator .ai).
3. The background of the design is removed automatically.
4. Picks a body part, then an area of that part (for example: right forearm, inner side).
5. The design is placed on the skin and wraps around curves naturally (a band wraps all the way around an arm; a back piece follows the shoulder blades) without stretching.
6. The artist moves, rotates, and resizes it in real units (inches, with cm shown too).
7. The client sees a realistic render from any angle, and the artist exports images or a one-page consult sheet.

It must run smoothly on an iPad and a laptop in the studio. Client images and designs should be processed locally in the browser by default (privacy).

## Research already done (use these findings, verify anything you rely on)

**This product category exists and works.** Comparable tools: TryTattoo3D (web, places uploads on male/female 3D body models with move/rotate/scale), Tattoo Preview 3D & AR (iOS), and HanInk (open source, Next.js + React Three Fiber, loads GLB body models, click-to-place with raycasting). Study HanInk's approach as a reference, but ours must handle wrapping and realism better.

**Body model and licensing (important, this is a commercial product):**
- Do NOT use SMPL, SMPL-X, SMPL+H, or anything derived from them. They come from the Max Planck Institute, are licensed for non-commercial research only, and commercial use requires a paid license through Meshcapade.
- Use one of these instead:
  - **MakeHuman / MPFB2 (Blender add-on)**: models exported from an official, unmodified MakeHuman build are CC0 (free for commercial use). Clean quad topology, real-world measurements, a standard rig, and good UVs.
  - **Anny (NAVER LABS Europe)**: parametric body model built on MakeHuman assets, Apache 2.0 license, interpretable shape controls (height, weight, muscle, age). Do not use its optional "smplx" topology download, which is non-commercial.
- "Full anatomy" here means the full body skin surface. Muscles and organs are not needed. Tattoos only care about the skin.
- Prepare in Blender, export as **glTF binary (.glb)** with Meshopt or Draco compression and KTX2 textures. Keep scale in meters so 1 unit = 1 m. Target under 10 MB per body.
- Neutral relaxed pose (A-pose) so arms, sides, and inner arms are all reachable.

**Wrapping, what does and does not work:**
- three.js `DecalGeometry` is a box (planar) projection. It is fine on flat areas but stretches and smears on curved surfaces and around limbs. This is a well documented, unresolved limitation. Use it only for a quick prototype comparison, not for the product.
- For limbs (arms, forearms, wrists, thighs, calves, neck), use a **cylindrical wrap** around the bone axis (math below). This is what makes a design "wrap around the arm" correctly.
- For the torso, back, chest, ribs, shoulders, and other free-form areas, use **exponential map decals** from Schmidt, Grimm and Wyvill, "Interactive Decal Compositing with Discrete Exponential Maps" (SIGGRAPH 2006). It builds a local, low-distortion 2D coordinate system around the click point with a modified Dijkstra pass, O(N log N), fast enough to recompute while dragging. Read the paper (author PDF is on Cindy Grimm's Oregon State page) and implement it.

**Illustrator .ai files:** since Illustrator 9 the default is "Create PDF Compatible File", which embeds a full PDF in the .ai, so pdf.js can render it in the browser. Detect the `%PDF-` header. Files saved without PDF compatibility (or from Illustrator 8 and older) cannot be read. Show a friendly message: "Re-save from Illustrator with Create PDF Compatible File checked, or export as PNG/SVG."

**Background removal:** `@imgly/background-removal` is AGPL-3.0, which forces our source open unless we buy a commercial license. Do not add it by default. Tattoo designs are almost always line art or flash on a plain background, and a classic, tuned image-processing pipeline (below) works better on fine lines than a generic AI cutout model anyway.

## Tech stack

- Vite + React + TypeScript (strict)
- three.js via @react-three/fiber and @react-three/drei
- three-mesh-bvh for fast raycasting and neighborhood queries
- Zustand for app state
- pdf.js (pdfjs-dist) for .ai and .pdf import
- Web Workers for background removal and exponential map computation
- Vitest for unit tests, Playwright for screenshot tests
- Ship as a PWA so it works offline at the studio
- Phase 3 backend: Supabase (Postgres, Auth, Storage) or a small Node/Fastify API, your recommendation with reasoning

Dependency rule: only MIT, Apache 2.0, BSD, ISC, or CC0 dependencies and assets. Flag anything GPL, AGPL, or non-commercial before installing it.

## Features

### 1. Viewer
- Orbit, zoom, pan with mouse and touch. Camera presets: front, back, left, right, and "frame selected area".
- Soft studio lighting (HDRI environment plus a key light) that flatters skin and shows ink clearly.
- Male and female bodies. Body shape sliders: height, weight, muscle (via morph targets or Anny parameters). The artist can enter the client's height so sizes stay true to scale.
- Skin tone: a preset range from very light to very dark, plus a custom picker. Skin uses a physically based material with albedo, normal map (pores), and roughness, with a subsurface-scattering approximation so it does not look like plastic.

### 2. Body parts and areas
- Selectable parts: head, face, neck (front/back/side), chest (L/R), sternum, stomach, ribs (L/R), upper back, lower back, shoulder (L/R), upper arm (L/R), elbow, forearm (L/R), wrist, hand (L/R), hip, thigh (L/R), knee, calf (L/R), ankle, foot (L/R).
- Each part has preset areas, for example forearm: inner, outer, top, full wrap band, full sleeve section.
- Build the region map by assigning each vertex its dominant bone from the rig's skin weights, then hand-tune the boundaries in Blender and bake a region ID into a vertex attribute in the GLB. Document this process in `docs/regions.md` so it can be redone for new body models.
- Tapping a part highlights it and frames the camera on it. A brush lets the artist paint a custom area. A "Fit to area" button scales and centers the design inside the chosen area.

### 3. Placement and wrapping
Each tattoo is a layer with: design image, placement mode, position, rotation, size (in inches), opacity, mirror flag, lock flag.

**Cylindrical wrap mode (limbs and neck).** For a limb segment with joints A and B:
- `d = normalize(B - A)`. Build `e1`, `e2` perpendicular to `d`, with `e1` pointing to the front of the limb.
- For a surface point `p`: `t = dot(p - A, d)` (distance along the limb), `r = (p - A) - t * d`, `theta = atan2(dot(r, e2), dot(r, e1))`.
- Surface coordinates: `u = theta * |r|` (arc length using the local radius, so physical size stays correct as the limb tapers), `v = t`.
- Design coordinates: `((u - u0) / width, (v - v0) / height)` with rotation applied in that 2D space.
- Controls: slide along the limb, rotate around the limb, size, and a "wrap amount" from a small patch up to a full 360 degree band. Put the seam on the back or inside of the limb by default (configurable). Option "close the band": normalize per ring circumference so a full band meets itself exactly.
- Handle the elbow and knee gracefully: blend between the two bone axes across the joint so a design crossing the elbow bends instead of tearing.

**Surface mode (torso, back, shoulders, everything else).** Discrete exponential map decal centered on the clicked point, computed in a Web Worker over only the vertices within the design's geodesic radius. Rotation and scale are applied in the 2D tangent space. Recompute on drag release (or live if fast enough, measure it).

**Rendering the ink.**
- While a layer is being edited, render it live in the skin shader from per-vertex decal coordinates.
- When editing stops, bake all layers into one 4096 x 4096 UV-space "ink map" (render the mesh into UV space, sample each layer with its decal coordinates, composite in layer order). Dilate the ink map a few pixels across UV seams to hide seam lines. The skin material then reads that one texture.
- Because placement math is done in 3D, designs can cross UV seams without breaking.

**Layer tools:** multiple tattoos, reorder, duplicate, delete, lock, "mirror to other side" (left forearm to right forearm), and show real dimensions (for example `4.5 in x 2.75 in (11.4 x 7.0 cm)`).

### 4. Design import
- Accept PNG, JPG, WEBP, SVG, PDF, and .ai via drag-and-drop and file picker (iPad Files app too).
- Vector files (SVG, PDF, .ai) are rasterized at high resolution (4096 px on the long side) on a transparent background. For multi-artboard .ai or multi-page PDF, show thumbnails and let the artist pick one.
- Validate size and type, show clear errors, never crash on a bad file.

### 5. Automatic background removal (tattoo-tuned)
Run in a Web Worker. Show a before/after preview on a checkerboard with simple controls. Pipeline:
1. If the image already has meaningful transparency, keep it and skip removal.
2. Detect the background color from the border pixels (median of the outer ring).
3. Pick a default mode automatically, with the artist able to switch:
   - **Line art / stencil mode** (default for black or gray artwork on white): convert luminance to alpha so white becomes fully transparent and blacks and grays become ink of matching strength. Removes white between lines too, so skin shows through like a real tattoo.
   - **Outer background only** (for color designs that contain intentional white ink): flood fill from the edges within a tolerance so enclosed white highlights are kept.
   - **Color key** with an eyedropper for colored backgrounds.
4. Clean up: tolerance slider, despeckle (remove tiny specks from scans and JPEG noise), defringe (remove white halos on edges), slight edge feather.
5. Crop to the design's bounding box and save the result as a transparent PNG the artist can download.

Write unit tests with fixtures: black line art on white, scanned sketch on off-white paper, JPEG with compression noise, color flash with white highlights, design on a colored background, and an already transparent PNG.

### 6. Realistic ink in skin
Ink lives in the dermis under the epidermis, so it must look under the skin, not on top of it:
- Treat ink as absorption: multiply ink color into skin albedo. Lighter inks (white, pastels) blend toward the ink color at reduced strength and show less on darker skin, the same as in real life.
- Skin normal map, pores, and specular highlights stay on top of the ink. Ink is never glossy on its own.
- **Healed look** (default): edges softened by roughly 0.2 to 0.4 mm, blacks lifted slightly toward a cool blue-gray, saturation slightly reduced. Make all of these tunable constants.
- **Fresh look**: crisper, darker, slightly higher contrast, faint redness around linework, slight surface sheen.
- **Aged look** (optional, 10+ years): more line spread and softer detail, useful for showing why fine detail needs size.
- Contrast should naturally drop on darker skin tones for colored inks. Do not fake it with a filter on the whole image.

### 7. Tattoo style knowledge
Build a style library used for render presets and for helpful warnings. Each style gets a short description shown in the UI and default render settings. Reference traits:

| Style | Look | Render and advice notes |
|---|---|---|
| American Traditional | Bold black outlines, solid fills, limited saturated palette (red, yellow, green, black), little blending | Ages very well. Crisp healed preset. |
| Neo-Traditional | Bold outlines with varied line weight, wider palette, more depth and ornament | Slightly softer than traditional. |
| Black and Gray Realism | Smooth gradients from diluted black (gray wash), often no outlines, high detail | Needs size to hold detail. Warn when detail is small. |
| Fine Line | Thin single-needle lines, small and delicate | Most prone to blur and fade. Warn on tiny details and lettering. |
| Blackwork | Large solid black areas and patterns, high contrast | Strong healed blacks. |
| Dotwork / Stippling | Shading built from dots, often geometric or mandala | Dots soften together over time. |
| Japanese (Irezumi) | Large pieces that flow with the body, waves, clouds, wind bars, bold outlines | Built for sleeves and back pieces. Encourage large placements. |
| Tribal | Bold flowing black shapes that follow muscle lines | Placement should follow the body's flow. |
| Script / Lettering | Fonts and handwriting | Flag letters smaller than about 1/4 in (6 mm) as a blur risk (configurable rule of thumb). |
| Watercolor | Soft color washes, often without outlines, sometimes with black linework | Fades faster without outlines. Note it. |
| Chicano | Fine black and gray shading, ornate lettering, portraits | Same rules as black and gray. |
| Geometric | Precise lines, symmetry, patterns | Distortion on curves is very visible. Show a distortion warning when wrap stretch exceeds a threshold. |
| Trash Polka | Black and red, collage of realism and graphic elements | High contrast preset. |

Also:
- Auto-suggest a style from the imported image (grayscale vs color, line density, fill ratio). The artist can override.
- A **stencil preview** toggle that shows the design as purple thermal-stencil lines on the skin.
- Placement tips shown per body area (for example: designs read best when they follow the long axis of the limb; fine detail over elbows and knees distorts with movement).

### 8. Client presentation and export
- "Client view" mode: hides all tools, slow turntable, big clean render.
- Side-by-side comparison of two placements or two sizes.
- Export high-resolution PNG screenshots (front, back, and close-up).
- Export a one-page PDF consult sheet: front and back views, close-up, design thumbnail, dimensions, placement, style, date, studio name/logo placeholder.
- Save and load a session file locally (JSON plus embedded design images).

### 9. Backend (Phase 3)
- Artist login, client records, saved sessions (body settings, layers JSON, design files in storage).
- Read-only share link so a client can view their preview on their phone.
- Keep the app fully usable offline without the backend.

## Performance targets
- 60 fps on a recent iPad and a mid-range laptop.
- Body GLB under 10 MB, initial load under 4 seconds on studio Wi-Fi.
- Background removal under 2 seconds for a 4000 px image.
- No main-thread work over 50 ms during interaction (use workers).

## Build in phases, stop after each phase and show me

**Phase 0: Technical spike (do this first).**
- Get the body model: produce the male and female GLBs from MakeHuman/MPFB2 or Anny, confirm the license in writing in `docs/licenses.md`.
- Build a test page comparing three methods on the same 1-inch checkerboard design: `DecalGeometry`, cylindrical wrap on a forearm, and exponential map on the shoulder blade. Save screenshots and measure distortion (how far grid cells deviate from square and from 1 inch). Report results and your recommendation.

**Phase 1: MVP.** Viewer, one male and one female body, skin tones, import (PNG/JPG/SVG/.ai/PDF), background removal, cylindrical wrap on arms and legs, surface mode on the torso and back, move/rotate/scale in inches, screenshot export.

**Phase 2: Pro features.** Body part and area picker, brush areas, fit to area, multiple layers, mirror, ink map baking, healed/fresh/aged looks, style library and warnings, stencil preview, client view, consult sheet PDF, session save/load, PWA.

**Phase 3: Backend.** Accounts, saved clients and sessions, share links.

## Acceptance checks
- A 1-inch grid wrapped on a forearm measures within 5% of 1 inch per cell and cells stay visually square.
- A full 360 degree band on the forearm closes with no visible gap or overlap at the seam.
- A back piece crossing a UV seam shows no seam line.
- A black line drawing on white imports with clean, halo-free lines and fully transparent gaps between lines.
- A PDF-compatible .ai imports; a non-compatible .ai shows the friendly re-save message.
- Works with touch on iPad Safari.

## How to work
- Before coding, write `docs/plan.md` with architecture, file structure, and your decisions, and keep a running `docs/decisions.md`.
- Verify anything you are unsure of (library APIs, licenses, the exponential map paper) by reading the source or docs rather than guessing.
- Write tests for the wrap math, exponential map, and background removal before polishing UI.
- Keep code modular: `body/`, `regions/`, `projection/` (cylindrical, expmap), `ink/` (baking, shaders), `import/`, `bgremove/`, `styles/`, `export/`, `ui/`.
- If you hit a real blocker (for example, a body model source does not export cleanly), stop and tell me the options rather than silently switching to something with a restrictive license.
