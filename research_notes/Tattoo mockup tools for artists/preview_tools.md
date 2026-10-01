# Tattoo Preview / Mockup Tools: What Exists and How Artists Use Them (2023-2026)

Method note (read first): research done 2026-10-01. WebFetch was blocked by the network egress proxy for nearly every target (trytattoo3d.com, apps.apple.com, gumroad.com subdomains, fueled.com, makemea.ai, bebrushes.com, procreationsdigital.com, inkjin.com), and reddit.com is blocked from the search tool. So the findings below come from **search-engine result snippets and summaries**, not full-page reads. Treat pricing and feature details as "as indexed" and check them on the live page before relying on them. Direct Reddit quotes from r/tattooartists, r/TattooApprentice and r/tattoo could not be collected (see Gaps).

Important self-reference: a search for "Tattoo Preview 3D & AR app body model cm size skin tone" returned **github.com/samike93/Tattoo**, which is this project's own repo (its git remote is `https://github.com/samike93/Tattoo`). The search engine summarized it as "a browser app for tattoo consultations that lets you put a design on a to-scale 3D body, wrap it around arms and legs without stretching, and size it in inches ... male or female, the client's height in feet and inches, build, muscle, and skin tone. Sliders ... show the exact size in inches and centimetres." **That is our tool, not a competitor.** Do not confuse it with the App Store app "Tattoo Preview - 3D & AR" (id6760173684), which is a separate iPad app.

## Q1. Which tools exist (2025-2026) and what exactly do they do?

