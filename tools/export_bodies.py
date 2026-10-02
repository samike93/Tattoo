"""Export the male and female base bodies from Anny (Apache 2.0, MakeHuman CC0 assets) to GLB.

Usage:
    pip install anny trimesh pillow scipy   # plus torch
    python tools/export_bodies.py --out public/models

For each body this writes:
    <name>.glb            skin mesh, meters, +Y up, +Z facing forward, feet at y=0.
                          Attributes: POSITION, NORMAL, TEXCOORD_0,
                          _VID  (original welded vertex index, so the app can rebuild
                                 the connected surface across UV seams),
                          _BONE (index of the bone with the largest skin weight),
                          _EYE, _REGION (eyes and regional skin colour, see skin_regions.py).
                          18 morph targets: the corners of Anny's height x weight x muscle
                          anchor grid (2 x 3 x 3). Anny's mesh is exactly trilinear between
                          these corners, so the app reproduces any body shape in that range
                          (checked: < 1e-9 mm error) without shipping Anny itself.
    <name>.regions.png    regional skin colour and eyebrows in UV space (skin_regions.py).
    <name>.skeleton.json  bone labels, parents and joint (bone head) positions in the
                          same frame, plus joint positions for every morph corner. Used for
                          the cylindrical-wrap limb axes.

Non-skin geometry (eye backs, eye sockets, mouth cavity, tongue) is removed using
Anny's UV body-part segmentation.
"""

import argparse
import json
import struct
from pathlib import Path

import numpy as np
import PIL.Image
import torch
import trimesh
import yaml

import anny

import skin_regions

DROP_PARTS = {"eye_back.L", "eye_back.R", "eye_cavity.L", "eye_cavity.R", "mouth_cavity", "tongue"}

# Body-shape controls built from Anny's "local changes". Each control mixes a few Anny targets; at
# value s in [-1, 1] every target gets coefficient * s. Anny's local changes are exactly linear on
# each side of 0 and independent of height/weight/muscle (checked: 0.00 mm), so each control is
# stored as two sparse morph targets (s = +1 and s = -1) that the app adds on top of the corners.
LOCAL_CONTROLS = [
    ("belly", "Belly", {"stomach-pregnant-incr": 0.8, "measure-waist-circ-incr": 0.6}),
    ("bust", "Bust size", {"measure-bust-circ-incr": 1.0}),
    ("bustLift", "Bust lift", {"breast-trans-up": 1.0}),
    ("hips", "Hips", {"measure-hips-circ-incr": 0.7, "hip-scale-horiz-incr": 0.4}),
    ("buttocks", "Buttocks", {"buttocks-volume-incr": 1.0}),
    ("thighs", "Thighs", {"l-upperleg-fat-incr": 1.0, "r-upperleg-fat-incr": 1.0, "measure-thigh-circ-incr": 0.4}),
    # Anny has no thigh-gap target. Wider pelvis + slightly narrower thighs + legs angled out opens
    # the gap at mid-thigh from 5.4 to 8.1 cm (average female); -1 closes it to 3.9 cm, and even the
    # heaviest body at -1 keeps the thighs apart (2.0 cm at the top).
    ("thighGap", "Thigh gap", {"hip-scale-horiz-incr": 0.8, "l-upperleg-scale-horiz-incr": -0.6, "r-upperleg-scale-horiz-incr": -0.6,
                               "l-leg-valgus-incr": -0.6, "r-leg-valgus-incr": -0.6}),
    ("upperArms", "Upper arms", {"l-upperarm-fat-incr": 1.0, "r-upperarm-fat-incr": 1.0}),
    ("calves", "Calves", {"l-lowerleg-fat-incr": 1.0, "r-lowerleg-fat-incr": 1.0}),
]

# Anny's anchor grid for the shape phenotypes we expose (see PHENOTYPE_VARIATIONS in anny).
SHAPE_GRID = {"height": [0.0, 1.0], "weight": [0.0, 0.5, 1.0], "muscle": [0.0, 0.5, 1.0]}

BODIES = {
    # Anny phenotypes are in [0, 1]. gender: 0 = male, 1 = female.
    # age anchors: newborn -1/3, baby 0, child 1/3, young 2/3, old 1. 0.72 is a young adult.
    "male": dict(gender=0.0, age=0.72, muscle=0.5, weight=0.5, height=0.5, proportions=0.5),
    "female": dict(gender=1.0, age=0.72, muscle=0.5, weight=0.5, height=0.5, proportions=0.5),
}


