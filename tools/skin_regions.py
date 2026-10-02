"""Regional skin detail for the exported bodies: eyes, natural colour variation and eyebrows.

Everything here is CC0 (MPFB2 masks that ship with Anny) or computed from the mesh, and is
exported as data the app's skin shader reads:

* ``_EYE`` (vertex, vec3): for the visible front of each eyeball, the direction from the eyeball's
  centre projected on the face plane (x, y; the iris is a disc around 0) and a flag (z = 1).
* ``_REGION`` (vertex, vec4): x = palm / sole (lighter, less pigmented skin), y = redder skin over
  knees, elbows and knuckles, z = head (tells eyebrow hair from nails in the texture), w = 0.
* ``<body>.regions.png`` (UV texture, RGB): R = redness (lips, ears, eyelids, a little over the
  face), G = pigment (areolae, genitals, lips), B = keratin (fingernails and toenails on the hand
  and foot islands, eyebrow hair painted on the head island).
"""

from pathlib import Path

import numpy as np
import PIL.Image

TEX = 2048  # the MPFB masks are 2048 x 2048 in the MakeHuman UV layout


def _mask(name):
    import anny

    path = Path(anny.__file__).parent / "data" / "mpfb2" / "textures" / f"mpfb_{name}.jpg"
    img = PIL.Image.open(path).convert("L")
    if img.size != (TEX, TEX):
        img = img.resize((TEX, TEX), PIL.Image.BILINEAR)
    return np.asarray(img).astype(np.float32) / 255.0


def eye_centres(verts, faces, seg):
    """Least-squares sphere fit to each eyeball front: {side: (centre, radius)}."""
    out = {}
    for side in "LR":
        v = np.unique(faces[seg == f"eye_front.{side}"].reshape(-1))
        P = verts[v]
        A = np.c_[2 * P, np.ones(len(P))]
        c, *_ = np.linalg.lstsq(A, (P ** 2).sum(1), rcond=None)
        out[side] = (c[:3], float(np.sqrt(c[3] + c[:3] @ c[:3])))
    return out


def eye_attribute(verts, faces, seg, eyes):
    """Per welded vertex: (x, y, 1) on the eyeball fronts, 0 elsewhere."""
    att = np.zeros((len(verts), 3))
    for side, (c, _) in eyes.items():
        v = np.unique(faces[seg == f"eye_front.{side}"].reshape(-1))
        d = verts[v] - c
        d /= np.linalg.norm(d, axis=1, keepdims=True)
        att[v] = np.c_[d[:, 0], d[:, 1], np.ones(len(v))]
    return att


def _smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def region_attribute(labels, heads, verts, normals, dominant, head_mask):
    """Per welded vertex vec4: palm/sole, joint redness, head, 0."""
    li = {n: i for i, n in enumerate(labels)}
    name = np.array(labels)[dominant]
    out = np.zeros((len(verts), 4))
    hand = np.array([n.startswith(("wrist", "finger", "metacarpal")) for n in name])
    foot = np.array([n.startswith(("foot", "toe")) for n in name])
    knuckles = np.zeros(len(verts))
    for side, sign in (("L", 1.0), ("R", -1.0)):
        on = np.array([n.endswith("." + side) for n in name])
        w = heads[li[f"wrist.{side}"]]
        along = heads[li[f"finger3-1.{side}"]] - w
        across = heads[li[f"finger2-1.{side}"]] - heads[li[f"finger5-1.{side}"]]
        palm = np.cross(along, across) * sign
        palm /= np.linalg.norm(palm)
        sel = hand & on
        out[sel, 0] = _smooth(0.05, 0.55, normals[sel] @ palm)
        # Knuckles: the back of the hand around the finger bases.
        for f in range(2, 6):
            d = np.linalg.norm(verts - heads[li[f"finger{f}-1.{side}"]], axis=1)
            knuckles = np.maximum(knuckles, sel * _smooth(0.014, 0.006, d) * _smooth(0.1, 0.5, -(normals @ palm)))
        print(f"    palm {side} faces {np.round(palm, 2)}")
    out[foot, 0] = _smooth(-0.35, -0.75, normals[foot, 1])  # soles face down
    red = np.zeros(len(verts))
    fwd = np.array([0.0, 0.0, 1.0])
    for side in "LR":
        # Knee caps (front) and elbow points (back).
        d = np.linalg.norm(verts - heads[li[f"lowerleg01.{side}"]], axis=1)
        red = np.maximum(red, np.exp(-((d / 0.055) ** 2)) * _smooth(0.2, 0.7, normals @ fwd))
        d = np.linalg.norm(verts - heads[li[f"lowerarm01.{side}"]], axis=1)
        red = np.maximum(red, np.exp(-((d / 0.04) ** 2)) * _smooth(0.2, 0.7, -(normals @ fwd)))
    out[:, 1] = np.maximum(red, 0.8 * knuckles)
    out[:, 2] = head_mask
    return out


