# Body Shape and Skin Variation for Tattoo Previews (and How 3D Body Tools Model It)

Research date: 2026-10-01. Anny facts come from a local clone of https://github.com/naver/anny (commit d6fc027, 2026-09-28); MPFB2 facts from a clone of https://github.com/makehumancommunity/mpfb2. Several primary sites were blocked by this session's network proxy (is.mpg.de, dev.epicgames.com, static.makehumancommunity.org, medicalnewstoday.com, skin-artists.com, thinktanktattoo.com), so some claims rely on search-result summaries; these are flagged.

**Source quality warning:** almost all of the tattoo-practice sources that could be reached are studio or SEO blog posts, not peer-reviewed work. They agree with each other, but they are opinion and practitioner advice, not measured data. I found no reachable Reddit r/tattooartists threads.

## 1. Which body characteristics change how a tattoo looks, sits or must be sized (artist perspective)

### Takeaway
Artists care most about (a) soft tissue that moves or changes volume (breasts, belly, inner thigh, upper-thigh/hip crease), (b) curvature that a flat stencil must bend around (ribs, under-bust, thighs), and (c) skin texture such as stretch marks, scars and aged or crepey skin, which changes how ink heals and reads. Placement is judged standing and braless, and designs are curved to follow the rib line or breast contour. For a preview tool, this means the controls that matter most are breast size/position, belly volume, thigh and hip volume, and a few skin-texture overlays, not a long list of facial sliders.