def face_segments(model):
    seg_dir = Path(anny.__file__).parent / "data" / "segmentation"
    img = np.asarray(PIL.Image.open(seg_dir / "body_parts_segmentation.png").convert("RGB"))
    colors = yaml.safe_load(open(seg_dir / "body_parts_segmentation.yaml"))["colors"]
    uv = model.texture_coordinates.cpu().numpy()
    fuv = uv[model.face_texture_coordinate_indices.cpu().numpy()].mean(axis=1)
    px = np.clip((fuv[:, 0] * img.shape[1]).astype(int), 0, img.shape[1] - 1)
    py = np.clip(((1 - fuv[:, 1]) * img.shape[0]).astype(int), 0, img.shape[0] - 1)
    rgb = img[py, px].astype(int)
    names = list(colors)
    palette = np.array([colors[n] for n in names])
    nearest = np.argmin(((rgb[:, None, :] - palette[None]) ** 2).sum(-1), axis=1)
    return np.array(names)[nearest]


def write_glb(path, attributes, indices, morph_targets=(), target_names=()):
    """
    Minimal glTF 2.0 binary writer (no extra dependency). Morph targets are POSITION deltas; a
    target touching fewer than half the vertices is stored as a sparse accessor (only moved vertices).
    """
    blobs, views, accessors, attr_map = [], [], [], {}
    offset = 0

    def add(arr, target, comp_type, type_, minmax=False):
        nonlocal offset
        data = arr.tobytes()
        pad = (4 - len(data) % 4) % 4
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(data), "target": target})
        acc = {"bufferView": len(views) - 1, "componentType": comp_type, "count": int(arr.shape[0]), "type": type_}
        if minmax:
            acc["min"] = arr.min(0).tolist()
            acc["max"] = arr.max(0).tolist()
        accessors.append(acc)
        blobs.append(data + b"\0" * pad)
        offset += len(data) + pad
        return len(accessors) - 1

    for name, arr in attributes.items():
        type_ = {1: "SCALAR", 2: "VEC2", 3: "VEC3", 4: "VEC4"}[1 if arr.ndim == 1 else arr.shape[1]]
        attr_map[name] = add(arr.astype(np.float32), 34962, 5126, type_, minmax=(name == "POSITION"))
    idx = add(indices.astype(np.uint32).reshape(-1), 34963, 5125, "SCALAR")
    def add_raw(arr):
        nonlocal offset
        data = arr.tobytes()
        pad = (4 - len(data) % 4) % 4
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(data)})
        blobs.append(data + b"\0" * pad)
        offset += len(data) + pad
        return len(views) - 1

    def add_target(t):
        t = t.astype(np.float32)
        moved = np.nonzero(np.abs(t).max(axis=1) > 0)[0]
        if len(moved) * 2 >= len(t) or len(moved) == 0:
            return add(t, 34962, 5126, "VEC3", minmax=True)
        accessors.append({
            "componentType": 5126, "count": int(len(t)), "type": "VEC3",
            "min": t.min(0).tolist(), "max": t.max(0).tolist(),
            "sparse": {
                "count": int(len(moved)),
                "indices": {"bufferView": add_raw(moved.astype(np.uint32)), "componentType": 5125},
                "values": {"bufferView": add_raw(np.ascontiguousarray(t[moved]))},
            },
        })
        return len(accessors) - 1

    targets = [{"POSITION": add_target(t)} for t in morph_targets]
    primitive = {"attributes": attr_map, "indices": idx, "material": 0}
    mesh = {"name": "skin", "primitives": [primitive]}
    if targets:
        primitive["targets"] = targets
        mesh["weights"] = [0.0] * len(targets)
        mesh["extras"] = {"targetNames": list(target_names)}

    gltf = {
        "asset": {"version": "2.0", "generator": "tattoo/tools/export_bodies.py (Anny)"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "body"}],
        "meshes": [mesh],
        "materials": [{"name": "skin", "pbrMetallicRoughness": {"baseColorFactor": [0.8, 0.62, 0.52, 1], "metallicFactor": 0, "roughnessFactor": 0.6}}],
        "buffers": [{"byteLength": offset}],
        "bufferViews": views,
        "accessors": accessors,
    }
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    bin_ = b"".join(blobs)
    total = 12 + 8 + len(js) + 8 + len(bin_)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(js), b"JSON") + js)
        f.write(struct.pack("<I4s", len(bin_), b"BIN\0") + bin_)


