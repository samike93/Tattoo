"""Export the male and female base bodies from Anny (Apache 2.0, MakeHuman CC0 assets) to GLB.

Usage:
    pip install anny trimesh pillow   # plus torch
    python tools/export_bodies.py --out public/models

For each body this writes:
    <name>.glb            skin mesh, meters, +Y up, +Z facing forward, feet at y=0.
                          Attributes: POSITION, NORMAL, TEXCOORD_0,
                          _VID  (original welded vertex index, so the app can rebuild
                                 the connected surface across UV seams),
                          _BONE (index of the bone with the largest skin weight).
    <name>.skeleton.json  bone labels, parents and joint (bone head) positions in the
                          same frame. Used for the cylindrical-wrap limb axes.

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

DROP_PARTS = {"eye_back.L", "eye_back.R", "eye_cavity.L", "eye_cavity.R", "mouth_cavity", "tongue"}

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


def write_glb(path, attributes, indices):
    """Minimal glTF 2.0 binary writer (no extra dependency)."""
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
        type_ = {1: "SCALAR", 2: "VEC2", 3: "VEC3"}[1 if arr.ndim == 1 else arr.shape[1]]
        attr_map[name] = add(arr.astype(np.float32), 34962, 5126, type_, minmax=(name == "POSITION"))
    idx = add(indices.astype(np.uint32).reshape(-1), 34963, 5125, "SCALAR")

    gltf = {
        "asset": {"version": "2.0", "generator": "tattoo/tools/export_bodies.py (Anny)"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "body"}],
        "meshes": [{"name": "skin", "primitives": [{"attributes": attr_map, "indices": idx, "material": 0}]}],
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


def export(model, name, phenotype, out_dir):
    out = model(phenotype_kwargs=phenotype)
    verts = to_gltf_frame(out["rest_vertices"][0].detach().cpu().numpy())
    heads = to_gltf_frame(out["rest_bone_heads"][0].detach().cpu().numpy())
    floor = verts[:, 1].min()
    verts[:, 1] -= floor
    heads[:, 1] -= floor

    faces = model.faces.cpu().numpy()
    fuv = model.face_texture_coordinate_indices.cpu().numpy()
    keep = ~np.isin(face_segments(model), list(DROP_PARTS))
    faces, fuv = faces[keep], fuv[keep]

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

    write_glb(
        out_dir / f"{name}.glb",
        {
            "POSITION": verts[vid],
            "NORMAL": normals[vid],
            "TEXCOORD_0": uv,
            "_VID": vid.astype(np.float32),
            "_BONE": dominant[vid].astype(np.float32),
        },
        inverse.reshape(-1, 3),
    )
    skeleton = {
        "source": "Anny (NAVER LABS Europe, Apache-2.0) with MakeHuman/MPFB2 CC0 assets",
        "phenotype": phenotype,
        "units": "meters",
        "height_m": float(verts[:, 1].max()),
        "bones": [
            {"name": n, "parent": int(p), "head": heads[i].round(5).tolist()}
            for i, (n, p) in enumerate(zip(model.bone_labels, model.bone_parents))
        ],
    }
    (out_dir / f"{name}.skeleton.json").write_text(json.dumps(skeleton, indent=1))
    print(f"{name}: {len(vid)} vertices, {len(faces)} faces, height {skeleton['height_m']:.3f} m")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="public/models")
    args = ap.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    model = anny.Anny().to(dtype=torch.float32)
    for name, ph in BODIES.items():
        export(model, name, ph, out_dir)


if __name__ == "__main__":
    main()
