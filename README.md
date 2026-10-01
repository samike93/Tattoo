# Tattoo Preview (3D)

A browser app for tattoo consultations: put a design on a to-scale 3D body, wrap it around arms
and legs without stretching, size it in inches, and show the client from any angle. Everything runs
in the browser; designs never leave the device.

**Status: Phase 0 (technical spike) is done.** It answers "which wrapping method works?" with
measurements on real male and female bodies. Read the [Phase 0 report](docs/phase0/REPORT.md).
The full spec is in [docs/spec.md](docs/spec.md).

## Try it

```bash
npm install
npm run dev          # http://localhost:5173
```

On the test page:

- **Placement method**: Exponential map (recommended for patches), Cylindrical wrap (bands and
  sleeves), or three.js DecalGeometry (the flat baseline, for comparison).
- **Tap the body** to move the design. In Cylindrical mode, tapping a limb picks that limb.
- **Design**: the 1-inch checkerboard (cells are exactly 1 inch at any size, with an "F↑" so
  mirroring and rotation are obvious), or upload your own PNG/JPG/WEBP/SVG.
- **Distortion (live)** shows how true the current placement is: how much of the design is within
  5% of real size and square, and whether any of it is mirrored (bleeding through a limb).
- **Behind design** camera: look at the other side of the arm. That's where DecalGeometry fails.

## Put it on a website

`npm run build` makes a static `dist/` folder (about 3 MB: the app plus two 840 KB body models).
It uses relative paths, so it works anywhere:

| Where | How |
|---|---|
| **GitHub Pages** | Already set up. In the repo: Settings → Pages → Source: **GitHub Actions**. Every push to `main` publishes to `https://<user>.github.io/<repo>/`. |
| **Your existing site** | Copy `dist/` into a folder, e.g. `yoursite.com/preview/`. No server code or rewrites needed. |
| **Netlify / Vercel / Cloudflare Pages** | Build command `npm run build`, output folder `dist`. |
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
npm test                           # unit tests (wrap math, exponential map, distortion metric)
npm run measure                    # Phase 0 study on the real bodies → docs/phase0/metrics.md
npm run build && npm run screenshots   # headless renders → docs/phase0/*.png
node scripts/check-licenses.mjs    # fails on any non MIT/Apache/BSD/ISC/CC0 dependency
```

Regenerate the bodies (needs Python 3.11, PyTorch, `pip install anny`):

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