def to_gltf_frame(p):
    # Anny: +Z up, -Y forward. glTF: +Y up, +Z forward.
    return np.stack([p[..., 0], p[..., 2], -p[..., 1]], axis=-1)


# Anny's rest pose bends the elbows ~44 degrees, which folds the inner-elbow skin into a crease
# (designs across it measured 15-30% true to size). Consults are done with the arm straight, so
# we straighten the elbows, keeping a natural few degrees of bend.
ELBOW_KEEP_DEG = 5.0


def rodrigues(axis, angle):
    k = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
    return np.eye(3) + np.sin(angle) * k + (1 - np.cos(angle)) * (k @ k)


def elbow_rotations(model, heads):
    """World rotation per arm that straightens the elbow (computed once, on the base shape)."""
    labels = model.bone_labels
    rots = {}
    for side in "LR":
        sh, el, wr = (heads[labels.index(f"{b}.{side}")] for b in ("upperarm01", "lowerarm01", "wrist"))
        u = (el - sh) / np.linalg.norm(el - sh)
        f = (wr - el) / np.linalg.norm(wr - el)
        angle = np.arccos(np.clip(u @ f, -1, 1)) - np.radians(ELBOW_KEEP_DEG)
        axis = np.cross(f, u)
        rots[side] = rodrigues(axis / np.linalg.norm(axis), angle)
    return rots


def descendants(model, root):
    parents = list(model.bone_parents)
    out = {root}
    changed = True
    while changed:
        changed = False
        for i, p in enumerate(parents):
            if p in out and i not in out:
                out.add(i)
                changed = True
    return sorted(out)


def straighten_elbows(model, verts, heads, rots):
    """
    Linear blend skinning of a fixed world rotation about each elbow joint. Same deformation Anny's
    own posing applies, but done on the rest shape so the result stays exactly trilinear in the
    shape parameters (Anny's posing re-centres on the root, which adds ~3 mm of blend error).
    """
    labels = model.bone_labels
    bi = model.vertex_bone_indices.cpu().numpy()
    bw = model.vertex_bone_weights.cpu().numpy()
    verts, heads = verts.copy(), heads.copy()
    for side, R in rots.items():
        elbow = heads[labels.index(f"lowerarm01.{side}")].copy()
        chain = descendants(model, labels.index(f"lowerarm01.{side}"))
        w = (np.isin(bi, chain) * bw).sum(axis=1)[:, None]
        rotated = (verts - elbow) @ R.T + elbow
        verts = verts + w * (rotated - verts)
        heads[chain] = (heads[chain] - elbow) @ R.T + elbow
    return verts, heads


def shape(model, phenotype, rots=None, local=None):
    """Vertices and joints for a phenotype, glTF frame, elbows straightened, feet on y = 0."""
    out = model(phenotype_kwargs=phenotype, local_changes_kwargs=local)
    verts = out["rest_vertices"][0].detach().cpu().numpy().astype(np.float64)
    heads = out["rest_bone_heads"][0].detach().cpu().numpy().astype(np.float64)
    rots = rots if rots is not None else elbow_rotations(model, heads)
    verts, heads = straighten_elbows(model, verts, heads, rots)
    verts, heads = to_gltf_frame(verts), to_gltf_frame(heads)
    if local is not None:
        return verts, heads, rots  # deltas are taken against the unfloored base below
    floor = verts[:, 1].min()
    verts[:, 1] -= floor
    heads[:, 1] -= floor
    return verts, heads, rots


