# Tattoo Preview (3D)

A browser app for tattoo consultations: put a design on a to-scale 3D body, wrap it around arms
and legs without stretching, size it in inches, and show the client from any angle. Everything runs
in the browser; designs never leave the device.

**Status: Phase 1 (MVP) is done.** Read the [Phase 1 report](docs/phase1/REPORT.md) and the
[Phase 0 report](docs/phase0/REPORT.md) (which wrapping method works, with measurements).
The full spec is in [docs/spec.md](docs/spec.md).

## Try it

```bash
npm install
npm run dev          # http://localhost:5173
```

1. **Body**: male or female, the client's height in feet and inches, build, muscle, and under
   **Body shape**: belly, bust, bust lift, hips, buttocks, thighs, thigh gap, upper arms and calves.
   Skin tone follows the dermatology skin-colour scale (very light to very dark) with a cool/warm
   undertone, or pick any custom colour. Shapes come from the Anny body model, so a taller client
   really is taller, not just scaled.
2. **Import design**: PNG, JPG, WEBP, SVG, PDF or Illustrator `.ai` (or drop a file anywhere on the
   page). Multi-page PDFs and multi-artboard `.ai` files let you pick a page. The background is
   removed automatically, with a before/after preview and controls; **Download PNG** saves the
   cleaned-up design.
3. **Place it**: tap the body, then drag the design to move it (mouse or finger). **Auto** follows
   the skin anywhere and wraps around a limb for wide designs; tick **Full band** for a band that
   closes all the way round.
4. **Resize and rotate on the body**: tap the design to show its box. Drag a corner to resize
   (keeps proportions), a side dot to stretch one side, the round knob to rotate (Shift snaps to
   15°). **Delete** or **Backspace** (or the bin button on iPad) removes the design; **Undo** or
   Ctrl/⌘+Z brings it back; Escape or tapping off the body hides the box. Sliders in the panel
   show the exact size in inches and centimetres.
5. **iPad and Apple Pencil**: with fingers only, drag the design with one finger and pinch or twist
   it with two to resize and rotate; drag off the design to turn the view. The first Pencil touch
   switches on **Apple Pencil mode** (as in Procreate): the Pencil places, moves and resizes the
   design (touching bare skin brings the design to the tip), and fingers only turn and zoom the
   view, so a resting palm can't knock the design around. Toggle it in the panel under View.
6. **Ink look**: Fresh (just done), Healed (default) or Aged 10+ years, to show how fine lines and
   small lettering will hold up. **Studio light** or **Shop light** under View.
7. **Save images**: 3000 px PNGs of this view, front, back or a close-up. On iPad this opens the
   share sheet.

The **1-inch grid** design is still there for checking accuracy, and **Method (advanced)** at the
bottom of the panel shows the live distortion numbers and lets you force a method.

## Put it on a website

`npm run build` makes a static `dist/` folder (about 11 MB: the app, the PDF reader, and two
3.8 MB body models; hosts serve them compressed).
It uses relative paths, so it works anywhere:

| Where | How |
|---|---|
| **GitHub Pages** | Already set up. In the repo: Settings → Pages → Source: **GitHub Actions**. Every push to `main` publishes to `https://<user>.github.io/<repo>/`. |
| **Your existing site** | Copy `dist/` into a folder, e.g. `yoursite.com/preview/`. No server code or rewrites needed. |
| **Netlify / Vercel / Cloudflare Pages** | Build command `npm run build`, output folder `dist`. |
| **Hosts that refuse `.glb` files** | `VITE_MODELS_AS_TEXT=1 npm run build && node scripts/strict-host.mjs` ships the bodies as base64 text and escapes control characters in scripts. |
| **Embed in a page** | `<iframe src="https://yoursite.com/preview/" style="width:100%;height:80vh;border:0" allow="clipboard-write"></iframe>` |

Needs a browser with WebGL 2 (Safari 15+, Chrome, Edge, Firefox; iPad works).

## Troubleshooting

- **Debug panel**: the "Debug" button at the bottom left (or press **D**). Shows FPS, GPU,
  load and compute timings, and every error the page caught.
- **Copy debug report**: one JSON blob with the version, a share link, your settings, the
  distortion numbers, timings, GPU, browser and errors. Paste it into an issue or message.
- **Share links**: the URL always holds the current settings (body, method, size, placement...),
  so copying the address bar reproduces exactly what you see. Uploaded images are not included.
- `ui=false` in the link hides the controls (for clean screenshots); press D for the debug panel.
- Browser console: `tattoo.get()` returns the full state; `tattoo.set({ widthIn: 5 })` changes it.

## Develop

```bash
npm test                           # unit tests (wrap math, body shape, import, background removal...)
npm run measure                    # distortion study on the real bodies → docs/phase1/metrics.md
npm run build && node scripts/e2e.mjs  # end-to-end checks in headless Chromium
npm run build && npm run screenshots   # headless renders → docs/phase1/*.png
node scripts/check-licenses.mjs    # fails on any non MIT/Apache/BSD/ISC/CC0 dependency
```

Regenerate the bodies (needs Python 3.11, PyTorch, `pip install anny scipy`). This also bakes the
18 body-shape corners and straightens the elbows:

```bash
python tools/export_bodies.py --out public/models
```

Docs: [plan](docs/plan.md) · [decisions](docs/decisions.md) · [licenses](docs/licenses.md) ·
[regions](docs/regions.md).

## Credits

Body models generated with [Anny](https://github.com/naver/anny) by NAVER LABS Europe (Apache 2.0),
built on [MakeHuman](https://static.makehumancommunity.org/) assets (CC0). Exponential map decals
after Schmidt, Grimm and Wyvill, "Interactive Decal Compositing with Discrete Exponential Maps",
SIGGRAPH 2006.