### Cited Findings
**Breasts, under-bust, sternum, ribs**
- Under-bust tattoos sit where breast tissue meets the ribcage, so the skin moves with breathing, posture and breast shape, not just with the bone. The advice is to test the stencil standing without a bra, so the main line stays visible and is "not tucked under the fold", especially to frame fuller breasts — [Tattoos Wizard rib/sternum guide](https://tattooswizard.com/blog/rib-and-sternum-tattoo-guide) (via search summary)
- On curvier torsos, designs "may need to follow more pronounced contours, especially under the breast or around the side ribs", so the tattoo "complements breast shape rather than fighting it". A stiff upright sketch "usually needs to be softened, tilted, or stretched into an arc that tracks the rib line" — [Tattoos Wizard](https://tattooswizard.com/blog/rib-and-sternum-tattoo-guide) (via search summary)
- Skin under the bust folds and stretches when you sit, raise your arms or lean forward. Most artists place the stencil while you stand and breathe normally, and you may need to show the artist how your breasts sit without a bra — [Serving Some Lines underbust guide](https://servingsomelines.com/blogs/tattoo-guides/underbust-tattoo-ideas-sternum-placement-guide); [Holistic Ink](https://www.holisticink.com/underboob-tattoo-boob-tattoos/) (via search summary)
- Under-bust pieces can extend into the cleavage or over the sternum. The "most flattering pieces follow the curve of the ribs instead of cutting straight across" — [The Ink Factory](https://www.theinkfactory.ie/tattoos/underboob-tattoos/); [Serving Some Lines](https://servingsomelines.com/blogs/tattoo-guides/underbust-tattoo-ideas-sternum-placement-guide) (via search summary)
- The ribs move with every breath and are rubbed by bras, seatbelts and sleep positions, so lines are laid into moving skin — [Tattoos Wizard](https://tattooswizard.com/blog/rib-and-sternum-tattoo-guide) (via search summary)

**Stomach, weight change, pregnancy**
- In pregnancy, stomach skin stretches and tattoos "may experience warping or distortion", appearing "stretched or misshapen". New stretch marks may run around or through the design — [Platinum Ink](https://platinumink.net/stomach-tattoos-after-pregnancy-what-changes/); [theAsianparent](https://sg.theasianparent.com/what-happens-to-stomach-tattoos-after-pregnancy) (via search summary)
- How much a stomach tattoo changes depends on its size and placement, how much weight is gained, and skin elasticity. The outcome is unpredictable: some warp a lot and others barely change. Family history of pregnancy stretch marks is described as a predictor — [Platinum Ink](https://platinumink.net/stomach-tattoos-after-pregnancy-what-changes/); [Certified Tattoo Studios](https://certifiedtattoo.com/blog/the-pros-and-cons-of-getting-a-stomach-tattoo) (via search summary)
- Tattoos can stretch or shift slightly when weight changes. A large stretch mark through the middle of a tattoo can distort it or make it fade — [Medical News Today, tattoos after weight loss](https://www.medicalnewstoday.com/articles/tattoos-after-weight-loss); [Healthline](https://www.healthline.com/health/body-modification/stretch-tattoo) (via search summary; page fetch blocked)

**Thighs and hips**
- The skin at the upper-thigh/hip crease "can shift and stretch more than other zones", so a badly positioned design can distort. The quadriceps flattens sideways when seated, which "severely distorts rigid geometric stencils" — [Vibetat thigh guide](https://vibetat.com/blog/thigh-tattoo-complete-guide-2026); [Minh Pham Tattoo](https://minhphamtattoo.com/blog/thigh-tattoo-placement/) (via search summary)
- On the inner thigh, skin rubbing against skin (thighs touching) causes chafing while the tattoo heals and can pull ink from the fresh wound. The outer thigh is less painful because it has thicker skin and more muscle and fat — [Sortra inner thigh](https://sortra.com/tattoo-pain-levels-for-inner-thigh/); [XPain Tattoo](https://xpaintattoo.com/blogs/news/are-thigh-tattoos-painful-a-guide-to-inner-vs-outer-thigh-pain) (via search summary)

**Stretch marks**
- Artist consensus: wait about 1 to 2 years until stretch marks fade from red or purple (still remodeling, fragile) to white or silver (mature). Tattooing fresh marks gives unpredictable ink retention — [Shallows Studio](https://shallows.studio/can-you-tattoo-over-stretch-marks); [Northern 92](https://northern92.com/can-you-really-tattoo-over-stretch-marks/); [XPain Tattoo](https://xpaintattoo.com/blogs/news/tattoo-over-stretch-marks) (via search summary)
- A healed tattoo makes stretch marks less visible, but "the texture may still be felt". Some areas need extra passes or touch-ups for even color saturation — [Biomaser](https://biomasertattoo.com/blogs/study/what-to-know-tattoo-over-stretch-marks); [Gravity Tattoo](https://www.gravitytattooshop.com/do-tattoos-look-good-on-stretch-marks) (via search summary)

**Aging, crepey skin, wrinkles, scars**
- Older skin is thinner and less elastic and can have wrinkles or age spots. Artists must stretch wrinkled skin much more to get a flat working surface, which risks tearing — [S8 Tattoo](https://s8tattoo.com/blogs/news/adapting-tattoo-techniques-for-every-client-and-skin-type); [Healthline, tattoos and old age](https://www.healthline.com/health/medicare/tattoos-and-old-age) (via search summary)
- With aging, the collagen and elastin network and the small blood vessels change. This can "affect how clearly fine lines or very detailed designs appear". A claim that "by age 50 the body produces roughly 25% less collagen", declining about 1% per year, appears on [Acibadem Healthpoint](https://www.acibademhealthpoint.com/blog/older-people-tattoos-explained-by-medical-evidence-not-myths/) (secondary source; the figure is not verified against a primary dermatology study)
- Tattoos do not hide wrinkles. "Wrinkles, crepey skin, and hyperpigmentation will inevitably change your tattoo's appearance" — [Ink Art by Kate](https://inkartbykate.com/can-tattoos-cover-up-wrinkles-what-you-must-know/) (via search summary)
- Scar tissue may be less elastic and absorb ink less well, so artists work slowly with less pressure. Timing guidance for scars (waiting until a scar matures) is summarized at [Acibadem International](https://acibademinternational.com/blog/tattooing-over-scars-what-is-possible-and-when-to-wait/) (via search summary)

### Inferences
- These are the controls most likely to change a preview's result for client conversations:
  - breast volume, position and droop (under-bust, sternum and side-rib pieces);
  - belly volume and projection (stomach pieces; pregnancy and weight-change "what if");
  - upper-thigh volume and thigh spacing (thigh pieces, inner-thigh friction zone);
  - hip width (hip and thigh pieces);
  - overall weight and muscle.
  Face shape barely matters for tattoo previews.
- Artists judge placement with the client standing and relaxed. The default preview pose should therefore be a relaxed standing pose with arms slightly away from the body, and showing a seated or arms-raised pose would be a useful differentiator. (Inferred from the stencil-while-standing advice and the note about seated quadriceps distortion.)
- A "what happens if my body changes" feature (for example, toggling a pregnancy/belly or weight morph with the tattoo following the skin) maps directly onto concerns these sources raise repeatedly. It could be marketed as an education tool, not a prediction: the sources say outcomes are unpredictable.
- Skin overlays (stretch marks, scars, wrinkles) mainly help clients picture the real result and help artists talk about expectations (for example, texture still felt over stretch marks, fine lines blurring on aged skin). This supports optional, region-placeable overlays rather than whole-body realism.

### Gaps
- I could not reach any r/tattooartists or r/tattoo threads, or a peer-reviewed dermatology source on how healed tattoos look on stretch-marked or aged skin. All tattoo claims above come from studio or SEO blogs.
- I found no quantified data (for example, % distortion per kg of weight gained, or per cup size) on how much a tattoo stretches. Artists describe the effect only qualitatively.
- I found no artist-specific source on muscle gain (for example, bicep or chest growth stretching designs) beyond general "body changes" statements; skin-artists.com was blocked.

## 2. Which body-shape parameters 3D body tools expose (Anny, MakeHuman/MPFB2, Daz, Character Creator, body visualizers)

### Takeaway
Anny (Apache-2.0 code, CC0 MakeHuman assets) exposes 11 global phenotypes plus about 250 named local changes taken directly from MPFB2/MakeHuman targets. These include exactly the tattoo-relevant ones: `stomach-pregnant-incr`, `stomach-tone-incr`, `breast-volume-vert-up`, `breast-trans-up`, `breast-dist-incr`, `breast-point-incr`, `buttocks-volume-incr`, `hip-scale-horiz-incr`, `l/r-upperleg-fat-incr`, `measure-thigh-circ-incr`, `measure-bust-circ-incr`, `measure-waist-circ-incr`, `measure-hips-circ-incr`, and others. Breast size and firmness are global phenotypes (`cupsize`, `firmness`) that are off by default and need `phenotypes="all"`. Commercial tools (Daz, Character Creator) offer similar morph categories but under restrictive licenses, and the Max Planck Body Visualizer is SMPL/MPI-based, so it serves only as UX inspiration.

### Cited Findings
**Anny: global phenotypes (exact names)**
- `PHENOTYPE_VARIATIONS` in `src/anny/models/model_data.py` defines each phenotype and its anchor shapes:
  - `race`: african, asian, caucasian
  - `gender`: male, female
  - `age`: newborn, baby, child, young, old
  - `muscle`: minmuscle, averagemuscle, maxmuscle
  - `weight`: minweight, averageweight, maxweight
  - `height`: minheight, maxheight
  - `proportions`: idealproportions, uncommonproportions
  - `cupsize`: mincup, averagecup, maxcup
  - `firmness`: minfirmness, averagefirmness, maxfirmness

  Source: [naver/anny model_data.py](https://github.com/naver/anny/blob/main/src/anny/models/model_data.py)
- `EXCLUDED_PHENOTYPES = ["cupsize", "firmness"] + race`. By default the model exposes only gender, age, muscle, weight, height and proportions. `phenotypes="all"` adds cupsize, firmness and the three race weights (`resolve_phenotypes` in the same file) — [naver/anny model_data.py](https://github.com/naver/anny/blob/main/src/anny/models/model_data.py)
- Phenotype values run from 0 to 1 (0.5 is the default). The three race values are normalized to sum to 1 — [naver/anny README](https://github.com/naver/anny); [shape_parameterization tutorial](https://github.com/naver/anny/blob/main/tutorials/shape_parameterization.py)
- Anny's own caveat: "Phenotypes are based on preconceptions of artists regarding particular human traits. As a result, they encode by design stereotypes of MakeHuman artists, and one should not expect phenotype parameters to faithfully encode identity-related characteristics, such as gender, age or ethnicity." — [Anny shape_parameterization tutorial](https://github.com/naver/anny/blob/main/tutorials/shape_parameterization.py)
- Phenotype blendshapes are combined multiplicatively. Each macro blendshape's weight is the product of the interpolation weights of its component anchors (for example, a breast target combines cup and firmness with the gender, age, muscle and weight anchors). That makes phenotypes non-linear in the slider values. Code: `wi = torch.prod(phens * mask + (1 - mask))` in [phenotype.py](https://github.com/naver/anny/blob/main/src/anny/models/phenotype.py); macro blocks "universal", "race", "height", "proportions", "breast" in [full_model.py](https://github.com/naver/anny/blob/main/src/anny/models/full_model.py)

**Anny: local changes (exact `local_change_labels`)**
- Local changes are enabled with `anny.Anny(local_changes="default")` and passed as `local_changes_kwargs={'stomach-pregnant-incr': 1.}`, with values in [-1, 1]. Each label is the name of the *positive* target. A positive value applies the "incr/up/out" target and a negative value applies the opposite "decr/down/in" target. Labels are built from `data/mpfb2/targets/target.json`, skipping the "genitals" group — [Anny README](https://github.com/naver/anny); [full_model.py](https://github.com/naver/anny/blob/main/src/anny/models/full_model.py)
- Since v0.3 (2026-02-04), nipple blend shapes are excluded from the default set; `local_changes="all"` brings them back (`nipple-point-incr`, `nipple-size-incr`) — [Anny README changelog](https://github.com/naver/anny)
- Local changes are **linear and additive**. A value v adds `max(v,0) * pos_target + max(-v,0) * neg_target`, independently of the phenotype — [phenotype.py](https://github.com/naver/anny/blob/main/src/anny/models/phenotype.py)
- Tattoo-relevant local-change labels in Anny/MPFB2 (enumerated from target.json; `l-`/`r-` means separate left and right controls):
  - **stomach:** `stomach-pregnant-incr`, `stomach-tone-incr`, `stomach-navel-out`, `stomach-navel-up`
  - **breast:** `breast-volume-vert-up`, `breast-trans-up`, `breast-dist-incr`, `breast-point-incr` (+ `nipple-point-incr`, `nipple-size-incr` with "all")
  - **torso:** `measure-bust-circ-incr`, `measure-underbust-circ-incr`, `measure-waist-circ-incr`, `measure-hips-circ-incr`, `measure-frontchest-dist-incr`, `measure-shoulder-dist-incr`, `measure-napetowaist-dist-incr`, `measure-waisttohip-dist-incr`, `torso-muscle-pectoral-incr`, `torso-muscle-dorsi-incr`, `torso-vshape-incr`, `torso-scale-horiz-incr`, `torso-scale-depth-incr`, `torso-scale-vert-incr`, `torso-trans-*`
  - **hip:** `hip-scale-horiz-incr`, `hip-scale-depth-incr`, `hip-scale-vert-incr`, `hip-waist-up`, `hip-trans-*`
  - **buttocks:** `buttocks-volume-incr`
  - **pelvis:** `pelvis-tone-incr`, `bulge-incr`
  - **legs:** `l/r-upperleg-fat-incr`, `l/r-upperleg-muscle-incr`, `l/r-upperleg-scale-horiz-incr`, `l/r-upperleg-scale-depth-incr`, `l/r-upperleg-scale-vert-incr`, `l/r-lowerleg-fat-incr`, `l/r-lowerleg-muscle-incr`, `l/r-lowerleg-scale-*`, `l/r-leg-valgus-incr`, `measure-thigh-circ-incr`, `measure-calf-circ-incr`, `measure-knee-circ-incr`, `measure-upperleg-height-incr`, `measure-lowerleg-height-incr`, `upperlegs-height-incr`, `lowerlegs-height-incr`
  - **arms:** `l/r-upperarm-fat-incr`, `l/r-upperarm-muscle-incr`, `l/r-upperarm-shoulder-muscle-incr`, `l/r-lowerarm-fat-incr`, `l/r-lowerarm-muscle-incr`, `l/r-upperarm-scale-*`, `l/r-lowerarm-scale-*`, `measure-upperarm-circ-incr`, `measure-upperarm-length-incr`, `measure-lowerarm-length-incr`
  - **neck:** `measure-neck-circ-incr`, `neck-double-incr`
  - **hands/feet:** `measure-wrist-circ-incr`, `measure-ankle-circ-incr`

  There are also many face groups (eyes 33 pairs, ears 22, mouth 22, nose 21, head 17, etc.). Source: [anny data/mpfb2/targets/target.json](https://github.com/naver/anny/tree/main/src/anny/data/mpfb2/targets)
- There is **no dedicated "thigh gap" or "cellulite" target** in Anny or MPFB2. Thigh spacing would have to come from combining `upperleg-fat`, `upperleg-scale-horiz`, `measure-thigh-circ`, `leg-valgus` and `hip-scale-horiz`. This is an inference from the full target list in [target.json](https://github.com/naver/anny/tree/main/src/anny/data/mpfb2/targets).
- Anny's built-in anthropometry module (`src/anny/anthropometry.py`) measures only height, waist circumference (from a fixed ring of base-mesh vertices), volume, mass (volume × 980 kg/m³) and BMI. It has no bust, hip or thigh circumference functions — [anthropometry.py](https://github.com/naver/anny/blob/main/src/anny/anthropometry.py)
- Anny includes `anny_inverter.py`, a gradient-based fitter that optimizes phenotype and local-change parameters to match a target mesh (with an `optimize_local_changes` option) — [anny_inverter.py](https://github.com/naver/anny/blob/main/src/anny/anny_inverter.py)
- Licensing: Anny code is Apache 2.0, and the `data/mpfb2` MakeHuman-derived assets are CC0 1.0. The optional "smplx" topology download is **non-commercial only** and must be avoided — [Anny README License section](https://github.com/naver/anny)

**MakeHuman / MPFB2**
- MPFB2 ships the same target files (for example `src/mpfb/data/targets/legs/measure-thigh-circ-incr.target.gz`, `arms/measure-upperarm-circ-*`, `feet/measure-ankle-circ-*`). Anny's target list is MPFB2's — [mpfb2 repo](https://github.com/makehumancommunity/mpfb2)
- MPFB license: source code is GPLv3. Bundled assets ("the base mesh and proxies; targets and modifiers; textures; clothes; rigs, poses and expressions; JSON data with mesh information") are CC0 1.0 — [mpfb2 LICENSE.md](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md)
- Practical consequence: reuse MPFB's CC0 *assets* (as Anny does), but do not copy MPFB's GPLv3 Python code into a closed-source product. (Inference from the license split.)

**Daz 3D / Character Creator (commercial morph vocabularies, UX reference only)**
- Daz Genesis 9 third-party morph packs include belly morphs ("SS Belly Diameter", "SS Belly Fold Horizontal", "SS Belly Shape Fat 1/2"), breast morphs ("TM Breast Larger", "TM Breast Droop"), and thigh morphs ("TM Thigh Gap", "TM Thigh Size", "P3D Thighs Big/Round/Slim", "P3D Belly Bigger/Flat") — [Shape Shift for Genesis 9](https://www.daz3d.com/shape-shift-for-genesis-9); [Twizted Body Morphs](https://www.daz3d.com/twizted-body-morphs-for-genesis-9); [The Look Body Morph Resource](https://www.daz3d.com/the-look-body-morph-resource-for-genesis-9-feminine)
- I found no specific Character Creator 4 body-morph list in this session (search returned only Daz content).

**Max Planck Body Visualizer (bodyvisualizer.com)**
- Released June 1, 2011 by the MPI for Intelligent Systems (Perceiving Systems). Users enter height, weight, chest, waist, hips, inseam and weekly exercise hours for a female or male body. Each field shows whether it was "SET" by the user or "PREDICTED" from the others, and there is a units switch — [Know Your Meme summary](https://knowyourmeme.com/memes/sites/body-visualizer); screenshot text at [iFunny](https://ifunny.co/meme/bodyvisualizer-com-female-body-visualizer-switch-to-male-height-i-Rh6m95hF7); MPI code page [is.mpg.de](https://is.mpg.de/ps/code/body-shape-visualizer) (blocked in this session)
- Related MPI research ("Can I Recognize My Body's Weight?", ACM TAP) used this kind of measurement-driven body for body-perception studies — [ACM DL](https://dl.acm.org/doi/10.1145/2641568)

### Inferences
- **Recommended tattoo-preview control set for Anny:**
  - **Global:** gender, age, height, weight, muscle, proportions (already exported), plus `cupsize` and `firmness` (need `phenotypes="all"`).
  - **Local, symmetric pairs:** `stomach-pregnant-incr` ("belly"), `breast-volume-vert-up` / `breast-trans-up` ("breast lift/position"), `breast-dist-incr` ("breast spacing"), `hip-scale-horiz-incr` ("hips"), `buttocks-volume-incr`, `l+r-upperleg-fat-incr` ("thighs"), `l+r-upperarm-fat-incr` ("upper arms"), `torso-muscle-pectoral-incr` / `torso-vshape-incr` ("chest/shoulders").
  - Drive left and right with one slider by default.
- **Export strategy:** because local changes are linear and phenotype-independent, each can become one or two glTF morph targets (pos and neg) added on top of the existing 18-corner height × weight × muscle grid (see the project's `tools/export_bodies.py`). Cupsize and firmness, by contrast, are multiplicative with gender, age, weight and muscle, so they would need extra corner bakes or a runtime approximation.
- Breast, belly and thigh controls change the skin surface under a tattoo, so the decal or projection must follow the deformed mesh (morphs applied before decal projection, or the decal stored in UV or surface-local coordinates). Otherwise the preview won't show distortion when the body changes.

### Gaps
- The MPI body visualizer's method (training data and regression model) could not be verified because is.mpg.de was blocked. It is understood to be built on MPI's own body models trained on scan data, which is not commercially usable, but I have no fetched citation for that.
- I could not confirm Anny's hosted documentation pages at naver.github.io/anny (I relied on the repo source instead).
- I could not verify whether Anny's "anny" topology keeps MakeHuman's UV layout exactly (relevant to reusing MakeHuman CC0 skins). Anny exposes `texture_coordinates` and ships MPFB textures (face, lips, eyelids, aureolae, etc.) plus `sss.png`, which suggests MakeHuman-compatible UVs.

## 3. Measurement-driven body creation (enter bust/waist/hip/thigh circumferences, get a body)

### Takeaway
There are two common approaches: (1) statistical regression from a few measurements (height, weight, bust, waist, hip) to a body model's shape space, as in Body Visualizer, PCA models and SMPL-based work; (2) iterative optimization that adjusts shape parameters until the mesh's measured circumferences match the targets. Anny supports the second approach well: its parameters are differentiable, MPFB already has `measure-*-circ` targets, and Anny ships an inverter. The bust, hip and thigh measuring functions would have to be written in-house.

### Cited Findings
- An early PCA approach predicted body shape from five common measurements: height, bust, waist, hip circumference and weight — [ACM, "An Approach to Predicting Human Body Measurements and Shape"](https://dl.acm.org/doi/fullHtml/10.1145/3546118.3546120) (via search summary)
- SHAPY (CVPR 2022) regresses SMPL-X shape from images and links it to metric measurements (height, weight, chest/waist/hip circumference). SMPL-family license, so not usable commercially — [SHAPY GitHub](https://github.com/muelea/shapy); [arXiv 2206.07036](https://arxiv.org/pdf/2206.07036)
- Other research fits SMPL meshes to silhouettes with paired height, waist and hip measurements, or regresses shape plus bust/waist/hip for clothing fit — [arXiv 2205.14347](https://arxiv.org/pdf/2205.14347); [Nature npj Digital Medicine 2024](https://www.nature.com/articles/s41746-024-01289-0)
- CALVIS computes chest, waist and pelvis circumferences from 3D meshes as ground truth (SMPL-based) — [arXiv 2003.00834](https://arxiv.org/pdf/2003.00834)
- Fashion retail versions: Otero Menswear asks four questions (height, leg length, waist size, body type) and shows a matching avatar. Style.me builds an avatar from basic measurements plus body-shape choices — [Glossy](https://www.glossy.co/fashion/virtual-fitting-and-size-inclusive-brands-are-a-perfect-match/); [Style.me](https://style.me/virtual-fitting/) (via search summary)
- Anny components that can support this: the differentiable PyTorch model, `anthropometry.py` (height, waist circumference, mass, BMI), `anny_inverter.py` (gradient fitting of phenotype and local changes), and CC0 targets named after tape-measure sites (`measure-bust-circ`, `measure-underbust-circ`, `measure-waist-circ`, `measure-hips-circ`, `measure-thigh-circ`, `measure-upperarm-circ`, `measure-calf-circ`, `measure-neck-circ`) — [naver/anny](https://github.com/naver/anny)

### Inferences
- **Feasible commercial pipeline (offline or server-side):**
  1. Define vertex rings on the Anny template for bust, under-bust, hips and thigh (waist already exists as `BASE_MESH_WAIST_VERTICES`).
  2. Optimize gender/height/weight/muscle/cupsize, then the matching `measure-*-circ` local changes, to minimize circumference error.
  3. Bake the result or ship a small lookup table (measurements → parameters) for the browser.

  This avoids SMPL entirely.
- **UX pattern from Body Visualizer worth copying:** let users set any subset of measurements and mark the rest as "estimated" (SET vs PREDICTED).
- For tattoo artists, exact centimetres matter less than matching the client's look. A "quick" path (presets plus 4 to 6 sliders) and an "exact" path (enter height, weight, bust, waist, hip, thigh) would cover both.

### Gaps
- I found no open-source, commercially licensed (non-SMPL) measurement-to-body regressor ready to use, and no published accuracy figures for MakeHuman-based measurement fitting.

## 4. How renderers represent skin wrinkles, aging, stretch marks and cellulite; open/CC0 resources

### Takeaway
Real-time skin uses layered normal detail: a base normal map for medium features (wrinkles, creases, folds), plus a small tiling "micro" or detail normal map for pores. The two are combined with angle-correct (reoriented) normal blending, with a subsurface-scattering profile on top. Region-specific features like stretch marks, cellulite and scars are usually painted or masked normal/roughness/albedo layers, or procedural noise. Tension-driven wrinkle maps are the advanced option. Poly Haven and ambientCG are CC0 but I could not confirm they have human-skin materials. MakeHuman's official skin packs are CC0 and fit Anny's lineage.

### Cited Findings
- Unreal guidance (via search summary; Epic docs blocked): the face normal map should contain only wrinkle detail, and pores should come from a tiling texture "as better results can be achieved this way". Combine the two with the `BlendAngleCorrectedNormals` material function — [Epic, Creating Human Skin in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-human-skin-in-unreal-engine)
- Micro normals: a secondary small tiling normal map (for example 256×256) overlaid in a repeating pattern to show fine skin lines up close — [Daz 3D forums, micro normals for skin](https://www.daz3d.com/forums/discussion/373906/micro-normals-for-skin)
- Mesostructure (pores, fine creases, down to about 0.1 mm) is combined with tiled microstructure using reoriented normal mapping blending — [USPTO patent, skin microstructure texture filtering](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12367635) (via search summary)
- USC ICT models skin stretching and compression by blurring the microstructure displacement in the direction of stretch and sharpening it in the direction of compression. This is relevant to how skin texture (and tattoo ink) looks on stretched belly or breast skin — [USC ICT Skin Microstructure Deformation](https://vgl.ict.usc.edu/Research/SkinStretch/)
- Tension-based wrinkles: Blender Studio compares the deformed mesh with a rest mesh in Geometry Nodes to get tension maps, which drive wrinkle bump maps — [Blender Studio, Procedural Wrinkles](https://studio.blender.org/blog/procedural-wrinkles/); research version: [Mesh-tension driven expression wrinkles, arXiv 2210.03529](https://arxiv.org/pdf/2210.03529)
- Procedural skin shaders generate pores, blemishes, freckles, veins, moles and similar with node noise and no image textures. Turning down procedural micro-displacement makes skin look younger — [Superhive Procedural Skin Shader](https://superhivemarket.com/products/procedural-skin-shader); [Universal Human skin shader docs](https://sites.google.com/view/universalhuman/documentation/skin-shader-docs); [UltimateSkin](https://kuhantilope.gumroad.com/l/ultimate-skin) (commercial products, reference only)
- Normal maps handle medium details (creases, pits, bumps, tendons), and displacement moves real geometry — [Nabesaka, skin shading in Blender](https://nabesaka.com/blender-a-look-at-skin-shading/)
- Reallusion's Digital Human Shader (Character Creator) layers micro-normal and skin-detail controls — [Reallusion Digital Human Shader](https://www.reallusion.com/character-creator/digital-human-shader.html) (commercial)
- **CC0 resources:**
  - Poly Haven: all assets CC0, free for commercial use, no attribution — [Poly Haven](https://polyhaven.com/)
  - ambientCG: CC0, over 1,000 PBR materials up to 8K — [ambientCG](https://ambientcg.com/)
  - Neither was confirmed to have a human-skin or pore material (search did not confirm)
- MakeHuman official skin asset packs ("skins01" natural female, "skins02" natural male, "skins03" non-natural) are listed as CC0 and usable commercially, including in closed-source games. Third-party "Skins Vol.0" is CC-BY (attribution required) — [MakeHuman license explanation](http://www.makehumancommunity.org/content/license_explanation.html); [skins01](https://static.makehumancommunity.org/assets/assetpacks/skins01.html); [Skins Vol.0 on itch.io](https://rpatterson-smokeworks.itch.io/skins-vol0) (via search summary)
- Anny itself ships only partial MakeHuman textures (`mpfb_face.jpg`, `mpfb_lips.jpg`, `mpfb_eyelids.jpg`, `mpfb_ears.jpg`, `mpfb_aureolae.jpg`, `mpfb_fingernails.jpg`, `mpfb_toenails.jpg`, `sss.png`, etc.) under CC0 — [naver/anny data/mpfb2/textures](https://github.com/naver/anny/tree/main/src/anny/data/mpfb2/textures)

### Inferences
- **Recommended stack for a web (three.js-style) tattoo preview:**
  1. Base albedo and roughness per skin tone.
  2. A tiling CC0 or self-made pore micro-normal at high UV repeat, faded with camera distance.
  3. Optional **region decals or masks** for stretch marks (thin elongated stripes, slightly lighter or pinker albedo, low-frequency normal dents aligned with the stretch direction: horizontal on the belly, radial on breasts and hips, vertical or oblique on thighs), cellulite (low-frequency dimple noise in the normal map, masked to thigh, buttock and hip), scars (painted normal plus albedo stamps), and aged or crepey skin (higher-frequency fine-wrinkle normal, lower specular contrast).

  All of these are cheap normal and albedo overlays, and procedural noise can produce them without licensed scans.
- The tattoo should be composited into the skin's albedo *below* the skin normal and specular layers. Overlays such as stretch marks and wrinkles then "break up" the ink the way real texture does (sources: texture still felt over stretch marks, fine lines blur on aged skin).
- Stretch-mark direction can be derived from the morph itself: the per-vertex displacement direction of `stomach-pregnant-incr` or `weight` shows where skin stretched. This idea is inspired by USC ICT's stretch-aware microstructure but is my inference, not a cited technique.

### Gaps
- I could not fetch GPU Gems 3 ch. 14 or Epic MetaHuman docs directly (blocked or not attempted), so skin SSS specifics are not cited here.
- I found no CC0 dataset of stretch-mark, cellulite or scar normal maps. These would need to be authored, procedurally generated, or licensed.

## 5. Inclusive design: presenting body controls respectfully

### Takeaway
Guidance from inclusive-avatar research and fashion fit tools is consistent: offer diverse presets as starting points (not all at slider midpoint), back them with continuous sliders for fine control, use neutral descriptive labels, and include skin tones with undertones (for example, the Monk Skin Tone scale). Anny's own documentation warns that its phenotypes encode artist stereotypes, which argues for neutral labels in the UI rather than the raw parameter names.

### Cited Findings
- Inclusive avatar guidance: provide a mix of presets and sliders (sliders alone are less helpful for users with visual impairments). Use continuous controls so users can describe their bodies. Starter avatars should begin at different slider positions, "not always starting at the middle or left". Offer a random-avatar button — [EGAL Resources, Guide for Creating Inclusive Avatars](https://www.egalresources.com/creating-inclusive-avatars-guide); [MadisonAbilityLab Inclusive Avatar Guidelines (17 guidelines)](https://github.com/MadisonAbilityLab/Inclusive-Avatar-Guidelines-and-Library) (via search summary)
- Skin tone: the Monk Skin Tone Scale with undertone sliders is recommended as a foundation — [EGAL Resources](https://www.egalresources.com/creating-inclusive-avatars-guide) (via search summary)
- OlliOlli World starts from an androgynous base with two body-type sliders, and every cosmetic option works on every body shape — [CBR, games with inclusive character creators](https://www.cbr.com/games-with-inclusive-character-creators/) (via search summary)
- Fashion fit tools build avatars from quick quizzes (height, leg length, waist, body type) or measurements plus body-shape selection. Letting users create diverse avatars that reflect their body type, age or skin tone "create[s] experiences that welcome a broader audience" — [Glossy](https://www.glossy.co/fashion/virtual-fitting-and-size-inclusive-brands-are-a-perfect-match/); [Shopify virtual fitting rooms guide](https://www.shopify.com/retail/virtual-fitting-rooms); [Style.me](https://style.me/virtual-fitting/) (via search summary)
- Anny's maintainers caution that phenotypes "encode by design stereotypes of MakeHuman artists" — [Anny tutorial](https://github.com/naver/anny/blob/main/tutorials/shape_parameterization.py)

### Inferences
- **Suggested UI wording:**
  - "Body size" (not "fat" or "obesity"); "Muscle definition"; "Chest/Bust size" (not "cup"); "Breast lift" or "Breast position" (not "firmness" or "sag"); "Belly" or "Tummy"; "Hips"; "Thighs"; "Upper arms"; "Height"; "Age".
  - Present belly as a neutral range rather than "pregnant". `stomach-pregnant-incr` can be one input to a "Belly" slider, with a separate optional "Pregnancy preview" toggle.
  - Use "Skin texture" toggles for stretch marks, scars and mature skin, phrased as "show my skin features" rather than flaws.
- Show presets as unlabeled thumbnails or neutral names (for example, body A to H) that cover a range of sizes, ages and builds, rather than names like "curvy" or "athletic". Then reveal sliders under "Fine-tune".
- Because artists use the tool with clients, client-facing screens should avoid showing numeric weight or BMI by default. Anny's anthropometry can compute BMI, but it is better kept internal.

### Gaps
- I found no published style guide from a major fashion-fit vendor (for example, True Fit, Zeekit or 3DLOOK) giving specific body-control wording. The wording recommendations above are inference, not cited practice.
- I found no user research on how tattoo clients specifically react to body sliders in a studio setting.
