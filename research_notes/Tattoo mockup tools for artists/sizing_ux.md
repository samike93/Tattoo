# Sizing UX and Personal, Quote-Ready Consultation Flow for a 3D Tattoo Preview Tool

> Method note: The research used WebSearch plus WebFetch. WebFetch was blocked by the network egress proxy for nngroup.com, help.procreate.com, artnsoul.net.au and sortra.com, and developer.apple.com returned only a page title. So most findings below come from search-result summaries of those pages, not full-text reads. Claims are attributed to the page each snippet came from. Many tattoo-sizing sources are SEO-style studio or blog pages, so treat their numbers as practitioner rules of thumb, not measured data.

## 1. How do design and measurement tools show live dimensions while dragging or resizing, and which patterns work?

### Takeaway
The patterns that work best put the measurement on the object itself and update it live during the drag (a Figma-style W × H tooltip), with an optional precise numeric entry. Add optional axis-lock and snapping (Procreate Magnetics and Snapping). NN/g's AR shopping research says measurements must appear in the main view, not in a separate panel. Judging size is a top reason people use these tools, so scale errors are not forgiven.

### Cited Findings
- In Figma, when you drag a transform handle, "the dimensions will be displayed as a tooltip." You can also scrub the W/H fields to resize, or type exact values. — [freeCodeCamp: How to Resize Elements in Figma](https://www.freecodecamp.org/news/how-to-resize-elements-in-figma/); [Figma forum: scale proportionally to exact dimension](https://forum.figma.com/archive-21/scale-elements-proportionally-to-exact-dimension-34874)
- Procreate's Transform tool has Snapping, which helps align content while transforming. Snapping also contains Magnetics, which "lock[s] the transformation of your content to an axis." Magnetics also lets content slide or scale along one axis. The two features can be used together or separately. — [Procreate Handbook: Snapping](https://help.procreate.com/procreate/handbook/transform/snapping); [Procreate Handbook: Interface and Gestures](https://help.procreate.com/procreate/handbook/transform/transform-interface-gestures); [Astropad: Snapping & Magnetics in Procreate](https://astropad.com/blog/how-to-use-snapping-and-magnetics-to-arrange-objects-in-procreate/)
- Apple's Measure app uses an anchored-point model. A reticle ("a dot in a circle") marks the target. You tap + to anchor a start point, then move, and the live distance is shown to whatever sits under the reticle. — [How-To Geek: Measure distances with your iPhone](https://www.howtogeek.com/366577/how-to-measure-distances-with-your-iphone/); [Apple Support: Measure dimensions with iPhone](https://support.apple.com/guide/iphone/measure-dimensions-iphd8ac2cfea/ios)
- NN/g (AR shopping guidelines): on Best Buy's app, users tapped a ruler icon expecting measurements. They were disappointed because they did not look up at the AR view, which was where the measurements appeared. NN/g recommends showing measurements in the main AR view with clear visual feedback. — [NN/g: UX Guidelines for Augmented-Reality Shopping Tools](https://www.nngroup.com/articles/augmented-reality-ecommerce-guidelines/)
- NN/g: "Issues with proportion and scale were not as easily overlooked, because gauging the size of an item is a top reason for using an AR tool." Many tools struggled to trade off simple calibration against accuracy. — [NN/g: AR shopping guidelines](https://www.nngroup.com/articles/augmented-reality-ecommerce-guidelines/)
- NN/g: an AR experience should be "self-sufficient". Users should not have to leave it to find dimensions or to make small adjustments such as changing color. — [NN/g: AR shopping guidelines](https://www.nngroup.com/articles/augmented-reality-ecommerce-guidelines/)
- NN/g found AR features most discoverable when placed near the product image with explicit text labels ("See it in AR", "View in Room", "Live Try-On"). It also separates two uses: visualization ("will it fit my space") and try-on ("will it fit me"). — [NN/g search summary: AR shopping guidelines](https://www.nngroup.com/articles/augmented-reality-ecommerce-guidelines/)
- NN/g has a separate article, "Augmented-Reality Calibration in Mobile Apps: 10 Guidelines". It reports that calibration problems can stop people from ever reaching the AR experience. — [NN/g: AR Calibration 10 Guidelines](https://www.nngroup.com/articles/ar-calibration/); [NN/g video: 5 Tips for AR Calibration](https://www.nngroup.com/videos/augmented-reality-calibration/)
- IKEA Place (ARKit, 2017) claimed "98% accuracy in scaling products to room dimensions" and promised every item was true to scale. — [Digital Trends](https://www.digitaltrends.com/phones/ikea-place-ar/); [IKEA newsroom](https://newsroom.inter.ikea.com/news/ikea-launches-ikea-place--a-new-app-that-allows-people-to-virtually-place-furniture-in-their-home/s/f5f003d7-fcba-4155-ba17-5a89b4a2bd11)
- Wall-art visualizers let users upload a wall photo, "place frames at real scale" and use furniture and human figures as scale references. Some add rules of thumb, such as art at about 2/3–3/4 of sofa width, or a 130–165 cm piece for a 210 cm sofa. — [WallDecor.io Wall Art Visualizer](https://walldecor.io/tools/wall-art-visualizer); [Gemarkt Wall Art Size Calculator](https://gemarkt.com/tools/wall-art-size-calculator/); [Artfully Walls: 2/3 rule](https://www.artfullywalls.com/artful-insights/what-is-2-3-rule-for-wall-art)
- NN/g also has an article on size guides and product measurements for international shoppers, which covers unit display. — [NN/g: Size Guides and Product Measurements for International Shoppers](https://www.nngroup.com/articles/sizes-measurements-ecommerce/)

### Inferences
- **Live label on the decal.** While the artist pinches or drags, show a pill-shaped label beside the tattoo's bounding box, e.g. "9.5 × 6.2 cm (3.7 × 2.4 in)". Update it every frame (Figma pattern). Keep it in the 3D viewport, not in a side panel (NN/g lesson). After the gesture ends, leave it visible for about 1–2 s, then fade it to a small persistent chip.
- **Measure on the skin surface.** For a decal wrapped on a curved limb, the number clients care about is the length along the skin, which is what the stencil and a tape measure give. The straight-line (chord) distance is shorter. The tool could show "along skin" as the main number. A tape-measure-style arc line, like the Measure app, would make the curvature visible.
- **Tap to type an exact size.** Let the artist tap the label and enter a width (e.g. "4 in"), with the aspect ratio locked by default. This copies Figma's numeric W/H entry and Procreate's Uniform mode.
- **Snapping.** Add optional snaps to common quote sizes (2", 3", 4", 6" or 5/7.5/10/15 cm). Also offer a "lock rotation to limb axis" option, the equivalent of Procreate Magnetics, so designs line up with the forearm or spine. Give light visual feedback when a snap engages.
- **Unit toggle.** Offer a cm/in toggle that remembers the last choice per device, and show both units in the shared summary.
- **Scale references in the 3D scene.** A toggleable ghost credit card (85.6 × 54 mm), a US quarter or a phone outline placed next to the tattoo. These play the same role as the sofa and human figure in wall-art tools.
- **Calibration.** If a 1:1 on-screen mode is added (section 2), keep its calibration to one step. NN/g warns that calibration flows can block people from reaching the experience at all.

### Gaps
- I could not open the full NN/g articles (proxy-blocked), so the guideline list is incomplete. Full text may hold more on measurement overlays and ruler UI.
- I found no primary documentation on Canva's resize labels, Amazon "View in Your Room" dimension display, or watch/ring try-on scale UI (Warby Parker, etc.).
- I found no source on whether a curved (geodesic) measurement or a straight-line measurement better matches what clients expect. That claim is my own inference.

## 2. How do people best grasp physical size: reference objects, 1:1 printing, on-screen calibration, printable stencils?

### Takeaway
Familiar-size reference objects measurably change and improve size perception. Credit-card calibration is an established web pattern for showing true size on screen (ISO ID-1 card, 85.60 × 53.98 mm), reported accurate to about 1–2% once calibrated. A true-scale printout or stencil is still what tattooing itself uses ("a stencil that scales correctly").

### Cited Findings
- Vision research: "Familiar size affects the perceived size and distance of real objects even with binocular vision." — [PMC8479574](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8479574/)
- A 2024 Journal of Consumer Behaviour study (multiple experiments, including eye-tracking) found that review photos with a size referent object were rated more helpful. Consumers looked more at the photo and less at the text when a referent was present. The study notes that size misperception is a common online-shopping problem. — [Dang et al. 2024, J. Consumer Behaviour](https://onlinelibrary.wiley.com/doi/10.1002/cb.2281)
- A related 2024 study examines how 3D versus 2D product images affect perceived product size (title only; full findings not accessed). — [Kwon et al. 2024, J. Consumer Behaviour](https://onlinelibrary.wiley.com/doi/full/10.1002/cb.2312)
- An arXiv paper (2024) proposes "SiCo", a size-controllable virtual try-on aimed at informed decisions (title and abstract-level only). — [arXiv 2408.02803](https://arxiv.org/pdf/2408.02803)
- Credit, debit and ID cards follow ISO/IEC 7810 ID-1: 85.60 × 53.98 mm, with tolerance under 0.1 mm. Online rulers ask the user to drag an on-screen card until it matches a real card. They store a pixelsPerMm value or accept a DPI entry, and fall back to an assumed 96 PPI before calibration. — [keyboardtester.click online ruler](https://keyboardtester.click/online-ruler.php); [Denis Casian Screen Ruler](https://tools.deniscasian.com/tools/screen-ruler)
- Accuracy claims for calibrated screen rulers are "within 1–2%" or "±0.5 mm for most displays". These are vendor claims and were not independently tested. — [keyboardtester.click](https://keyboardtester.click/online-ruler.php); [irulerpro.com](https://irulerpro.com/)
- Consultation guidance says concrete size and placement details are needed "to get an accurate quote and a stencil that scales correctly". — [search summary of tattoo consultation guides, e.g. Club Tattoo](https://clubtattoo.com/blogs/tattoo-guide/5-tips-for-effective-tattoo-consultations-with-your-artist)
- Artists already send clients Procreate mockups on photos of their own body before the appointment. One source says this "dramatically reduces placement adjustment conversations during stencil application". — [Myclaw / Procreate tattoo blog (search summary)](https://myclaw.ai/blog/procreate-tattoo-design-app); [Envato Tuts+: Procreate for tattoos](https://design.tutsplus.com/tutorials/how-to-use-procreate-for-tattoos--cms-109190)

### Inferences
- **Layer the size cues, cheapest first:**
  1. The number in cm/in on the decal.
  2. A familiar reference object beside it on the 3D body (card, coin, phone, the client's own hand span).
  3. An optional "Actual size on this screen" view: a flat 2D render at 1:1 after a one-time credit-card calibration. Store pixelsPerMm in localStorage per device; it is a per-viewer convenience.
  4. "Print at 100%": a PDF at true scale with a 5 cm / 2 in check bar so the client can confirm the printer did not scale it. The client can tape it to their skin at home.
- **iPad shortcut for the artist.** iPad models have known PPI, so a lookup table could skip calibration for the artist's own device. Credit-card calibration stays as the fallback for client devices. (Inference: browsers do not report physical DPI reliably, which is why every online ruler calibrates.)
- **Use the client's own body as the reference.** The 3D body already gives personal scale. Showing "covers about 60% of your forearm length" is a strong familiar-size cue. This is an inference from the familiar-size research.

### Gaps
- I found no study that directly compares on-screen 1:1 calibration with printed 1:1 stencils for size understanding.
- The full text of the Dang 2024 and Kwon 2024 papers was not accessed, so effect sizes are unknown.

## 3. What do tattoo clients commonly misjudge, and what preview features address it?

### Takeaway
Practitioner sources agree the most common regret is size, especially tattoos that are too small for their detail. Fine lines and small lettering close up as ink spreads with healing and age. Placement on curved, moving anatomy is also misjudged. Useful preview features: size-option comparisons, minimum-size warnings tied to style, and an "aged" or blurred preview. All numbers below come from studio and blog sources, not clinical research.

### Cited Findings
- One of the most common tattoo regrets is size: "too small to hold the detail it needs" or too large for the spot. Undersized tattoos are said to be the most regretted. — [Art n Soul Tattoo: How to choose tattoo size and placement (search summary)](https://artnsoul.net.au/how-to-choose-tattoo-size-and-placement/)
- "Fine detail closes up as it heals, and small lettering or dense line work is the most common regret in the trade." Tiny tattoos "can spread out and become unreadable". — [Art n Soul (search summary)](https://artnsoul.net.au/how-to-choose-tattoo-size-and-placement/); [TattThat size guide](https://tattthat.com/blog/tattoo-size-guide/)
- Recommended client question: "Will this hold at the size I want, or does it need to be bigger?" An artist who says the piece should be bigger or simpler "is protecting the result rather than the sale." — [Art n Soul (search summary)](https://artnsoul.net.au/how-to-choose-tattoo-size-and-placement/)
- "The stencil stage is the last easy moment to change placement, size or angle." — [Art n Soul (search summary)](https://artnsoul.net.au/how-to-choose-tattoo-size-and-placement/)
- Lettering minimums vary by source:
  - Vatican Tattoo Studio (as cited): avoid script under roughly 3–4 mm cap height.
  - Another guide: block/serif at least about ¼ in letter height, standard script at least ½ in, ornate script at least 1 in.
  - A third: script letters at least 5–6 mm tall.
  - These sources conflict on the exact floor, but all point to roughly 4–12 mm depending on style. — [aifortattoo: minimum script size](https://www.aifortattoo.com/blog/script-tattoo-fonts-minimum-size-line-weight-legibility-guide); [Sortra: lettering size](https://sortra.com/how-big-should-a-tattoo-be-for-lettering/); [Inked With: script & lettering](https://www.inkedwith.com/post/2025/script-and-lettering-tattoos-choosing-the-right-font-and-placement/)
- Claim that "lines expand 10–20 percent in the first year, then keep softening with UV and wear". This is an unsourced blog figure; treat it as illustrative only. — [jeffjibran.com lettering guide (search summary)](https://www.jeffjibran.com/tattoo-lettering-script-guide/)
- Rule of thumb: "If you can't read it from across the room fresh, you won't be able to read it up close in five years." — [search summary of lettering guides, e.g. xpaintattoo](https://xpaintattoo.com/blogs/news/tattoo-lettering)
- Placement advice: name specific spots ("inner bicep", "lower calf") because artists design "with the natural movement of the body". — [Club Tattoo consultation tips (search summary)](https://clubtattoo.com/blogs/tattoo-guide/5-tips-for-effective-tattoo-consultations-with-your-artist)
- A "blowout" is ink spreading under the skin into a blurry halo, caused by wrong needle depth or pressure. It is an execution risk, not a sizing choice. — [search summary of "blown out tattoo" pages](https://smi.engin.umich.edu/blown-out-tattoo) (low-quality aggregator domain; use with caution)

### Inferences
- **Side-by-side sizes.** Offer an "S / M / L" compare mode showing the same design at three sizes on the same body region, each labelled in cm/in. This targets the most-cited regret (too small) and gives the artist a neutral way to recommend going bigger.
- **Minimum-size advisory.** The artist sets a per-design "style" (fine line, script, traditional, realism). The tool shows a soft, non-blocking warning when the smallest feature falls below her threshold, e.g. "Script cap height ≈ 3 mm; may blur over time". The thresholds should be **artist-editable**, because the sources disagree and she is the authority. Present it as her advice, not a machine judgment.
- **"Healed / 10-year" preview toggle.** Apply a slight Gaussian blur or line-dilation to the decal texture (scaled in mm) plus a small desaturation. This shows how fine detail softens. Label it "approximate" to avoid over-promising; the 10–20% figure is unverified.
- **Viewing distance and motion.** Add "arm's length" and "across the room" camera presets. Add pose sliders (bend elbow, rotate forearm) so clients see wrap and distortion on movement. This addresses placement misjudgment on curved anatomy.
- **Stencil-stage handoff.** Because the stencil stage is the "last easy moment" to change things, the saved mockup and its exact dimensions should feed straight into stencil printing at 100%.

### Gaps
- I found no peer-reviewed data on tattoo regret by size, or on ink-spread rates per year. Every number here comes from practitioner or blog sources.
- I found no source quantifying how often clients misjudge placement on moving or curved anatomy.

## 4. Consultation UX: how artists run consultations today, what makes clients feel heard, private profiles, sharing and quote capture

### Takeaway
Today the common digital workflow is Procreate on an iPad Pro: photograph the client's body part, overlay the design at low opacity, then resize and rotate it, sometimes sending the mockup to the client before the appointment. Clients feel heard when changes are cheap and welcome. Quotes are mostly time-based (hourly or a flat price built on a time estimate), so quote capture should record size, placement, style/complexity and estimated hours or sessions, not square inches alone.

### Cited Findings
- Artists import a photo of the client's arm, overlay the design, and resize or rotate it until placement is right. They can "send clients a visual mockup before they come in, which clients love". — [Myclaw: Procreate tattoo design app (search summary)](https://myclaw.ai/blog/procreate-tattoo-design-app)
- Procreate placement workflow: put the body photo on a bottom layer at low opacity and sketch the design over it. Or use a duplicate document with the design above the photo, hide opaque backgrounds, then adjust position and scale. — [Envato Tuts+: How to use Procreate for tattoos](https://design.tutsplus.com/tutorials/how-to-use-procreate-for-tattoos--cms-109190); [Jotapas guide](https://www.jotapas.com/how-to-use-procreate-for-tattoos/)
- Apple's App Store editorial features tattoo artists who use Procreate, an Apple Pencil and an iPad Pro to show customers a preview photo of the tattooed body part. — [Apple App Store story](https://apps.apple.com/us/story/id1465828258)
- Clients "should never feel like they're being difficult by asking for changes". Artists "would much rather adjust a drawing on paper than have clients leave unhappy." — [consultation guides, e.g. Big Time Tattoos](https://www.bigtimetattoos.com/post/making-the-most-of-tattoo-consultations); [No Regrets consultation guide](https://noregrets.tattoo/us/news/tattoo-consultations-guide/)
- Clients are told to bring 1–3 style references plus a photo of the exact area. References show line weight, shading, how much open skin they like, and how bold they want details. — [Platinum Ink: what to bring](https://platinumink.net/what-to-bring-to-a-tattoo-consultation/); [Club Tattoo](https://clubtattoo.com/blogs/tattoo-guide/5-tips-for-effective-tattoo-consultations-with-your-artist)
- A consultation typically covers size and placement, color, estimated time and number of sessions, pricing and deposit, and aftercare. — [Manifest Studio consultation guide](https://manifeststudio.com/blogs/news/what-is-tattoo-consultation); [Raph Barros consultation guide](https://raphbarrostattoo.com/blogs/news/tattoo-consultation-guide)
- "Most quality artists don't price by the square inch. They price by time, either as an hourly rate or as a flat per-piece quote that's built on a time estimate." Shop minimums are about $50–$250. — [Tattoo Studio Pro: cost by size](https://tattoostudiopro.com/tattoo-cost-by-size/); [Fash: 2026 tattoo prices](https://fash.com/costs/how-much-do-tattoos-cost)
- Indicative hourly ranges: newer artists about $50–130, experienced about $150–300, top of market about $300–500. Time rules of thumb: tiny 10–20 min, small (2–3 in) 30–60 min, medium (4–6 in) 1–3 h. These are aggregator figures. — [Neebol price guide](https://www.neebol.com/blogs/tattoo-business/tattoo-prices-explained-how-much-does-a-tattoo-cost); [Tattoo Studio Pro](https://tattoostudiopro.com/tattoo-cost-by-size/)
- An artist "typically won't give you an exact price until you've worked out all the details", but a rough estimate can come from rate, size and complexity. — [Removery: tattoo cost](https://removery.com/blog/tattoo-cost/)

### Inferences
- **Make the session feel like hers, not a software session.**
  - Open on the client's name and saved body.
  - Use one primary canvas with large, few controls. Hide advanced controls behind a single "more" sheet.
  - Use the artist's branding and voice in shared outputs.
  - Make every change undoable. Show a visible "Versions" strip (A/B/C) so trying ideas costs nothing; this echoes "adjust on paper rather than leave unhappy".
- **Hand the iPad to the client.** A large-type "Client view" mode that hides pricing and tools and shows only rotate, compare sizes and a "favorite this one" heart. Clients take part directly, which supports feeling heard.
- **Private client profile.**
  - Store body morph parameters, skin tone, notes, reference images and saved mockups.
  - Default to keeping it on the artist's device, or account-scoped storage, with explicit consent for body photos.
  - Keep sensitive data (body photos, measurements) out of shareable links unless the artist chooses to include it.
- **Shareable mockup.**
  - Export an image (front plus one angle) with dimensions burned in.
  - A view-only link that opens the 3D model at the chosen pose, with a "print at actual size" button.
  - Text like "Proposed: 10 × 6 cm, left inner forearm, fine line, about 2.5 h (1 session)".
- **Quote card generated from the mockup.**
  - Auto-fills size (W × H plus area), placement (body region from the decal anchor), style, color vs black-and-grey, and her own complexity rating.
  - The artist enters hours or sessions and her rate, with her shop minimum applied.
  - Output: estimate range, deposit, and next steps.
  - Do not auto-price from square inches, since artists price by time. Area can be a hint that pre-fills an hours suggestion from her past quotes.

### Gaps
- I found no first-hand artist forum threads (e.g. Reddit r/TattooArtists) within the tool budget. The consultation insights come from studio blog pages written for clients.
- I found no data on client privacy expectations for stored body measurements or photos in tattoo tools.

## 5. Accessibility and touch: iPad gestures for move, scale and rotate, handle sizes, undo

### Takeaway
Use the platform-standard gestures: one-finger drag to move, two-finger pinch to scale, two-finger twist to rotate. Make every touch target at least 44 × 44 pt (Apple HIG). Copy iPadOS and Procreate undo habits (two-finger tap to undo, three-finger tap to redo in Procreate). Also show visible undo/redo buttons, because gestures are not discoverable.

### Cited Findings
- Apple HIG lists standard touchscreen gestures: tap, drag/pan, pinch (zoom/scale), rotate (two-finger rotate of an image or view), and shake to undo/redo. — [Apple HIG: Touchscreen gestures](https://developers.apple.com/design/human-interface-guidelines/inputs/touchscreen-gestures); [Apple HIG: Gestures (iOS)](https://developers.apple.com/design/human-interface-guidelines/ios/user-interaction/gestures/)
- Apple: "The comfortable minimum size of tappable UI elements is 44 x 44 points"; controls smaller than this are hard to activate. — [Apple iOS HIG (archived PDF)](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/MobileHIG.pdf); [Apple HIG accessibility summary](https://medium.com/design-bootcamp/apples-human-interface-guidelines-on-accessibility-e9c3945b2ec5)
- Procreate's Transform tool uses on-canvas handles plus touch gestures, with Freeform, Uniform, Distort and Warp modes. Uniform keeps proportions. — [Procreate Handbook: Transform Interface and Gestures](https://help.procreate.com/procreate/handbook/transform/transform-interface-gestures); [Procreate Handbook: Uniform](https://help.procreate.com/procreate/handbook/transform/transform-uniform)
- Procreate's touch shortcuts (two-finger tap to undo, three-finger tap to redo) are widely documented. I could not open the Procreate handbook to quote them. — [Adventures with Art: Procreate Transform guide](https://adventureswithart.com/procreate-transform-tool/) (secondary)

### Inferences
- **Gesture map for the 3D viewport.** Gestures on the tattoo move, scale and rotate it; gestures on empty space orbit or zoom the camera.
  - One-finger drag on the tattoo slides it along the skin.
  - Two-finger pinch on or near the tattoo scales it, with aspect ratio locked by default.
  - Two-finger twist rotates it about the skin normal.
  - One-finger drag on empty space orbits the body; two-finger pinch on empty space zooms the camera.
  - Show a small mode hint the first time ("Pinch the tattoo to resize").
  - Add a **"Lock body"** toggle so a stray touch does not orbit the camera during fine placement.
- **Handles.** Visible corner and rotate handles drawn about 24 px, with invisible hit areas of at least 44 pt. Keep them outside the design's bounds so they do not hide the art. Hide them during the gesture and show the live size label instead.
- **Fine control.** Add nudge buttons (±1 mm, ±1°) and the tap-to-type size field (section 1). These help artists with less dexterity, Apple Pencil precision work, and desktop users with keyboard input (arrow keys to nudge, Shift for larger steps).
- **Undo.**
  - Two-finger tap to undo and three-finger tap to redo, matching Procreate, which the artist already knows.
  - Visible undo/redo buttons for clients and desktop users, plus Cmd/Ctrl+Z.
  - Each completed gesture is one undo step.
  - Do not rely on shake-to-undo in a web app; browser support for it is unreliable.
- **Pointer events.** In three.js/React, use Pointer Events with `touch-action: none` on the canvas to stop Safari page-zoom fighting the pinch gesture. (Implementation inference, not sourced here.)

### Gaps
- I could not access the current (2024–2026) Apple HIG text for exact iPadOS undo-gesture wording, because developer.apple.com returned no content.
- I found no usability study on 3D decal manipulation on tablets specifically.

## Cross-cutting: evidence that preview and try-on tools improve confidence

### Cited Findings
- Shopify (2020 tweet): interactions with products that had 3D/AR content showed a "94% higher conversion rate" than products without. This is vendor data; the methodology is not public. — [Shopify on X](https://x.com/Shopify/status/1306973590814949376)
- A 2025 Snap and Publicis study (4,028 shoppers, as reported by an AR vendor): 80% felt more confident buying and 66% were less likely to return an item. This is a secondary report. — [BrandXR 2025 AR retail report](https://www.brandxr.io/2025-augmented-reality-in-retail-e-commerce-research-report)
- The claim that "merchants using AR saw 40% fewer returns" circulates on vendor and blog pages attributed to Shopify. I could not trace it to a primary Shopify source. — [Vizion Interactive blog](https://www.vizion.com/blog/try-before-you-buy-revolutionizing-ecommerce-with-augmented-reality/)
- Academic case study of IKEA Place as a service innovation. — [Ozturkcan 2021, Journal of Information Technology Teaching Cases](https://journals.sagepub.com/doi/10.1177/2043886920947110)

### Inferences
- The retail evidence is mostly vendor-reported, but it all points the same way: try-on and visualization raise confidence and reduce "returns". For tattoos, the equivalent of a return is regret, a cover-up or a rework. That makes the "decide size with confidence" framing a reasonable value proposition. It is not measured for tattoos.

### Gaps
- I found no study measuring the effect of tattoo-specific preview tools (AR or 3D) on client satisfaction or regret.
