# Photoreal skin and tattoo-ink rendering in real-time web (three.js, iPad budgets)

Context: the app already uses MeshPhysicalMaterial plus a custom shader (per-channel wrap-lighting SSS, procedural pores, per-vertex AO, sheen, regional colour masks, neutral tone mapping, procedural studio env). These notes rank what to add next.

Research caveat: many primary sources (Epic docs, NVIDIA GPU Gems site, MJP's blog, three.js forum, gamedeveloper.com) were blocked by the network egress proxy in this session, so some detail comes from search-result snippets rather than full-page reads. Items I recall but could not check here are listed under **Gaps** as "unverified".

## 1. Subsurface scattering options (screen-space separable, pre-integrated, diffusion profiles, transmission) and feasibility in three.js / iPad

### Takeaway
On iPad the best ratio of quality to cost is a **single-pass pre-integrated (Penner) diffuse LUT driven by curvature**, plus a cheap **thickness/back-light transmission term** for ears, fingers and nostrils. Both run inside the existing forward MeshPhysicalMaterial via `onBeforeCompile`. Screen-space separable SSS (Jimenez) gives the best image quality (about 0.5 ms on desktop with 7 samples). On the web, though, it needs a separate diffuse-only render target and two blur passes at full resolution. That is a lot of fill-rate on a Retina iPad, so treat it as a "high quality / still capture" mode, not the default.

### Cited Findings
- **Separable SSS (Jimenez et al. 2015, CGF 34(6):188-197).** It approximates the 2D diffuse profile with a single separable kernel, so it needs only two 1D convolutions instead of up to 12 for sum-of-Gaussians. It needs "under 0.5 milliseconds per frame", and with importance sampling and jittering "only seven samples per pixel are required". — [TU Wien publication page](https://www.cg.tuwien.ac.at/research/publications/2015/Jimenez_SSS_2015/); [Semantic Scholar](https://www.semanticscholar.org/paper/Separable-Subsurface-Scattering-Jim%C3%A9nez-Zsolnai/eb6638a3b49528ff0661d9b2ef483ea0bf21170f)
- An earlier tech report from 2012 states the core observation: the diffusion kernel is mathematically non-separable, but a separable approximation shows no perceived loss of quality. — [Unizar tech report RR-02-12](https://graphics.unizar.es/papers/s4_techreport12.pdf)
- **Reference code:** `iryoku/separable-sss` is under **BSD 2-Clause**. Binary distributions must carry the attribution "Uses Separable SSS. Copyright (C) 2011 by Jorge Jimenez and Diego Gutierrez". The code is a DirectX 10 demo plus an HLSL header, so a web version means porting it to GLSL or TSL. — [separable-sss README](https://raw.githubusercontent.com/iryoku/separable-sss/master/README.md)
- **Unreal's Subsurface Profile shading model works in screen space.** Epic says this is the more effective way to show the subtle subsurface effects of skin. — [Epic docs (via search snippet)](https://dev.epicgames.com/documentation/en-us/unreal-engine/subsurface-profile-shading-model-in-unreal-engine)
- **David Lenaerts (Der Schmale) has a live three.js screen-space SSS skin demo.** It includes variance shadow maps, depth of field and filmic tone mapping. This proves the technique works in WebGL. The licence was not visible in the search results. — [Der Schmale skin SSS demo](https://www.derschmale.com/lab/doodles/skinsss/build/)
- **Pre-integrated skin shading (Penner & Borshukov, GPU Pro 2, 2011).** It takes a single rendering pass, unlike multi-pass texture-space diffusion, so it is "efficient and relatively easy to integrate". Diffusion profiles are pre-integrated into a LUT. The key insight is that scattering is not visible where the surface is flat and lighting is uniform, so you only need to account for curvature and shadow edges. — [Semantic Scholar](https://www.semanticscholar.org/paper/Pre-Integrated-Skin-Shading-Penner-Borshukov/9e7f19fba55066e98f9d8c8fc4511071c548ad20); [ResearchGate](https://www.researchgate.net/publication/345137571_Pre-Integrated_Skin_Shading)
- **The pre-integrated approach only costs a LUT lookup**, works in forward and deferred renderers, and suits mobile GPUs. Unreal's mobile roadmap lists a "pre-integrated SSS shading model" as a mobile rendering improvement. — [Appocrypha: two SSS methods for games](https://suhyeokkim.github.io/2022/04/30/two-sss-skin-represation-method-for-game); [UE public roadmap](https://portal.productboard.com/epicgames/1-unreal-engine-public-roadmap/c/453-mobile-rendering-improvements)
- **NVIDIA FaceWorks (GTC 2014, Nathan Reed) productised pre-integrated SSS plus "deep scattering" (transmission).** A Unity port also exists. — [Reed: FaceWorks talk](https://www.reedbeta.com/talks/faceworks/); [slides PDF](https://www.reedbeta.com/talks/faceworks/gtc-2014-faceworks.pdf)
- **A pre-integrated reference implementation exists:** `codewings/PreIntegrated-Skin` provides both a LUT and a curve approximation, which avoids the texture fetch. It also references UE4 SeparableSSS diffusion profiles and Spherical Gaussian SSS. — [GitHub codewings/PreIntegrated-Skin](https://github.com/codewings/PreIntegrated-Skin)
- **GPU Gems 3 ch.14 (d'Eon & Luebke).** Six Gaussians are needed to match the Donner-Jensen three-layer skin model. One implementation uses variances 0.0064, 0.0484, 0.187, 0.567, 1.99 and 7.41 mm² with per-channel RGB weights. The weights for each profile sum to 1.0 because the albedo map, not the profile, carries skin colour. — [GPU Gems 3 ch.14 (search snippet)](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-14-advanced-techniques-realistic-real-time-skin); [dqlin SSS notes](https://dqlin.xyz/tech/2016/12/02/03_sss/)
- **three.js ships `SubsurfaceScatteringShader`**, used in the `webgl_materials_subsurface_scattering` example. It is based on the GDC 2011 talk "Approximating Translucency for a Fast, Cheap and Convincing Subsurface Scattering Look" (DICE). The core term is `pow(saturate(dot(V, -normalize(L + N*distortion))), power) * scale`, plus ambient, multiplied by the thickness map, attenuation and light colour. Default uniforms: distortion 0.1, ambient 0.0, attenuation 0.1, power 2.0, scale 10.0. The licence is MIT, because it is part of three.js. — [three.js SubsurfaceScatteringShader.js](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/shaders/SubsurfaceScatteringShader.js); [fossies copy of example](https://fossies.org/linux/three.js/examples/webgl_materials_subsurface_scattering.html)
- **Matt DesLauriers posted a gist** that patches the same "TRANSLUCENCY" term into the three.js PBR (Standard/Physical) fragment shader. That is the pattern this app would use. — [mattdesl gist](https://gist.github.com/mattdesl/2ee82157a86962347dedb6572142df7c)
- **SSS on smartphones:** a 2014 paper surveys SSS object-rendering techniques for real-time smartphone games. — [Lee et al. 2014, Mathematical Problems in Engineering](https://www.hindawi.com/journals/mpe/2014/846964/)

### Inferences
- **Recommended stack for iPad, cheapest first:**
  1. Keep the per-channel wrap lighting as a fallback.
  2. Replace it with a Penner LUT, a 128x128 RGBA8 texture indexed by (N·L×0.5+0.5, curvature). Curvature can be pre-baked per vertex at export (the app already bakes per-vertex AO and region attributes) or computed with `length(fwidth(N))/length(fwidth(P))`. Cost: one texture fetch per light, which is negligible.
  3. Add the DICE/three.js thickness transmission term. Use a baked per-vertex or texture thickness (ears, fingers, nose, webbing between fingers) coloured deep red, roughly (1.0, 0.25, 0.1).
- **Treat screen-space separable SSS as optional.** It needs (a) MRT or a second pass to separate diffuse from specular, (b) a depth buffer for depth-aware blur, and (c) two full-screen 7–17-tap passes. On an A12 iPad at DPR 2 that is about 2× full-screen fill for the blurs alone. Gate it behind device tier, or use it for the "photo/export" render only (render once at high quality, not every frame).
- **Pre-integrated SSS cannot blur albedo detail.** That is fine for tattoos, because ink detail should stay sharp-ish. Screen-space SSS, by contrast, blurs the irradiance only if it is applied before the albedo multiply (the "post-scatter" texturing in GPU Gems 3). Get this order right or the tattoo will look smeared.

### Gaps
- No concrete ms figures were found for separable SSS on any Apple GPU or in WebGL/WebGPU. Desktop "<0.5 ms" figures date from roughly 2012-2015 PC GPUs.
- The licence of the Der Schmale demo and of the codewings PreIntegrated-Skin repo could not be verified, because GitHub API access and the fetches were blocked.
- No maintained, licensed three.js separable-SSS library (npm) was found. The three.js forum thread "[Skin shading with Screen-Space Sub Surface Scattering](https://discourse.threejs.org/t/skin-shading-with-screen-space-sub-surface-scattering/83939)" exists but could not be read (blocked).
- Unverified (recalled, not checked this session): Burley normalized diffusion (Disney 2015) replaced separable SSS as UE's default profile model around UE 4.25+ and MetaHuman. three.js `MeshPhysicalMaterial.thickness`/`transmission` is a refraction-style transmission (it renders a transmission render target) and is **not** a skin SSS substitute. It is expensive (an extra scene pass) and should be avoided for skin.

## 2. Skin detail: photographic albedo vs procedural, micro/detail normals, cavity, roughness variation, dual-lobe specular, MetaHuman approach

### Takeaway
The biggest realism win after SSS is **specular breakup**: a tiling micro-normal map (pores and fine wrinkles) blended over the base normal, a cavity/specular-occlusion term, roughness variation by region, and **two specular lobes** (one sharp and oily, one broad). MetaHuman and the GPU Gems/Activision lineage all do this. A photographic or scanned albedo beats procedural for colour mottling, but it needs licensed scan data. A tiling detail albedo/normal at 2–4k on top of the procedural base colour is the pragmatic middle ground.

### Cited Findings
- **MetaHuman/UE dual lobe specular:** it "provides roughness values for two separate specular lobes that are combined for the final result", which "provide[s] nice subpixel micro-frequencies in the skin". The default MetaHuman skin material includes SSS and dual-lobe specular. — [Epic Digital Humans docs (search snippet)](https://docs.unrealengine.com/4.27/en-US/Resources/Showcases/DigitalHumans); [MetaHuman Skin Material Controls](https://dev.epicgames.com/documentation/metahuman/skin-material-controls)
- **UE Digital Humans blends several normal maps** to capture medium and micro detail. Cavity maps define surface detail and light occlusion. Micro normals (pores, small imperfections) come from scan data or are derived from the specular map, and are applied on top of the base normal. — [Epic Digital Humans (search snippet)](https://docs.unrealengine.com/4.27/en-US/Resources/Showcases/DigitalHumans); [texturing.xyz: Creating realistic skin in UE4](https://texturing.xyz/pages/saurabh-jethani-creating-realistic-skin-in-ue4)
- **An open-source "SkinShader" based on Activision's papers** includes dual specular lobes, cavity with Fresnel occlusion, bent-normal + AO support, and translucency based on DICE + Farfarer's Unity adaptation. It is a compact reference for which features matter. — [GitHub Safemilk/SkinShader](https://github.com/Safemilk/SkinShader)
- **Kelemen/Szirmay-Kalos specular (GPU Gems 3 §14.3)** uses a precomputed Beckmann lookup texture with Schlick Fresnel. It is the classic real-time skin specular. — [GPU Gems 3 ch.14](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-14-advanced-techniques-realistic-real-time-skin); [Unity skin shader notes](https://github.com/douduck08/Unity-SkinShader)
- **A modern alternative:** normalized (Burley) diffusion plus GGX dual-lobe specular is described with implementation details. — [Shih-Chin Weng: Realistic Human Skin with Normalized Diffusion & GGX](https://shihchinw.github.io/2015/12/realistic-human-skin-with-normalized-diffusion-ggx.html)
- **Reallusion's CC/iC Unreal skin setup** exposes micro-normal tiling, cavity and SSS controls. These are good parameter references for artist-facing sliders. — [Reallusion manual: Skin](https://manual.reallusion.com/CC_and_IC_Auto_Setup_Plugin/ENU/CC_and_iC_Auto_Setup/1.2/02_for_Unreal/Skin.htm)

### Inferences
- **Dual lobe in three.js without a full custom BRDF:** MeshPhysicalMaterial already has a base specular lobe plus a **clearcoat** lobe with its own roughness and normal. Setting `clearcoat ≈ 0.05–0.15`, `clearcoatRoughness ≈ 0.25–0.35`, and base `roughness ≈ 0.5–0.6` approximates a sharp oily lobe over a broad lobe at almost zero extra cost. Drive the clearcoat intensity from a regional mask (oily T-zone and nose, lips, fresh-tattoo area). This is cheaper and simpler than adding a Kelemen term.
- **Detail normals:** use a tiling 512–1024² micro-normal (pore) map blended with RNM/UDN over the base normal. Tiling frequency matters more than resolution. Fade intensity with distance (`fwidth`) to avoid aliasing shimmer on iPad. This can replace the procedural pores, which are often too regular. The same micro-normal should also modulate roughness slightly (pores are rougher) and feed a cavity/specular-occlusion term `spec *= mix(1, cavity, k)`.
- **Specular anti-aliasing:** on Retina iPad with no MSAA on post targets, use roughness widening from normal variance (Kaplanyan/Tokuyoshi style, `roughness = sqrt(r² + variance)`). It is cheap and prevents pore sparkle.
- **Albedo:** keep the melanin-based procedural base, but add a low-frequency **mottling/haemoglobin** variation texture (redness at knuckles, elbows, knees, cheeks) via the existing regional masks. Full photographic albedo per body tone is a content and licensing problem, not a rendering one.

### Gaps
- MetaHuman's exact default dual-lobe parameters could not be verified because the Epic pages were blocked. Unverified recollection: Subsurface Profile defaults "Roughness 0 = 0.75", "Roughness 1 = 1.30" (multipliers) and "Lobe Mix = 0.85".
- Licences for texturing.xyz and 3D-scan skin detail maps were not researched. Those vendors are commercial. Scan-site domains (ten24, humanscanrepository) were unreachable.

## 3. Hair, eyebrows, eyelashes, vellus/peach fuzz on the web

### Takeaway
For a tattoo preview, scalp hair is optional. Brows and lashes matter more for the face. Peach fuzz is best done as a **shading term** (sheen and Fresnel rim), not geometry. If hair is needed, use **hair cards with alpha-to-coverage**: there is an MIT three.js shader that supports both WebGL and WebGPU. Strand rendering is not iPad-viable at quality.

### Cited Findings
- **`creategamecharacters/threejs-hair-shader`** is an MIT-licensed hair-card shader for three.js covering WebGLRenderer (GLSL patches) and WebGPURenderer (TSL). Features: strand coverage, depth, soft edges, root-to-tip colour, anisotropic highlights. It packs data into one RGB atlas (R coverage, G root-to-tip, B variation, `NoColorSpace`). With MSAA it uses an opaque alpha-to-coverage pass plus a blended fringe. Without MSAA it uses a depth-writing blended outer pass over an alpha-tested core. — [GitHub README](https://raw.githubusercontent.com/creategamecharacters/threejs-hair-shader/main/README.md)
- **Hair cards are the standard real-time compromise:** textured strips with alpha that render far faster than strands. Alpha-test ("masked") avoids sorting problems. — [Yelzkizi hair cards](https://yelzkizi.org/create-hair-cards-in-blender/); [Wikipedia: Alpha to coverage](https://en.wikipedia.org/wiki/Alpha_to_coverage)
- **A 2026 hobby project ("Vibe Coding Metahuman with ThreeJS")** renders hair partly as curves and partly as card meshes "to achieve more volume with less strands". — [X post by @alightinastorm](https://x.com/alightinastorm/status/2055111991681851549)
- **"Fuzzy Meshes"** (Szenia Zadvornykh) is a three.js technique for fur and fuzz via instanced shells or fibres. — [Medium: Fuzzy Meshes](https://medium.com/@Zadvorsky/fuzzy-meshes-4c7fd3910d6f)
- **NVIDIA's SIGGRAPH 2008 hair session** is a classic reference for strand rendering and its cost. — [NVIDIA RealTimeHairRendering PDF](https://developer.download.nvidia.com/presentations/2008/SIGGRAPH/RealTimeHairRendering_SponsoredSession2.pdf)

### Inferences
- **Brows:** the app already paints brows via a region texture. Upgrade path: a small set of alpha cards (about 20–40 quads per brow) or a high-frequency strand-direction normal + anisotropic spec decal. Cards add depth parallax at grazing angles.
- **Lashes:** one alpha-to-coverage card strip per lid (a few hundred triangles) is standard. Requires MSAA on the main framebuffer. WebGL2 `antialias:true` gives MSAA on the default framebuffer, but post-processing render targets need `samples: 4` explicitly.
- **Peach fuzz / vellus:** MeshPhysicalMaterial `sheen` (Charlie/Estevez-Kulla) with a pale, low-intensity `sheenColor` and `sheenRoughness ≈ 0.3–0.5` already approximates the grazing-angle fuzz glow. The app already uses sheen. Mask it regionally (stronger on forearms, face and back; weaker on palms). For tattoos, vellus glow over ink at grazing angles is a subtle realism cue.

### Gaps
- No measured iPad cost for alpha-to-coverage hair cards in WebGL/WebGPU was found.
- The threejs-hair-shader README states no performance numbers.

## 4. Lighting: HDRI/IBL, soft shadows, contact shadows, SSAO/GTAO (N8AO, pmndrs), iPad cost

### Takeaway
Real HDRI image-based lighting (PMREM) is the cheapest large realism gain, because it is a one-time prefilter. Per-pixel cost is the same as the procedural env. For AO, **N8AO (CC0)** in "Performance" or "Low" mode at **half resolution** is the best web option, and it plugs into pmndrs/postprocessing. Budget about 1–3 ms on recent iPads (an estimate, see gaps). On older A12 iPads, prefer the existing baked per-vertex AO plus a baked or blurred contact shadow, and skip screen-space AO.

### Cited Findings
- **N8AO licence: CC0-1.0** ("do whatever you want with it, no attribution required"). — [N8AO README](https://raw.githubusercontent.com/N8python/n8ao/master/README.md); [npm n8ao](https://www.npmjs.com/package/n8ao/v/1.1.0)
- **N8AO quality presets (AO samples / denoise samples):**

  | Preset | AO samples | Denoise samples | Recommended for |
  |---|---|---|---|
  | Performance | 8 | 4 | "Mobile, Low-end iGPUs and laptops" |
  | Low | 16 | 4 | "High-End Mobile, iGPUs, laptops" |
  | Medium | 16 | 8 | |
  | High | 64 | 8 | |
  | Ultra | 64 | 16 | |

  Neural variants also exist.
  - **Half-resolution mode** with depth-aware upsampling gives a "2x-4x" performance boost.
  - **Pipelines:** `N8AOPostPass` works with pmndrs/postprocessing; `N8AOPass` works with three's EffectComposer.
  - **Tinted AO:** a `color` option gives a GI-like tint (useful for warm skin-coloured occlusion).
  - **Transparency:** transparent objects that write depth get rendered twice, which costs performance.

  — [N8AO README](https://raw.githubusercontent.com/N8python/n8ao/master/README.md)
- **A WebGPU/TSL port of N8AO exists** (`MarioAndF/n8ao-webgpu`). — [GitHub n8ao-webgpu](https://github.com/marioandf/n8ao-webgpu)
- **three.js forum comparison** of the new HBAO example against N8AO. — [three.js forum](https://discourse.threejs.org/t/new-ambient-occlusion-example-hbao-vs-n8ao/58847)
- **pmndrs/postprocessing is Zlib-licensed.** Its EffectPass automatically merges effects into fewer passes. Documented options include SSAO, Bloom, Tone Mapping and SMAA. HalfFloat buffers are preferred for HDR; UnsignedByte sRGB buffers cause banding in dark scenes. — [pmndrs/postprocessing README](https://raw.githubusercontent.com/pmndrs/postprocessing/main/README.md)
- **Mobile performance guidance:**
  - Cap devicePixelRatio at 2; "one line of code (capping pixel ratio) can double mobile frame rate".
  - Half-resolution post-processing roughly doubles frame rate in fill-bound scenes.
  - Bloom and SSAO are the first things to drop on mobile.

  These are guidance articles, not benchmarks. — [utsubo 100 Three.js tips (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips); [Digital Strategy Force mobile optimisation](https://digitalstrategyforce.com/journal/how-do-you-optimize-threejs-performance-for-mobile-devices/); [Codrops: Building Efficient Three.js Scenes (2025)](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
- **On iOS, full devicePixelRatio commonly yields about 40 fps vs 60 fps without it** (anecdotal forum report). — [three.js forum: Low fps on iOS with devicePixelRatio](https://discourse.threejs.org/t/low-fps-on-ios-mobile-with-pixel-ration-set-as-window-devicepixelratio/4963)
- **Dynamic pixel ratio** in the range 0.9–2.0 can keep mobile fps stable between 30 and 60. — [three.js forum: Changing pixelRatio based on fps](https://discourse.threejs.org/t/changing-pixelratio-based-on-fps-good-or-bad-idea/34563)
- **WebGPU on iPad:** Safari 26 ships WebGPU on by default on macOS, iOS, iPadOS and visionOS (announced at WWDC25). — [WebKit blog: Safari 26 beta](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/); [web.dev: WebGPU supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers)
- **three.js WebGPURenderer** is a near drop-in swap that falls back to WebGL2 automatically. — [utsubo: What's New in Three.js 2026](https://www.utsubo.com/blog/threejs-2026-what-changed). That source says "r171 shipped in September"; this is an aggregator claim and the release-month detail looks unreliable (treat with caution).

### Inferences
- **HDRI:** load a small real studio HDRI (1k–2k equirect, `.hdr` or compressed `.ktx2`/UltraHDR) through PMREMGenerator. Many Poly Haven HDRIs are CC0. Licence not checked in this session, see gaps. Use the procedural env only as a fallback. Lighting skin with a real captured HDRI gives believable specular reflections in the dual-lobe spec, which is where skin realism lives.
- **Shadows:**
  - Use a single directional key light with PCFSoftShadowMap or VSM at 1024–2048. A softer penumbra reads more like a studio.
  - Add the existing contact shadow (blurred depth-projected plane, as in the three.js `webgl_shadow_contact` example), which is cheap if rendered once or on change rather than per frame.
  - Pre-integrated SSS also uses a "shadow-edge" LUT dimension. Sampling the LUT with a softened shadow term gives the red penumbra bleed that sells skin.
- **AO stack on iPad:** keep the per-vertex AO for large-scale occlusion (armpits, between fingers). Add N8AO half-res "Performance" only on A15+/M-series or for still capture. Tint the AO colour toward a warm dark red (around #3a1a14) so creases don't go grey.
- **Render-on-demand:** this is a mostly static preview app. Render only when the camera, design or lighting changes, and add temporal accumulation for the still "photo" mode. Heavy effects (separable SSS, 64-sample AO, supersampling at DPR 3) are then affordable even on A12 for the exported image.

### Gaps
- **No measured millisecond numbers were found** for N8AO, SSAO or GTAO on any iPad (A12–M4) in WebGL or WebGPU. The "1–3 ms" figure above is my estimate, not a sourced number. The report should recommend in-app profiling (for example `EXT_disjoint_timer_query_webgl2` is not available in Safari, so use frame-time sampling or WebGPU timestamp queries where exposed).
- Poly Haven HDRI licence (believed CC0) was not verified this session.
- No three.js GTAO example cost data was retrieved.

## 5. Rendering tattoo ink in skin realistically (fresh vs healed vs aged; industry and paper approaches)

### Takeaway
Physically, healed ink is a **pigment layer in the dermis below a scattering epidermis**. In a shader that means:
- **Multiply the ink into the albedo *before* the subsurface/diffuse lighting**, so skin lighting, pores, specular and sheen all sit *on top of* the ink.
- Soften and slightly blur edges, with more blur and spread for older tattoos.
- **Desaturate and lift the blacks toward blue-grey with age.**
- **Do not** make the ink a separate unlit decal or reduce specular over it.

A fresh tattoo adds redness, a slight raised swelling normal, and higher gloss (ointment or plasma) over the inked area.

### Cited Findings
- **Over time, ink particles migrate to the deeper (reticular) dermis**, which gives the tattoo a faded and blurred look. Ink also leaves via the vasculature and lymphatics. — [Beilstein J. Nanotechnol.: Tattoo ink nanoparticles in skin tissue](https://www.beilstein-journals.org/bjnano/articles/6/120)
- **"Black inks will shift to a blue tone when aging"** because of skin scattering and diffusion of pigment to deeper layers. Shorter (blue) wavelengths scatter more than red. — [Diffused reflectance measurements to detect tattoo ink (d-nb.info PDF)](https://d-nb.info/1251592023/34)
- **During healing, tattoos look cloudy or faded** because new skin over the ink acts like a cloudy veil that scatters light before it reaches the pigment. Black can look grey and fine lines softer. This is a practitioner blog, lower authority. — [Eraditatt: Do tattoos fade during healing? (2026)](https://eraditatt.com/2026/08/26/do-tattoos-fade-during-healing/)
- **Optical tissue phantoms** that mimic the dermis scattering coefficient are used to study ink appearance and detection. The scattering coefficient of the matrix around the ink changes its appearance. — [PMC: Colored tattoo ink screening with optical tissue phantoms and Raman](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8227768/)
- **Dermoscopy literature documents how tattoo pigment appears** in skin structure. — [PMC: Dermoscopic changes of tattoos over melanocytic nevi](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11342996/)
- **In VFX/offline practice**, artists worry that SSS will wash out tattoo or makeup detail. Advice includes a separate tattoo material channel with SSS disabled, or a greyscale SSS-weight map. Another approach is to layer tattoo materials over skin with blend modes in a layering system. — [Autodesk forum: SSS vs makeup/tattoos](https://forums.autodesk.com/t5/maya-shading-lighting-and/how-to-have-subsurface-scattering-and-not-have-it-interfere-with/td-p/10888740); [Daz3D forum: Shader + tattoo issue](https://www.daz3d.com/forums/discussion/40535/body-marked-up-shader-tattoo-issue)
- **Pixar's RenderMan photorealistic head** is a reference for layered skin in offline rendering. — [Pixar RenderMan photorealistic head](https://renderman.pixar.com/photorealistic-head)

### Inferences
These are concrete shader recipes for the app.

**Base composition (healed ink)**
- Compute `albedoSkin`, then `albedo = albedoSkin * mix(vec3(1), inkColorLinear, inkAlpha * inkDensity)`. This is a multiply in linear space, not an "over" blend.
- With pre-integrated or wrap SSS, this keeps the ink receiving the same red-shifted terminator as the skin, which is correct because the ink sits under the epidermis.
- Never fully black: real black ink has albedo around 0.03–0.06 linear after the epidermis, and the epidermis adds a faint skin-tone veil. So use `inkColor = mix(inkColor, albedoSkin, epidermisVeil)` with a veil of about 0.05–0.15.
- That veil should be higher for "healing" (about 0.3, cloudy) and for darker melanin skin. Melanin sits *above* the ink in the epidermis, so darker skin reduces ink contrast and colour saturation. That is a realism point clients care about, and it fits the app's existing melanin model.

**Scatter blur**
- Healed and aged ink edges should be blurred by a dermal kernel. Pre-blur the tattoo texture with mip bias: sample `textureLod` at a slightly higher LOD, or blend a pre-blurred copy by age. Aged ink uses a larger radius and per-channel spread (red spreads more than blue, mirroring the skin diffusion profile).
- A cheap per-pixel way to do this is to sample the ink mask at 2–3 LODs and weight per RGB channel. That is a "per-channel diffusion profile on the ink texture", baked once when the design changes rather than per frame.

**Ageing colour shift**
- Desaturate, lift blacks, and shift black toward blue-green-grey (cited "black shifts blue"), with a slight overall contrast loss.

**Specular and normals**
- **Do not** reduce specular or sheen over healed ink. The skin surface is unchanged, so pores, micro-normal, sheen and dual-lobe spec must all continue over the tattoo. This is one of the strongest "it's in the skin, not a sticker" cues.
- **Fresh ink:**
  - Increase the clearcoat (oily) lobe intensity and lower its roughness (about 0.15–0.25) over the inked area plus a few mm margin, to look like ointment or plasma.
  - Add a pink/red erythema halo in the albedo (spreading 2–5 mm beyond the lines, soft falloff).
  - Optionally add slight line swelling via a normal perturbation from the blurred ink mask's gradient.
  - The first days can show slight raised lines and fine blood or plasma at line edges.

**Linework**
- Real lines have small irregularities: needle-depth variation shows as density noise along the stroke. Modulate `inkDensity` by a low-amplitude, high-frequency noise (about 5–10 %) tied to the skin UV or tangent space, so it doesn't swim with the design.

**SSS interaction**
- With screen-space separable SSS, apply ink in albedo using post-scatter (or pre+post sqrt split) texturing, so the blur does not smear the design more than real dermis would.
- GPU Gems 3's guidance that profile weights sum to 1 and colour lives in albedo supports keeping ink purely in albedo.

**Fit with the existing app**
- These map naturally onto the existing "Fresh / healed / aged ink" states (task #10 in the app).

### Gaps
- **No graphics paper was found that specifically models tattoo ink for real-time rendering.** The industry systems requested (The Sims tattoo system, Cyberpunk 2077 tattoo layers, Substance tattoo layer workflows, Unreal tattoo layers) were not documented in reachable sources this session. I found no reliable public technical writeups. Treat any claims about how those games implement tattoos as unknown.
- No quantitative albedo or reflectance values for tattoo ink through epidermis were extracted. The d-nb.info and PMC phantom papers likely have spectra but were not fetched in full.

## 6. Concrete performance numbers on iPad/mobile

### Takeaway
Hard published numbers for skin-specific techniques on iPad in WebGL/WebGPU are essentially absent. The sourced figures below are desktop-era algorithm costs and generic mobile web guidance. The strongest, most consistent advice is to:
- cap DPR at about 2 (or use dynamic DPR),
- run post effects at half resolution,
- render on demand, and
- reserve multi-pass effects for still captures.

### Cited Findings
- **Separable SSS:** <0.5 ms per frame, 7 samples per pixel, on PC GPUs of its era. — [Jimenez et al. 2015](https://www.cg.tuwien.ac.at/research/publications/2015/Jimenez_SSS_2015/)
- **N8AO half-res** gives a 2–4× speedup. The "Performance" preset (8+4 samples) is recommended for mobile. — [N8AO README](https://raw.githubusercontent.com/N8python/n8ao/master/README.md)
- **DPR cap at 2** can double mobile frame rate. On iOS, about 40 fps at full DPR vs 60 fps without it (anecdotal). — [utsubo tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips); [three.js forum](https://discourse.threejs.org/t/low-fps-on-ios-mobile-with-pixel-ration-set-as-window-devicepixelratio/4963)
- **setPixelRatio on iPad** caused viewport scaling issues historically. — [three.js issue #9500](https://github.com/mrdoob/three.js/issues/9500)
- **Pre-integrated SSS costs only a LUT lookup** (qualitative). — [Appocrypha](https://suhyeokkim.github.io/2022/04/30/two-sss-skin-represation-method-for-game)

### Inferences
**Suggested tiering**

| Tier | Devices | What to run |
|---|---|---|
| Tier 0 | A12–A14 | Forward pass only: pre-integrated LUT, thickness transmission, micro-normal, clearcoat second lobe, sheen, HDRI IBL, per-vertex AO, static contact shadow. DPR ≤ 1.5–2. No post except tone mapping and FXAA/SMAA. |
| Tier 1 | A15–A17, M1 | Tier 0 plus N8AO "Performance" at half-res, plus MSAA ×4 for lash/brow cards. |
| Tier 2 | M2–M4 iPad Pro | Plus optional separable SSS (two 1D passes, 7–11 taps) and N8AO "Low/Medium". |
| Photo/export, all tiers | | Render once at high settings (supersampled, full SSS, high AO); frame-time doesn't matter. |

**WebGPU:** now default in Safari 26. It is attractive for compute-based blurs (SSS, AO) but adds migration cost (TSL rewrite of the `onBeforeCompile` shader patches). Keep WebGL2 as the primary path unless a WebGPU-only feature is needed.

### Gaps
- No benchmark of three.js MeshPhysicalMaterial (with sheen/clearcoat) per-pixel cost on Apple GPUs was found.
- No WebGPU-vs-WebGL2 skin/post-processing comparison on iPad was found.
- These should be measured in-app.