### Takeaway
The market has four groups: (1) 3D body viewers (TryTattoo3D on the web, the "Tattoo Preview - 3D & AR" iPad app, Tatspark); (2) live-camera AR try-on (InkHunter, Inkjin, Tatship, Tattoodo's 2025 "try it on"); (3) AI photo try-on and design generators (Fotor, Picsart, Tatship, PreInk, ai-tattoos.com, many "Tattoo AI" clones); and (4) artist-side workflows (Procreate 3D painting on purchased body models, Procreate or Photoshop overlays on client photos, PSD mockup templates). Judging only from what the listings say, none of the consumer tools offer all of these together: real-world scale (cm/in) tied to the client's height, adjustable body shape, and distortion-free wrapping. Several claim "real scale" or "3D" but do not explain how they achieve it.

### Cited Findings

**TryTattoo3D (web; desktop + mobile browser)**
- Calls itself "the world's only 3D simulator" for seeing tattoo designs on a human body. The flow: upload a design, place it on a realistic 3D body model, then resize and rotate it — [trytattoo3d.com](https://trytattoo3d.com/)
- Offers "3D models of different genders or skintones". The experience is described as straightforward on desktop and mobile — [trytattoo3d.com](https://trytattoo3d.com/); [Pitchwall listing](https://pitchwall.co/product/try-tattoo-3d)
- Pricing as indexed:
  - **Free**: placement/resize/rotate, limited 3D models, demo tattoo images only, local session, no sharing.
  - **Solo, $4.99 one-time**: all 3D models, your own tattoo upload, custom skin tone, local session only, **no sharing**.
  - **Pro, $4.99/month**: adds cloud storage/sync, unlimited cloud projects, save/share/export, and AI "generate tattoo designs".
  - Source: [TryTattoo3D pricing](https://trytattoo3d.com/pricing/)
- The indexed content says nothing about body-shape sliders (belly, thighs, breasts, height), about measured sizes in cm/in, or about how the design wraps (projection vs. conformal). These could not be verified because the page fetch was blocked — [trytattoo3d.com](https://trytattoo3d.com/)

**Tattoo Preview - 3D & AR (iPad app, id6760173684)**
- "3D Try-On & AR Editor". Place a design on a 3D body model, view it from different angles, and move/rotate/scale it. An AR mode shows the design "in real-world scenes". Pitched at "tattoo artists, tattoo lovers, and anyone planning their next ink" — [App Store](https://apps.apple.com/us/app/tattoo-preview-3d-ar/id6760173684)
- Free with in-app purchases. One search summary named a "Pro" IAP at $3.99, another did not show a price. The app is built for iPad, rated 16+, in Graphics & Design, 152.4 MB — [App Store](https://apps.apple.com/us/app/tattoo-preview-3d-ar/id6760173684)
- No indexed detail on body types, skin tones or measured sizing.

**InkHunter (iOS + Android; the original AR try-on, launched about 2016)**
- An AR app for "trying tattoos before you ink indelibly". You draw a marker (a "smiley" made of three lines) on your skin, and the camera tracks the marker and overlays the design — [TechCrunch 2016](https://techcrunch.com/2016/04/06/inkhunter-is-an-ar-app-for-trying-tattoos-before-you-ink-indelibly); [Medium XR evaluation](https://medium.com/@pchang4/xr-evaluation-1-inkhunter-79d9ad8d808c)
- About 4.7/5 on the App Store from more than 60,000 ratings (as summarized). Some users praise realism: "The tattoos look extremely realistic" — [JustUseApp reviews](https://justuseapp.com/en/app/991558368/inkhunter-try-tattoo-designs/reviews)
- The current App Store name is "INKHUNTER - AI Tattoo Design". Weekly subscription is $6.99/week (€7.99 premium in some regions). A 2026 review aggregator reports that "the shift towards AI-generated designs and the removal of the custom upload feature" has been "widely criticized" — [App Store](https://apps.apple.com/us/app/inkhunter-ai-tattoo-design/id991558368); [Marlvel intel report](https://marlvel.ai/intel-report/lifestyle/inkhunter-inkhunter-pro)
- Name confusion: Google Play has an "Inkhunter : 3D Tattoo Preview" from a different developer (com.alhaiSofts), and the App Store has an "InkHunter Pro" (id6755648336) whose URL also resolves as "Tattoo 3D Preview". These look like unofficial look-alikes — [Google Play](https://play.google.com/store/apps/details?id=com.alhaiSofts.tattooPreviewer&hl=en-US); [App Store id6755648336](https://apps.apple.com/us/app/tattoo-3d-preview/id6755648336)

**HanInk**
- No tattoo preview app called "HanInk" turned up. Searches for "HanInk" tattoo only returned individual artists (e.g., a fineline/graphic artist "Hanink", Hanman Ink in Ojai CA) — [search results incl. hanman.ink](https://hanman.ink/). (See Gaps.)

**Tattoodo**
- Mainly an artist marketplace and booking platform: booking assistants, quotes, booking links for Instagram/TikTok, and a claimed 20M+ monthly users — [Tattoodo on Google Play](https://play.google.com/store/apps/details?id=com.tattoodo.app&hl=en_US); [Jotform roundup](https://www.jotform.com/blog/best-apps-for-tattoo-artists/)
- Version 10.1.0 (August 2025) reportedly added an AI "try it on" feature that uses the camera to place library designs on your skin. This comes from a search summary of store listings and was not confirmed on a primary page — [Tattoodo App Store](https://apps.apple.com/us/app/tattoodo-book-tattoo-artists/id1057590314); [mwm.ai listing](https://mwm.ai/apps/tattoodo-your-next-tattoo/1057590314)

**Tatship (web + iOS + Android)**
- Camera or photo-upload try-on that "blends tattoos naturally with skin tone, lighting and body curvature". Includes an AI generator, photo-to-tattoo, and automatic background removal — [tatship.com](https://tatship.com/); [Google Play](https://play.google.com/store/apps/details?id=com.tatship&hl=en_US)
- Pricing as indexed:
  - Free: 5 try-ons and 10 AI designs per month.
  - Basic: about $9.99/month.
  - Unlimited: about $39.99/month.
  - Source: [Lipi AI review 2026](https://lipiai.blog/tatship-ai-review/); [nemovideo](https://www.nemovideo.com/alternative/tatship)
- One aggregated review scored it 3/5 for value and only **2/5 for "quality results"** — [nemovideo review summary](https://www.nemovideo.com/alternative/tatship)

**Inkjin (web/app)**
- Free AR try-on with no sign-up. It claims "real 3D on your actual skin ... placement, size, and how it moves with your body" and "real scale". It also offers artists "BookPay", a free booking page with deposits and intake forms — [inkjin.com](https://inkjin.com/en/try-on-tattoos-ar)

**AI photo try-on and generators**
- **Fotor**: AI tattoo generator plus a "tattoo simulator". You upload a photo and try a design on the forearm, chest, thigh, back, wrist or behind the ear — [Fotor](https://www.fotor.com/ai-tattoo-generator/)
- **Picsart**: AI tattoo design generator with "31+ AI models" and a Tattoo Art style. The indexed page is about generating designs, not placing them on a body — [Picsart](https://picsart.com/ai-image-generator/tattoo/)
- Others:
  - PreInk (photo upload try-on) — [Google Play](https://play.google.com/store/apps/details?id=com.metacortext.tattoo.ai&hl=en_US)
  - ai-tattoos.com (upload an arm or shoulder photo, "depth-aware fit") — [ai-tattoos.com](https://ai-tattoos.com/tattoo-try-on/)
  - Tatspark ("3D Virtual Try-On" plus AI co-creation) — [tatspark.com](https://tatspark.com/)
  - Veme (claims an export that "looks like a real healed piece") — [veme.ai](https://www.veme.ai/tools/tattoo-simulator)
  - Many App Store "Tattoo AI" clones, e.g., "Tattoo AI Generator Try-On Lui", which previews designs on photos "as realistic skin overlays" for "testing size, placement" — [App Store](https://apps.apple.com/app/id6752377181)
- The "Tattoo: ink body editor AR" app charges from $12.99/week up to $119.99 for full access — [App Store](https://apps.apple.com/ai/app/tattoo-ink-body-editor-ar/id1225960459)

**Procreate 3D body models (artist-side, iPad)**
- Procreate (5.2+) imports .OBJ/.USDZ models and lets you paint directly on them. Sellers market this as eliminating stencil distortion and showing "exactly where a stencil would warp around the bicep and forearm". Artwork "can be exported to a 2D image for stencil" — [search summary of bebrushes.com and listings](https://bebrushes.com/best-3d-models-for-procreate/); [Procreate help](https://help.procreate.com/articles/sCCFH-cant-paint-on-3d-model)
- **Lost Otzi** (Gumroad):
  - 13 body-part "canvases" including full body, torso, bust, chest, pelvis, and left/right shin, leg, arm and forearm.
  - 2K/4K, USDZ, for iPad Pro + Procreate 5.2+.
  - Male and female in **3 body types** each.
  - Pricing: full packs from $40+, Male Fit sample $10+, Arms Combo $19+, Torso $14+.
  - Marketing claims: "improve communication during consultations ... place them exactly where the client wanted".
  - Sources: [Lost Otzi Male Fit](https://lostotzi.gumroad.com/l/Male_Fit); [Lost Otzi Female Small](https://lostotzi.gumroad.com/l/Female_Small?layout=profile)
- **Tattoo Smart "Model Humans"**: 4 males and 4 females, "extra small to extra large and athletic builds" — [tattoosmart.com](https://tattoosmart.com/products/model-humans-advanced-3d-body-parts)
- **Procreations Digital**: male and female "Body Placement Template" 3D models — [procreationsdigital.com](https://procreationsdigital.com/en-us/collections/body-templates)
- **ArtPrintBabe** (Gumroad): female + male Procreate 3D models, $7, 2 files, "recolor it and add textures, tattoos" — [Gumroad](https://artprintbabe.gumroad.com/l/fyomi)
- Etsy:
  - A $3 female body model.
  - 3-pose female sets.
  - A "12 BUNDLE" of arm/leg/torso models.
  - An "Ultimate" pack.
  - A "42"-model bundle advertising UV layouts with "minimal distortion".
  - Sources: [Etsy female](https://www.etsy.com/listing/1154863856/procreate-3d-object-body-procreate-model); [Etsy 12 bundle](https://www.etsy.com/listing/1153844041/12-bundle-procreate-3d-models-procreate); [Etsy ultimate bundle](https://www.etsy.com/listing/1820506614/the-ultimate-3d-tattoo-model-bundle-42)
- Creative Market "Tattoo Procreate 3D Model Bundle" (Procreate3DStudio) — [Creative Market](https://creativemarket.com/Procreate3DStudio/10917968-Tattoo-Procreate-3D-Model-Bundle)
- ArtStation: 4K Procreate tattoo-simulation models for man and woman — [ArtStation](https://www.artstation.com/marketplace/p/2Kbe9/4k-procreate-3d-models-procreate-tattoo-model-tattoo-simulation-3d-woman-model-3d-man-model-procreate-stamps-for-tattoo-artists)
- Skin-tone variants are sold explicitly so clients can "see how designs will look on their specific skin color". 3D hand models are sold to "simulate for clients how the project will look on their skin color, preventing surprises" — [search summary of Gumroad listings](https://procreate1nk.gumroad.com/l/vgmlgh)
- 2D alternatives: Procreate "Body Part Mockup Brush Set" (50+ body parts) and body template stamps, e.g., "300 Plus Size Female Body Stamps" — [Gumroad](https://xsraurs.gumroad.com/l/TattooBodyTemplates); [Etsy](https://www.etsy.com/market/procreate_tattoo_brushes_body_template)

**Photoshop / PSD / Canva-type mockups**
- PSD mockup templates use smart-object layers. You drag in a design and adjust blend mode, opacity and shadow so it "looks as if the tattoo is truly on the skin" — [templateupdates.com](https://www.templateupdates.com/mockups/tattoo-psd-mockup-templates)
- The standard realism workflow:
  1. Duplicate the photo, desaturate it and Gaussian-blur it (about 3 px) to make a displacement map.
  2. Set the tattoo layer to Multiply (or Soft Light/Overlay).
  3. Apply Filter > Distort > Displace using that map, so the design bends into creases and around contours.
  - Sources: [PSDESIRE](https://photoshopdesire.com/add-realistic-tattoo-person-arm-body-photoshop/); [Envato Tuts+](https://design.tutsplus.com/tutorials/use-a-tattoo-font-to-add-a-realistic-tattoo-to-a-photo-in-photoshop--cms-33434)
- BeFunky offers a clipping-mask workflow for placing a design onto an arm photo — [BeFunky](https://www.befunky.com/learn/design-your-own-tattoo-mockups/)

**Studio websites with an embedded preview widget**
- No studio website with an embedded 3D or AR tattoo preview widget turned up. The tattoo-studio widget market is about booking: Appointo, Bookeo, Reservio, EasyWeek, Inkquarters. The nearest thing to combining preview and booking is Inkjin, which bundles AR try-on with its free BookPay booking pages — [Bookeo](https://www.bookeo.com/appointments/tattoo-booking-software/); [Appointo](https://www.appointo.me/appointment-booking-app-for-tattoo-studios); [Inkjin](https://inkjin.com/en/try-on-tattoos-ar)

### Inferences
- Many apps claim "3D", but most consumer try-ons are 2D overlays on a photo or camera feed, sometimes with AI blending. The only tools that actually render on a 3D body are TryTattoo3D, the iPad "Tattoo Preview" app, and the Procreate model packs.
- Body-type variety is mostly fixed presets rather than continuous shape sliders: Lost Otzi has 3 builds per sex and Tattoo Smart has XS to XL. No consumer tool was found with continuous sliders for belly, thigh or breast.
- An in-browser tool with height-driven true scale, shape sliders, conformal wrapping and a shareable link would cover what TryTattoo3D does. It would also fill gaps that the indexed listings for TryTattoo3D and the Procreate packs do not mention.

### Gaps
- "HanInk" could not be identified as a preview product. It may be misnamed, regional (e.g., a Chinese/Korean app) or delisted.
- TryTattoo3D: number of models, whether it shows sizes in cm/in, how it projects the design, and whether it has shape sliders could not be verified (fetch blocked).
- "Tattoo Preview - 3D & AR": body types, scale and exact pricing are unverified.
- Tattoodo's "try it on" exists only in a search summary. It was not confirmed on a primary page.

## Q2. Per-tool attributes (platform, price, placement, wrap, real size, body types, skin tones, realism, export)

### Takeaway
Real-world size readouts and continuous body-shape control are almost absent from the market. Skin tone is the most common customization. Sharing or export is usually behind a paywall (TryTattoo3D Pro, Tatship tiers, InkHunter weekly subscription).

### Cited Findings

| Tool | Platform | Price (as indexed) | Placement | Wraps curves? | Real size (cm/in) | Body types | Skin tones | Realism | Export/share |
|---|---|---|---|---|---|---|---|---|---|
| TryTattoo3D | Web (desktop + mobile) | Free / $4.99 one-time Solo / $4.99/mo Pro | Drag, resize, rotate on a 3D model | Not stated | Not stated | "Different genders"; models gated | Custom tone (Solo+) | 3D render | Pro only ("save/share/export") |
| Tattoo Preview - 3D & AR | iPad | Free + IAP | Move, rotate, scale on a 3D model, plus an AR mode | Not stated | Not stated | Not stated | Not stated | 3D + AR | Not stated |
| InkHunter | iOS/Android | $6.99/week | Camera AR on a drawn marker | No; floats off at arm edges | No | Your own body (live) | Your own skin | Overlay | Photo capture |
| Tatship | Web/iOS/Android | Free (5 try-ons/mo), ~$9.99, ~$39.99/mo | Camera or photo upload | Claims "body curvature" blending | Not stated | Your own body (photo) | Auto-blend | AI blending; 2/5 "quality results" | Yes |
| Inkjin | Web/app | Free | Camera AR | Claims "real 3D" | Claims "real scale" | Your own body | Your own skin | AR | Not stated |
| Fotor / PreInk / ai-tattoos.com | Web/app | Freemium | Photo upload | AI "depth-aware" (claimed) | No | Your own photo | Your own skin | AI composite | Download |
| Procreate + model packs | iPad (Procreate) | $3 to $40+ per pack | Paint directly on the mesh | Yes, via UV (can distort or seam) | No built-in scale | 1 to 4 presets per sex (XS to XL in some packs) | Recolor; tone variants sold | Depends on artist | Image or time-lapse export |
| Photoshop PSD / displacement | Desktop | Template cost | Smart object + Displace filter | Approximate (displacement map) | No | Whatever photo you use | Whatever photo you use | High if done well | Image |

Sources for each row are the ones cited under Q1. Specific facts:
- TryTattoo3D tiers — [pricing](https://trytattoo3d.com/pricing/)
- InkHunter cannot wrap edges: "not able to track around rounded corners such as the edge of an arm ... the image would remain flat and float off of the arm" — [Medium XR evaluation](https://medium.com/@pchang4/xr-evaluation-1-inkhunter-79d9ad8d808c)
- Tatship tiers and the 2/5 quality score — [Lipi AI](https://lipiai.blog/tatship-ai-review/); [nemovideo](https://www.nemovideo.com/alternative/tatship)
- Procreate UV issues: overlapping-UV warnings, and paint that "stops in one area and reappears elsewhere" when UVs repeat — [Procreate help](https://help.procreate.com/articles/sCCFH-cant-paint-on-3d-model); visible UV seams on exported Procreate models — [Blender Artists](https://blenderartists.org/t/uv-seams-visible-on-3d-model-imported-from-procreate/1492423)
- Lost Otzi has 3 body types per sex; Tattoo Smart has 4+4 from XS to XL — [Lost Otzi](https://lostotzi.gumroad.com/l/Female_Small?layout=profile); [Tattoo Smart](https://tattoosmart.com/products/model-humans-advanced-3d-body-parts)
- 2D web simulators were criticized for "flat overlay, no depth", not following "body curves", "same angle from any view", and "no real scale reference" — [search summary of the makemea.ai 2026 roundup](https://makemea.ai/blog/ai-tattoo-preview-generator-2026). This comes from a vendor blog with its own agenda.

### Inferences
- **Healed vs. fresh**: no tool was found that explicitly simulates fresh vs. healed vs. aged ink. Veme's "looks like a real healed piece" is marketing copy, not a toggle. This is an open opportunity: blur and spread of fine lines, desaturation, slight edge softening.
- **Stencil view**: no consumer tool advertises one. Procreate sellers sell the "export to 2D for stencil" step as their benefit.

### Gaps
- Exact skin-tone counts, body-model counts and export resolutions for the consumer apps were not available.

## Q3. How do working artists actually use these in consultations and before quoting?

### Takeaway
Per the indexed guides and Procreate-model listings, artists mostly work on the iPad: Procreate overlays on a photo of the client's body part (blend modes, color-dropper skin matching), or Procreate 3D models when no photo is available or to show wrap. They then send the mockup image or time-lapse over DM or text for approval before the appointment. At the studio, many still treat the paper stencil or tracing paper on the actual body as the final check.

### Cited Findings
- "The vast majority of tattoo artists design ... on an iPad with ... Procreate". Some present "a preview photo of the tattooed body part"; "all they need is a picture of the customer" — [Medium / Starr Tattoo Supplies](https://medium.com/starr-tattoo-supplies/how-to-design-your-tattoo-on-procreate-38952429d4b0)
- Envato's guide recommends using a photo of the client's body part, or else "a simple drawn arm template". Artists use Procreate layer blending modes and the Color Dropper to match skin — [Envato Tuts+ Procreate for tattoos](https://design.tutsplus.com/tutorials/how-to-use-procreate-for-tattoos--cms-109190)
- Procreate's default time-lapse recording is used to share with clients and on social. Digital designs "can be shared instantly for feedback, reducing the need for physical meetings" — [Yohann blog](https://www.yohann.com/blogs/journal/procreate-for-tattoo-artists); [Worldwide Tattoo Supply](https://worldwidetattoo.com/blogs/news/mastering-tattoo-design-in-procreate-guide)
- Client-side advice: ask for "a placement mockup or stencil preview placed on a photo of the target area", and send front, side and back photos in good light "so your artist can judge curvature and available space" — [Sortra](https://sortra.com/how-to-explain-tattoo-placement-to-artist/); [Sortra pre-session guide](https://sortra.com/how-to-check-tattoo-design-before-appointment/)
- Procreate 3D model sellers pitch these problems: "Tattoo artists struggle with presenting designs to clients who don't share the same level of experience and imagination", and wasted design time. The same 3D models are also marketed for testing "scale, flow, and positioning before committing to skin" — [search summary of Gumroad listings](https://lostotzi.gumroad.com/l/Male_Fit); [Procreations Digital](https://procreationsdigital.com/en-us/products/female-3d-model)
- A studio's skeptical view (Los Angeles Tattoo Shop): "Placement mockup apps are almost universally misleading" because they ignore how skin moves and folds and are viewed at "phone-camera-distance" rather than arm's length. "The honest alternative: the artist draws the design on tracing paper, you hold it on your actual forearm in a mirror". AI placement mockups "ignore how skin folds, where muscles sit, how tendons move" — [losangelestattooshop.com](https://losangelestattooshop.com/ai-and-tattoos/)
- Artists report that AI-generated designs create unrealistic expectations: details "impossible on real skin". One artist says people "seem to really trust what AI gives them" — [ResultSense, 2025-10-29](https://www.resultsense.com/news/2025-10-29-ai-tattoo-creativity-impact/)
- Fine lines, single-needle work and tight negative space soften and spread over time, which "no AI model can show you in advance" — [aifortattoo.com](https://www.aifortattoo.com/library/will-my-ai-tattoo-look-different-on-skin); [Tatspark library](https://tatspark.com/en/library/ai-tattoo-impossible-lines)

### Inferences
- For a solo artist, the competing workflow is "Procreate on a client photo, sent over Instagram DM". A browser tool has to beat it on speed and believability, and needs a share-by-link or image export that drops straight into a DM.
- Credibility with artists likely depends on showing true scale relative to the client's body and avoiding AI "hallucinated" detail. The LA shop critique centers on scale and skin behavior, not on how pretty the render is.

### Gaps
- No direct Reddit (r/tattooartists, r/TattooApprentice, r/tattoo) quotes could be retrieved: reddit.com is blocked from the search tool and fetches were blocked. YouTube/TikTok tutorial content was found only as discovery pages ([TikTok](https://www.tiktok.com/discover/how-to-make-a-tattoo-mockup)), without transcripts.
- No data was found on what share of artists use 3D tools vs. photo overlays, or on whether mockups are made before or after the quote/deposit.

## Q4. Common app-store complaints

### Takeaway
The recurring complaints are: the "sticker" look (no occlusion or blending), designs that don't wrap curved limbs, finicky marker tracking, sizing that misleads, aggressive weekly subscriptions and ads, and removal of custom upload in favor of AI generation.

### Cited Findings
- **Sticker look**:
  - "literally a sticker that you can paste on top of your live selfie"
  - "you can't erase the tattoo around clothes or where your body ends so it looks like somebody literally slapped a sticker on a physical photo"
  - Another review: "poor quality sticker" designs.
  - Source: reviews surfaced via [Google Play "Try Tattoo On Your Photo"](https://play.google.com/store/apps/details?id=com.mirouu.tatoyourself&hl=en) and related listings (search summary; exact app attribution unclear).
- **Tracking (InkHunter)**: "If the camera moved suddenly, the app would lose the tracking image". At angles the overlay had "a slight shakiness" and failed at extreme angles. Arm hair made the smiley hard to detect. The design didn't fully cover the marker lines, which "ended up looking like raised bumps" — [Medium XR evaluation](https://medium.com/@pchang4/xr-evaluation-1-inkhunter-79d9ad8d808c); [Medium (Gall)](https://medium.com/@arielgall16/enter-inkhunter-when-ar-and-tattooing-collide-3b1c1c68b823)
- **No curved wrap**: the overlay stays flat and floats off the edge of the arm — [Medium XR evaluation](https://medium.com/@pchang4/xr-evaluation-1-inkhunter-79d9ad8d808c)
- **Paywalls and ads**:
  - "filled with a popup every few minutes trying to get you pay $6 a week for pro version"
  - "unusable due the constant bombardment of ads"
  - Freezing, and paid features staying locked.
  - Sources: [Marlvel InkHunter report](https://marlvel.ai/intel-report/lifestyle/inkhunter-inkhunter-pro); [JustUseApp](https://justuseapp.com/en/app/991558368/inkhunter-try-tattoo-designs/reviews)
- **Feature removal**: InkHunter removed custom upload while shifting to AI designs, and this was "widely criticized" — [Marlvel](https://marlvel.ai/intel-report/lifestyle/inkhunter-inkhunter-pro)
- **AI app billing**: one AI tattoo app was called "completely misleading" over a free trial with "secret charges", and the features people want (color options, skin placement previews) are "gated behind a paywall" — [Jotform AI generator test](https://www.jotform.com/ai/best-ai-tattoo-generator/) (search summary)
- **Sizing**: one user said a design "looked way too big on my frame" in AR, "scaled it down, got it done, love it". This shows size checking is valuable, and that perceived size is often wrong without a reference — [search summary, Inkjin page](https://inkjin.com/en/try-on-tattoos-ar)
- **Quality**: Tatship scored 2/5 on "quality results" — [nemovideo](https://www.nemovideo.com/alternative/tatship)

### Inferences
- Avoid the patterns users hate: weekly subscriptions, interstitial upsells, and hiding export or sharing behind a paywall. These are the most-cited non-technical complaints.
- Visual complaints come down to occlusion and edge handling, conformal wrap, and lighting/blending. A 3D mesh with a proper skin shader and multiply-style ink solves these by construction in a way photo overlays cannot.

### Gaps
- Few verbatim reviews were retrievable for TryTattoo3D or the iPad "Tattoo Preview - 3D & AR" app. Their review sentiment is unknown.

## Q5. Which features are most valued?

### Takeaway
Across sellers' pitches, artist practice and user complaints, the most-valued capabilities are:
1. Accurate scale and placement relative to the real body.
2. Distortion-aware wrap, which predicts how the stencil will warp.
3. Matching skin tone to the client.
4. Body-type variety.
5. Fast sharing with the client.

A stencil export and an honest "healed/aged" look are rarely offered but come up repeatedly as pain points.

### Cited Findings
- **Scale**: "no real scale reference" is listed as a key failure of 2D simulators — [makemea.ai via search](https://makemea.ai/blog/ai-tattoo-preview-generator-2026). Inkjin and the LA shop both put real scale at the center of the problem — [Inkjin](https://inkjin.com/en/try-on-tattoos-ar); [LA Tattoo Shop](https://losangelestattooshop.com/ai-and-tattoos/)
- **Wrap and stencil distortion**: 3D models in Procreate show "exactly where a stencil would warp around the bicep and forearm" and avoid "hours adjusting warped paper stencils" — [search summary of 3D model listings](https://bebrushes.com/best-3d-models-for-procreate/)
- **Skin tone**: sellers offer tone variants "so clients can see how designs will look on their specific skin color", "preventing surprises and unhappy clients" — [Gumroad listings via search](https://procreate1nk.gumroad.com/l/vgmlgh). TryTattoo3D sells custom skin tone as a paid feature — [pricing](https://trytattoo3d.com/pricing/)
- **Body types**: sellers advertise slim, athletic and curvy, and XS to XL — [Tattoo Smart](https://tattoosmart.com/products/model-humans-advanced-3d-body-parts); [Etsy market](https://www.etsy.com/market/procreate_3d_body_tattoo_placement)
- **Sharing**: TryTattoo3D charges a monthly subscription for share/export, which suggests sharing is seen as the premium feature — [pricing](https://trytattoo3d.com/pricing/). Artists value instant digital sharing to "speed up approval" — [Worldwide Tattoo Supply](https://worldwidetattoo.com/blogs/news/mastering-tattoo-design-in-procreate-guide)
- **Aging realism**: fine lines spread over time, and no tool shows this — [aifortattoo.com](https://www.aifortattoo.com/library/will-my-ai-tattoo-look-different-on-skin)

### Inferences (implications for our in-browser tool)
- Keep and promote height-driven true scale with cm/in readouts. This is the clearest differentiator against both TryTattoo3D (as indexed) and the AR/AI apps.
- Add or strengthen:
  - A **share-link / one-tap image export** formatted for an Instagram DM, free and not paywalled.
  - A **flattened stencil export** that matches the wrapped size.
  - A **fresh / healed / aged** toggle (line spread, softer edges, lower saturation, slightly lighter black on darker skin tones).
  - **More continuous shape sliders** (belly, chest/bust, hips/thigh), since competitors only offer 1 to 4 presets.
  - A side-by-side **multi-view export** (front, 3/4, side) to answer the "same angle from any view" complaint.
- Optional: let the client's own photo serve as a reference next to the 3D view, to bridge to how artists work today (Procreate photo overlay).

### Gaps
- No quantitative survey ranks these features. The ranking above is inferred from seller marketing, review complaints and studio commentary, not from measured artist preference.
