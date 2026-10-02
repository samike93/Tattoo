# Capturing the Client's Body for a Browser-Based (three.js, iPad Safari) Tattoo Preview

Research date: 2026-10-02. Note on method: several primary sources (arxiv.org, ncbi/PMC, mdpi.com, learn.poly.cam, kiriengine.app, europe.naverlabs.com, clad.you) were blocked by the network egress proxy, so some figures below come from search-engine snippets of those pages rather than full-text reads. Those are flagged "(snippet)". GitHub pages and raw licence files were read directly.

## 1. iPad/iPhone LiDAR and photogrammetry scanning apps: formats, accuracy, scan time, tiers

### Takeaway
A native scanning app (Scaniverse, KIRI Engine, 3d Scanner App or Polycam paid) can produce a scaled GLB/OBJ/USDZ mesh of a limb in under about a minute. Published studies put LiDAR/phone-scan error for human limbs and torso at about 1 to 1.5 cm on circumferences (roughly 1.5 to 7% depending on site), and much less on rigid objects (under 3.5 mm). The main error source is the client moving, not the reconstruction. For a free GLB/OBJ export, Scaniverse, KIRI Engine (since v4.0) and 3d Scanner App are the most practical. Polycam's free tier is limited to glTF.

### Cited Findings
**Accuracy studies (human bodies)**
- iPad Pro with LiDAR, 3 independent raters, 7 longitudinal body distances: digital measurement errors below 1.5%, with high precision and inter-rater agreement (Sensors 2024, 24(2):500) (snippet) — [MDPI/PMC](https://doi.org/10.3390/s24020500)
- iPhone 12 Pro LiDAR body measurement: height error 0.55%, hip error 3.84%, waist error 6.90% (snippet) — [ResearchGate](https://www.researchgate.net/publication/358080588_Human_body_measurement_with_the_iPhone_12_Pro_LiDAR_scanner)
- Smartphone photogrammetric scanning with Polycam vs Fit3D depth-sensor scanner: 228 paired scans from 141 pregnant participants, 4 landmarks (calf, buttock, abdomen, wrist). Biases were consistently negative (Polycam smaller by 7.8 to 15.0 mm). ICC was above 0.80 at all landmarks and above 0.90 at three, and Pearson r was above 0.90. Relative accuracy was better on large circumferences (hip, waist) than on calf and wrist (snippet) — [arXiv 2608.12827](https://arxiv.org/abs/2608.12827)
- Same study: on a rigid mannequin, mean differences from tape were below 3.5 mm. The authors attribute the larger human errors mainly to subject motion and scale drift, not to reconstruction (snippet) — [arXiv 2608.12827](https://arxiv.org/html/2608.12827v1)
- Smartphone LiDAR in lower-extremity lymphedema (Biosensors 2025, 15(6):381): inter-rater ICC for circumference was 0.988 (LiDAR) vs 0.998 (tape) in a healthy volunteer. LiDAR was faster (64.0 ± 15.1 s vs 115.3 ± 30.6 s for tape). Ankle, calf and knee agreed well, while foot and **thigh** showed lower correlation and larger discrepancies (snippet) — [Biosensors / PMC12190992](https://doi.org/10.3390/bios15060381)
- iPad Pro (3rd gen) with Polycam on athletes' lower limbs: each scan took **under 1 minute**, but only about half of the lower-limb scans were complete and good quality. The rest were distorted or had missing data around shank or thigh. The software could only extract lengths, not circumferences (snippet) — [Sports 2024, 12(4):92](https://doi.org/10.3390/sports12040092)
- Review statement: iPhone/iPad LiDAR reaches centimetric to sub-centimetric accuracy, and error grows with dynamic capture and larger coverage because of pose/SLAM drift (snippet) — [ResearchGate summary](https://www.researchgate.net/publication/358080588_Human_body_measurement_with_the_iPhone_12_Pro_LiDAR_scanner)
- Breast-scanning app on iPhone LiDAR: 95% Bland-Altman limits of agreement below ±2 mm (snippet) — [ResearchGate](https://www.researchgate.net/publication/369257833_Development_of_Three-Dimensional_Breast_Scan_and_Measurement_Application_Using_Laser_Imaging_Detection_and_Ranging_LiDAR_Sensor_on_iPhone)
- A 2026 paper compares LiDAR accuracy across iPhone models and raises reproducibility concerns across devices (title only; numbers not retrieved) — [Remote Sensing Letters 2026](https://www.tandfonline.com/doi/full/10.1080/2150704X.2026.2720055)

**Apps: export formats and tiers**
- **Polycam**: the free tier exports glTF only, capped at 150 images per model, with public-only share links. OBJ/FBX/STL/point clouds need a paid plan (Basic: 12 formats). Business/Enterprise add PLY/LAS/PTS/XYZ point clouds. Pricing from about $26.99/mo (third-party summaries) — [SkyeBrowse review](https://www.skyebrowse.com/news/posts/polycam-review); [Polycam pricing](https://poly.cam/pricing)
- **Scaniverse** (Niantic Spatial): free. Exports meshes as OBJ, FBX, GLB, USDZ, LAS and splats as PLY or SPZ. Offers on-device processing and Gaussian splatting — [App Store](https://apps.apple.com/us/app/scaniverse-3d-scanner/id1541433223); [Sketchfab blog](https://sketchfab.com/blogs/community/scaniverse-adds-sketchfab-integration/)
- **KIRI Engine** v4.0 (Sept 2025) removed the 3-exports-per-week cap on Basic (free) accounts. All users can export unlimited scans as OBJ, FBX, STL, GLB, glTF, USDZ, PLY, XYZ — [Digital Production](https://digitalproduction.com/2025/09/13/faster-wider-cleaner-kiri-engine-4-0-drops-mobile-scan-limits/); [CG Channel](https://www.cgchannel.com/2025/09/kiri-engine-4-0-is-out-for-android-and-ios/)
- **RealityScan** (Epic) mobile: photo-based mesh only (no 3DGS), up to 300 photos per scan, unlimited free scanning/export per KIRI's comparison blog (vendor-biased source). The exact export format list was not confirmed — [KIRI blog](https://www.kiriengine.app/blog/Best_Free_3D_Scanner_Apps_2026)
- **3d Scanner App** (Laan Labs): free with in-app purchases. Uses LiDAR or TrueDepth. Exports USDZ, OBJ, glTF, GLB, DAE, STL and point clouds (PTS, PCD, PLY, XYZ, LAS). Can also export raw photos for external photogrammetry — [App Store](https://apps.apple.com/us/app/3d-scanner-app/id1419913995); [3dscannerlidar.com](https://www.3dscannerlidar.com/)
- **Luma 3D Capture**: still on the App Store with an iOS 26 fix release (v1.3.12, Oct 4, 2025). Exports NeRF/Gaussian splats and meshes to Unreal/Unity. Luma sunset its "Genie" generative 3D on Jan 1, 2026, and the company's focus is now generative video (inference) — [App Store](https://apps.apple.com/us/app/luma-3d-capture/id1615849914); [radiancefields.com](https://radiancefields.com/platforms/luma-ai)
- **Apple Object Capture** (RealityKit PhotogrammetrySession, iOS/iPadOS 17+ on-device; macOS since 12): native Swift API only. Recent on-device object capture requires a LiDAR device. It is designed for static objects — [Apple Fandom summary](https://apple.fandom.com/wiki/Object_Capture); [Apple dev forum](https://developer.apple.com/forums/thread/769221); [Vuforia doc](https://developer.vuforia.com/library/vuforia-engine/images-and-objects/model-targets/using-3d-scans/model-targets-apples-object-capture/)

### Inferences
- For true-size tattoo wrapping, a circumference error of about 1 to 1.5 cm on a 30 cm forearm or calf is roughly 3 to 5% in surface size. That is acceptable for a preview, but a reference tape measurement in the app is still worth having for final sizing.
- **Motion is the dominant error.** A seated client with the arm braced on an armrest or a tattoo bench gives better results than a standing full-body scan. A LiDAR sweep of one limb (20 to 60 s) is realistic. Full-orbit photogrammetry (100 to 300 photos) is harder for a person to hold still through.
- LiDAR scales come out metric automatically. Photogrammetry-only apps (RealityScan, KIRI photo mode) may need a scale reference (a ruler or known-size marker in frame) unless they fuse ARKit pose data.
- Thigh and foot are consistently the least accurate sites. Torso and back scans of a standing person drift the most.
- The simplest integration is: scan in Scaniverse, KIRI or 3d Scanner App, then AirDrop or Files a GLB into the web app, then load it with three.js GLTFLoader. Expect noisy, non-manifold meshes with baked lighting. The app will likely need to decimate/remesh and generate UVs, or project the tattoo decal (DecalGeometry or the existing expmap placement) instead of relying on scan UVs.

### Gaps
- Polycam's own "How Accurate Are Polycam Scans?" page and its Terms of Use could not be fetched (egress blocked). Whether its ToS restricts scanning people commercially was not confirmed.
- No published mm-accuracy figures specific to Scaniverse, KIRI, Luma or 3d Scanner App on human limbs were found. Most studies used Polycam or custom apps.
- Exact RealityScan mobile export format list and its 2026 licence terms were not confirmed.
- Apple's docs on whether Object Capture explicitly excludes people were not found.

## 2. Can the web app capture a scan itself?

### Takeaway
No, not in iPad Safari as of late 2026. Safari on iOS/iPadOS still exposes no WebXR immersive-ar and no depth sensing, so the web app cannot read LiDAR depth or ARKit poses. A web-only capture is limited to camera photos/video via getUserMedia plus ML estimation, or uploading a GLB made in a native app. On-device ARKit/Object Capture APIs are native-only (Swift).

### Cited Findings
- Safari does not implement the WebXR Device API on macOS, iOS or iPadOS: no immersive-vr, no immersive-ar, no ARKit access from the browser — [TestMu AI WebXR 2026 guide](https://www.testmuai.com/learning-hub/webxr-compatible-browsers/); [XRDoctors 2026](https://xrdoctors.pro/blog/webxr-on-ios-what-actually-works)
- There is a "WebXR Augmented Reality Module" feature flag in Safari settings, but immersive-ar "is not in a testable state" and the flag is non-functional on visionOS/iOS — [Apple Developer Forums](https://developer.apple.com/forums/thread/756850)
- The WebXR Depth Sensing Module shows no Safari support. Even visionOS Safari lacks plane detection, depth sensing and mesh detection — [W3C Depth Sensing spec](https://immersive-web.github.io/depth-sensing/); [VNTANA support guide](https://www.vntana.com/resource/web-ar-xr-and-web-3d-viewer-support-guide/)
- Because WebKit is the only engine allowed on iOS, no third-party browser can add WebXR there. What works on iOS in 2026 is 8th Wall-style SLAM in JS, AR Quick Look/USDZ, model-viewer, and App Clip launchers — [XRDoctors](https://xrdoctors.pro/blog/webxr-on-ios-what-actually-works)
- Object Capture (RealityKit PhotogrammetrySession) is a native API that takes HEIC/JPEG/PNG photos and runs on device — [RealityKit 911](https://medium.com/geekculture/realitykit-911-photogrammetry-77659381af50); [WWDC21 session](https://developer.apple.com/videos/play/wwdc2021/10076/?time=416)

### Inferences
- Options for "capture inside our product":
  - (a) **Hand-off**: a native scanning app exports GLB, which is imported into the web app. This is the lowest effort.
  - (b) **A tiny native companion app or App Clip** (Swift + ARKit scene reconstruction or Object Capture) that uploads a GLB to the web app. This is the highest fidelity but means App Store work.
  - (c) **Browser photo capture**: getUserMedia frames sent to a server-side photogrammetry or HMR pipeline. Without LiDAR or a marker there is no metric scale.
- Browser photogrammetry from getUserMedia is technically possible (capture N frames, then reconstruct server-side with COLMAP/OpenMVS/Gaussian splatting). But a moving human and no metric scale make it worse than option (a). No production web-only human scanner on iPad Safari was found.

### Gaps
- The WebKit feature-status page was not fetched directly. Status is based on 2026 third-party guides and Apple forum posts.
- No information was found on whether iPadOS 26 changed any of this. Assume not.

## 3. Single- or few-photo 3D body estimation with commercial licences

### Takeaway
**Anny (NAVER)** is the one commercially usable parametric body model: Apache-2.0 code plus CC0 MakeHuman assets. Its released HMR network, **Multi-HMR 2**, is under a **non-commercial** licence, so a commercial product must either train its own regressor (possibly on Anny-One) or fit Anny by optimisation to keypoints, silhouettes or measurements. MediaPipe Pose (BlazePose GHUM 3D) is Apache-2.0 and runs in the browser, but it gives 33 joints, not a body surface. Meta **Sapiens (v1) is CC-BY-NC**. **Sapiens2 (Apr 2026)** has a custom licence that seems to allow commercial use but bans "biometric processing" and surveillance, so it needs legal review. Photo-only body circumference error is several cm, which is too coarse for true-size tattoos without a reference measurement.

### Cited Findings
**Anny**
- Anny code is Apache 2.0 (© 2025 NAVER Corp.). MakeHuman assets (via MPFB2) and Face Units are CC0 1.0. The "soma" topology is Apache 2.0 (from NVlabs SOMA-X). The **"smplx" topology is non-commercial only**. Releases: v0.1 (2025-11-05), v0.3 (2026-02-04) added smplx interop, v0.5 (2026-06-03) added SOMA rig/topology — [naver/anny README](https://github.com/naver/anny)
- Install caveat: `pip install anny[smpl,examples]` is the "Full install (non-free dependencies)". Even the "free install may download non-commercial only assets when needed". The default `anny` topology is a triangulated MakeHuman-derived mesh with 104 bones (163 for the full MakeHuman rig). It is written in PyTorch — [naver/anny README](https://github.com/naver/anny)
- Anny is controlled by phenotype parameters (gender, age, height, weight, etc.) calibrated to WHO statistics, covers infants to elderly, and is described as supporting "millimeter-accurate scan fitting" and HMR — [arXiv 2511.03589](https://arxiv.org/abs/2511.03589); [HF paper page](https://huggingface.co/papers/2511.03589)
- Multi-HMR with Anny reaches 41.8 mm PA-MPJPE on 3DPW (joint error, not surface/measurement error) — [emergentmind summary of arXiv 2511.03589](https://www.emergentmind.com/topics/anny-one-dataset)
- Anny-One is about 780K–800K synthetic images (22,951 scenes, multi-view, with camera parameters, segmentation and Anny pose/shape GT). It is described as enabling academic and commercial HMR research (dataset licence not directly verified) — [NAVER Anny-One page via search](https://europe.naverlabs.com/research/vision-foundation-models-for-human-understanding/anny-one/); [emergentmind](https://www.emergentmind.com/topics/anny-one-dataset)
- **Multi-HMR 2** (naver/multi-hmr2) does multi-person image/video to Anny meshes with camera parameters and exports .glb meshes and .pkl params. Its LICENSE.txt is non-commercial: "You may not use the Materials or derivatives thereof for any commercial purpose". This covers code and weights. No ONNX/web export is mentioned — [GitHub multi-hmr2](https://github.com/naver/multi-hmr2); [LICENSE.txt](https://raw.githubusercontent.com/naver/multi-hmr2/main/LICENSE.txt)
- A third-party blog ("A 3D Body Scan for Nine Cents — Without SMPL") describes a commercial body pipeline built on Anny. Its content could not be fetched — [clad.you](https://clad.you/blog/posts/body-pipeline/)

**MediaPipe / BlazePose GHUM**
- BlazePose GHUM 3D is Apache 2.0 and intended for single-person 3D pose on mobile, desktop and **in browser**. It gives 33 3D landmarks. 3D joint errors are 36 mm (Heavy), 39 mm (Full) and 45 mm (Lite). World coordinates come from GHUM fits to 2D points — [Model card PDF](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf); [MediaPipe Pose docs](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/pose.md)
- Note that GHUM itself (the shape model) is not released as a fittable model with BlazePose. The output is landmarks plus an optional segmentation mask, not a mesh — [MediaPipe Pose docs](https://chuoling.github.io/mediapipe/solutions/pose.html)

**Meta Sapiens**
- Sapiens (v1, 2024): 2D pose, 28-class body-part segmentation, depth and normals at 1024 px. Licence **CC-BY-NC-4.0** (non-commercial) — [HF facebook/sapiens](https://huggingface.co/facebook/sapiens); [GitHub](https://github.com/facebookresearch/sapiens)
- Sapiens2 (released 2026-04-24; matting added 2026-05-15) covers 308-keypoint pose, 29-part segmentation, normals, pointmaps and matting, at 0.1B–5B parameters. It is under the custom "Sapiens2 License", a "non-exclusive, worldwide, non-transferable and royalty-free limited license" with acceptable-use limits that bar surveillance, deepfakes, "biometric processing" and reverse engineering, and that require GDPR/CCPA compliance (read via an LLM summary of LICENSE.md, so verify the exact wording) — [GitHub sapiens2](https://github.com/facebookresearch/sapiens2); [LICENSE.md](https://raw.githubusercontent.com/facebookresearch/sapiens2/main/LICENSE.md)

**Photo-based measurement accuracy**
- 3D smartphone optical app vs tape on 6 circumferences: RMSEs of 9.2 and 3.9 cm, compared with 4.3 and 2.2 cm for a comparison method (snippet; exact pairing unclear) — [PMC11606355](https://pmc.ncbi.nlm.nih.gov/articles/PMC11606355)
- MeasureNet (front/side/back colour photos to CNN circumference prediction) was validated on 1,200 participants for waist-to-hip ratio and judged accurate and reliable (specific cm error not retrieved) — [npj Digital Medicine 2023](https://www.nature.com/articles/s41746-023-00909-5)

### Inferences
- **Commercial-safe stack**: MediaPipe Pose (Apache, in-browser) for 2D/3D keypoints plus MediaPipe segmentation silhouettes, then optimisation-fit Anny phenotype, local-change and pose parameters (Apache/CC0) to keypoints and silhouette. Use client-entered height and one or two tape circumferences (e.g. forearm and upper arm) to fix metric scale. Fitting would have to run server-side in PyTorch, or be ported (Anny is blendshapes plus linear blend skinning, so a JS/three.js port of the forward model is plausible because the app already uses morph targets).
- Avoid: SMPL/SMPL-X (and Anny's smplx topology), Multi-HMR 2 weights, Sapiens v1. Sapiens2 needs legal review because of the "biometric processing" clause.
- Expected accuracy of photo-only fitting is several cm on circumferences. Fine for a "looks right" preview, not for true size, unless anchored to real tape measurements. LiDAR scanning (Q1) is the only route found to about 1 cm.

### Gaps
- Whether naver/anny ships a public fitting/inversion tool ("Anny inverter") could not be confirmed. The README mentions no fitting script, and the arXiv paper (claims of mm scan fitting) could not be fetched.
- Anny-One dataset licence text was not verified directly.
- No published cm-accuracy for Anny fitted to 1–3 photos was found.
- No Apache/MIT image-to-body-shape regressor with commercial weights was found besides Anny-based work.

## 4. Live AR tattoo try-on in the web browser (iPad Safari)

### Takeaway
Live true-size AR in iPad Safari is not reliably achievable. Without WebXR there is no metric depth, and MediaPipe segmentation/pose in Safari runs on WebGL with known GPU-delegate bugs. Competitors such as Inkhunter keep designs stable by tracking a hand-drawn marker on the skin, with the user pinch-sizing the design manually, so they do not achieve calibrated true size either. A drawn or printed marker of known size would give scale.

### Cited Findings
- Inkhunter asks the user to draw a "Square Smile" (three-line smiley) where the tattoo will go. The camera tracks this marker to anchor the design, and size and rotation are then set with pinch and twist gestures. "No matter where you move your arm, the virtual tattoo will stay put" — [Gearbrain review](https://www.gearbrain.com/review-inkhunter-virtual-tattoo-parlor-2431877811.html); [MakeUseOf](https://www.makeuseof.com/augmented-reality-tattoo-app/); [Medium XR evaluation](https://medium.com/@pchang4/xr-evaluation-1-inkhunter-79d9ad8d808c)
- MediaPipe Web ImageSegmenter with the GPU delegate can abort when WebGL float/half-float mask post-processing is unavailable. Continuous segmentForVideo on the GPU delegate leaks GL handle tables (grows without bound), which degrades long sessions. CPU delegate does not leak — [mediapipe #6296](https://github.com/google-ai-edge/mediapipe/issues/6296); [mediapipe #6352](https://github.com/google-ai-edge/mediapipe/issues/6352)
- There is a Chrome vs Safari gap for MediaPipe on the web: WebGL remains the backend for Safari users, with WebGPU paths mainly on Chrome (vendor article) — [Fora Soft](https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/mediapipe-selfie-segmentation-webgpu-background-blur)
- MediaPipe Pose is intended to run in browser (Apache 2.0), with 33 landmarks — [Model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf)

### Inferences
- A feasible web AR mode would combine:
  - MediaPipe Pose/Hand landmarks (elbow-wrist or knee-ankle axis) to orient a cylinder proxy for the limb.
  - A segmentation mask for occlusion.
  - A printed or drawn marker of known size (e.g. a 3 cm square or ArUco on a temporary sticker), tracked in JS (e.g. js-aruco/AR.js-style), for scale and stability.
  
  Body-landmark-only anchoring will jitter and slide, because landmark noise is tens of mm (36–45 mm joint error).
- Given the egress results above, a "freeze-frame" approach is likely more robust than live AR on iPad: take a photo, fit a limb proxy or Anny mesh, then wrap the design and composite it. This matches the existing "Client photo mode" in this project.

### Gaps
- No measured frame rates for MediaPipe pose/segmentation in iPad Safari 26 were found.
- No evidence was found of any web (non-native) tattoo try-on that achieves true size.
- Other competitors' tracking methods beyond Inkhunter (e.g. Tattoodo AR, Inkjin) were not researched in depth.

## 5. Studio workflow, privacy and consent

### Takeaway
Body scans and photos of semi-nude clients are sensitive personal data. Under GDPR, if they are used or stored in a way that can identify a person (biometric templates), they are Article 9 special-category data needing explicit consent, a DPIA and strict retention and security. Practically: scan only the body part being tattooed, avoid the face, process and store locally on the studio iPad by default, auto-delete after the appointment unless the client opts in, and get written consent.

### Cited Findings
- 3D body scanning generally involves biometric data, a GDPR special category, and so requires the explicit consent of the user. Storing and sharing face further restrictions — [DLA Piper](https://www.dlapiper.com/en/insights/publications/2018/11/law-a-la-mode-27th-edition-november-2018/123d-body-scanning)
- Article 9 applies once body-measurement templates or feature vectors are stored to recognise an individual over time. Explicit, specific, informed, revocable consent is needed, along with DPIAs for high-risk processing and records of processing — [Style3D blog](https://www.style3d.com/blog/gdpr-biometric-compliance-for-global-fitting-portals/); [IAPP](https://iapp.org/news/a/processing-biometric-data-be-careful-under-the-gdpr); [GDPR Local](https://gdprlocal.com/biometric-data-gdpr-compliance-made-simple/)
- Sapiens2's licence itself bars "biometric processing" and requires GDPR/CCPA compliance, which is relevant if Meta models are used — [Sapiens2 LICENSE.md](https://raw.githubusercontent.com/facebookresearch/sapiens2/main/LICENSE.md)
- Polycam's free tier shares models only via public links, a privacy risk for client scans if staff use the free tier — [SkyeBrowse](https://www.skyebrowse.com/news/posts/polycam-review)
- Scaniverse and KIRI advertise on-device processing (Scaniverse) and unlimited local exports (KIRI). Whether cloud upload is mandatory differs by app and mode (KIRI photo scans are cloud-processed per its marketing) — [App Store Scaniverse](https://apps.apple.com/us/app/scaniverse-3d-scanner/id1541433223); [Digital Production](https://digitalproduction.com/2025/09/13/faster-wider-cleaner-kiri-engine-4-0-drops-mobile-scan-limits/)
- A LiDAR limb scan takes about 1 minute (64 ± 15 s in the lymphedema study; under 1 min in the athlete study). That fits within a consultation slot (snippets) — [Biosensors 2025](https://doi.org/10.3390/bios15060381); [Sports 2024](https://doi.org/10.3390/sports12040092)

### Inferences
- **Recommended studio workflow:**
  1. Written consent form (purpose, retention, deletion right).
  2. Client seated, limb braced, skin exposed only where needed (sleeve, calf, back with a towel or gown).
  3. LiDAR scan on an on-device app (Scaniverse or 3d Scanner App).
  4. AirDrop or Files the GLB into the web app, which keeps it in IndexedDB on the iPad rather than a server.
  5. Tape-measure one or two circumferences to verify scale.
  6. Delete after the session unless the client consents to retention.
- Avoid cloud-processing apps and public share links (Polycam free) for nude or semi-nude scans. Crop or avoid faces to reduce biometric identifiability. US states with biometric laws (e.g. Illinois BIPA, which covers face geometry) may apply if faces are captured. BIPA was not researched directly here.

### Gaps
- BIPA/CCPA specifics for body (non-face) scans and tattoo-studio-specific legal guidance were not researched.
- App-level privacy policies (Polycam, Niantic Scaniverse, KIRI cloud) were not read in full.
- No industry guidance on scanning nude or semi-nude clients in tattoo studios was found.