def export(model, name, phenotype, out_dir):
    verts, heads, rots = shape(model, phenotype)

    faces = model.faces.cpu().numpy()
    fuv = model.face_texture_coordinate_indices.cpu().numpy()
    seg = face_segments(model)
    keep = ~np.isin(seg, list(DROP_PARTS))
    faces, fuv, seg = faces[keep], fuv[keep], seg[keep]

    # Smooth normals on the welded mesh, so UV seams do not show as shading creases.
    welded = trimesh.Trimesh(verts, faces, process=False)
    normals = np.asarray(welded.vertex_normals)

    # Split vertices where a welded vertex has several UVs.
    pairs = np.stack([faces.reshape(-1), fuv.reshape(-1)], axis=1)
    uniq, inverse = np.unique(pairs, axis=0, return_inverse=True)
    vid, tid = uniq[:, 0], uniq[:, 1]
    uv = model.texture_coordinates.cpu().numpy()[tid].copy()
    uv[:, 1] = 1.0 - uv[:, 1]  # glTF UV origin is top-left

    bone_w = model.vertex_bone_weights.cpu().numpy()
    bone_i = model.vertex_bone_indices.cpu().numpy()
    dominant = bone_i[np.arange(len(bone_i)), bone_w.argmax(1)]

    # Eyes, regional skin colour and eyebrows (see skin_regions.py).
    eyes = skin_regions.eye_centres(verts, faces, seg)
    eye_att = skin_regions.eye_attribute(verts, faces, seg, eyes)
    head_mask = np.zeros(len(verts))
    head_mask[np.unique(faces[seg == "head"].reshape(-1))] = 1.0
    region_att = skin_regions.region_attribute(list(model.bone_labels), heads, verts, normals, dominant, head_mask)
    tris = inverse.reshape(-1, 3)
    info = skin_regions.regions_texture(out_dir / f"{name}.regions.png", uv, verts[vid], tris, seg == "head", eyes,
                                        female=phenotype["gender"] > 0.5)
    print(f"  eyes r = {eyes['L'][1] * 1000:.1f} mm, brow texels {info['brow_texels']}")

    corners, targets, names = [], [], []
    for h in SHAPE_GRID["height"]:
        for w in SHAPE_GRID["weight"]:
            for m in SHAPE_GRID["muscle"]:
                cv, ch, _ = shape(model, {**phenotype, "height": h, "weight": w, "muscle": m}, rots)
                targets.append((cv - verts)[vid])
                names.append(f"height={h},weight={w},muscle={m}")
                corners.append({"height": h, "weight": w, "muscle": m, "height_m": float(cv[:, 1].max()),
                                "heads": ch.round(5).tolist()})

    # Local body-shape controls: deltas at s = +1 and s = -1 against the base shape (same frame,
    # before the floor shift, which the app redoes after blending).
    base_raw, base_heads_raw, _ = shape(model, phenotype, rots, local={})
    local_meta = []
    for cid, label, mix in LOCAL_CONTROLS:
        entry = {"id": cid, "label": label, "mix": mix}
        for sign, key in ((1.0, "plus"), (-1.0, "minus")):
            lv, lh, _ = shape(model, phenotype, rots, local={k: c * sign for k, c in mix.items()})
            targets.append((lv - base_raw)[vid])
            names.append(f"local:{cid}:{key}")
            entry[key] = {"target": len(targets) - 1, "heads": (lh - base_heads_raw).round(6).tolist(),
                          "max_mm": float(np.abs(lv - base_raw).max() * 1000)}
        local_meta.append(entry)
        print(f"  {cid}: +{entry['plus']['max_mm']:.0f} mm / -{entry['minus']['max_mm']:.0f} mm")

    write_glb(
        out_dir / f"{name}.glb",
        {
            "POSITION": verts[vid],
            "NORMAL": normals[vid],
            "TEXCOORD_0": uv,
            "_VID": vid.astype(np.float32),
            "_BONE": dominant[vid].astype(np.float32),
            "_EYE": eye_att[vid],
            "_REGION": region_att[vid],
        },
        inverse.reshape(-1, 3),
        targets,
        names,
    )
    skeleton = {
        "source": "Anny (NAVER LABS Europe, Apache-2.0) with MakeHuman/MPFB2 CC0 assets",
        "phenotype": phenotype,
        "units": "meters",
        "pose": f"Anny rest pose (A-pose) with elbows straightened to {ELBOW_KEEP_DEG:g} degrees of bend",
        "height_m": float(verts[:, 1].max()),
        "bones": [
            {"name": n, "parent": int(p), "head": heads[i].round(5).tolist()}
            for i, (n, p) in enumerate(zip(model.bone_labels, model.bone_parents))
        ],
        "shapes": {"grid": SHAPE_GRID, "base": {k: phenotype[k] for k in SHAPE_GRID}, "corners": corners, "local": local_meta},
    }
    (out_dir / f"{name}.skeleton.json").write_text(json.dumps(skeleton, indent=1))
    print(f"{name}: {len(vid)} vertices, {len(faces)} faces, height {skeleton['height_m']:.3f} m")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="public/models")
    args = ap.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    model = anny.Anny(local_changes="default").to(dtype=torch.float64)
    for name, ph in BODIES.items():
        export(model, name, ph, out_dir)


if __name__ == "__main__":
    main()