def _value_noise(x, y, seed=0):
    """2-D value noise in [0, 1] on integer-spaced lattice coordinates (numpy arrays)."""
    xi, yi = np.floor(x), np.floor(y)
    fx, fy = x - xi, y - yi

    def h(i, j):
        n = np.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453
        return n - np.floor(n)

    ux, uy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = h(xi, yi), h(xi + 1, yi), h(xi, yi + 1), h(xi + 1, yi + 1)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy


def brow_density(p, eyes, female):
    """Eyebrow hair density (0..1) at 3-D points p (n x 3), from each eye's centre (millimetres)."""
    out = np.zeros(len(p))
    for side, (c, _) in eyes.items():
        s = 1.0 if side == "L" else -1.0  # +x is the body's left
        x = s * (p[:, 0] - c[0]) * 1000  # lateral, mm
        y = (p[:, 1] - c[1]) * 1000  # up, mm
        front = _smooth(-6, 2, (p[:, 2] - c[2]) * 1000)
        x0, x1 = -15.0, 25.0
        t = (x - x0) / (x1 - x0)
        lift = 1.5 if female else 0.0
        yc = 18.5 + lift * _smooth(0.2, 0.7, t) + 5.0 * _smooth(0.0, 0.62, t) - 4.0 * _smooth(0.62, 1.0, t)
        half = (np.interp(t, [0, 0.35, 1], [3.6, 3.0, 0.9]) if female else np.interp(t, [0, 0.35, 1], [5.2, 4.2, 1.4]))
        band = _smooth(half + 0.6, half - 1.2, np.abs(y - yc))
        ends = _smooth(-0.04, 0.12, t) * _smooth(1.02, 0.88, t)
        # Hairs: medial ones point up, the rest sweep out and slightly up. Streaky noise along them.
        ang = np.radians(np.interp(t, [0, 0.3, 1], [72, 30, 8]))
        u = x * np.cos(ang) + y * np.sin(ang)
        v = -x * np.sin(ang) + y * np.cos(ang)
        hair = _value_noise(u / 2.2, v / 0.28, seed=1 if side == "L" else 2)
        fine = _value_noise(u / 0.9, v / 0.16, seed=3)
        strands = np.clip(1.3 * (0.55 * hair + 0.45 * fine) - 0.15, 0, 1)
        out = np.maximum(out, band * ends * front * (0.35 + 0.65 * strands))
    return np.clip(out, 0, 1)


def paint_brows(img_b, tri_uv, tri_pos, eyes, female):
    """Rasterise head triangles near the brows into the texture, writing brow density (max)."""
    for uv, pos in zip(tri_uv, tri_pos):
        px = uv * TEX - 0.5  # texel centres
        lo = np.floor(px.min(0)).astype(int)
        hi = np.ceil(px.max(0)).astype(int)
        lo, hi = np.clip(lo, 0, TEX - 1), np.clip(hi, 0, TEX - 1)
        xs, ys = np.meshgrid(np.arange(lo[0], hi[0] + 1), np.arange(lo[1], hi[1] + 1))
        q = np.stack([xs.ravel(), ys.ravel()], 1).astype(np.float64)
        a, b, c = px
        m = np.array([b - a, c - a]).T
        if abs(np.linalg.det(m)) < 1e-12:
            continue
        l12 = np.linalg.solve(m, (q - a).T).T
        bary = np.c_[1 - l12.sum(1), l12]
        inside = (bary >= -0.02).all(1)
        if not inside.any():
            continue
        q, bary = q[inside].astype(int), bary[inside]
        d = brow_density(bary @ pos, eyes, female)
        img_b[q[:, 1], q[:, 0]] = np.maximum(img_b[q[:, 1], q[:, 0]], d)


def regions_texture(path, split_uv, split_pos, tris, split_seg_head, eyes, female):
    """
    Write the RGB region texture. split_uv are glTF UVs (origin top-left, so v = image row),
    tris index split vertices, split_seg_head marks triangles of the head.
    """
    lips, ears, eyelids, face = _mask("lips"), _mask("ears"), _mask("eyelids"), _mask("face")
    areolae, genitals, crotch = _mask("aureolae"), _mask("genitals"), _mask("crotch")
    nails = np.maximum(_mask("fingernails"), _mask("toenails"))
    red = np.clip(lips + 0.55 * ears + 0.5 * eyelids + 0.3 * face, 0, 1)
    pig = np.clip(areolae + 0.8 * genitals + 0.35 * crotch + 0.25 * lips, 0, 1)
    kera = nails.copy()
    # Only head triangles near the eyes can hold brow hair.
    head_tris = tris[split_seg_head]
    centre = np.mean([c for c, _ in eyes.values()], axis=0)
    near = np.linalg.norm(split_pos[head_tris].mean(1) - centre, axis=1) < 0.075
    head_tris = head_tris[near]
    paint_brows(kera, split_uv[head_tris], split_pos[head_tris], eyes, female)
    rgb = np.stack([red, pig, kera], -1)
    PIL.Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).save(path, optimize=True)
    return {"brow_texels": int((kera > 0.2).sum())}
