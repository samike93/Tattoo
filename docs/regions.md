# Body regions

How skin is assigned to body parts, so it can be redone for a new body model.

## Phase 0 (current): dominant bone

`tools/export_bodies.py` writes a `_BONE` attribute: for each vertex, the bone with the largest
skinning weight in Anny's 104-bone rig. A limb is a list of bones (`src/body/skeleton.ts`, `LIMBS`):

| Limb | Axis (joint → joint) | Bones |
|---|---|---|
| Forearm L/R | `lowerarm01` → `wrist` | `lowerarm01`, `lowerarm02` |
| Upper arm L/R | `upperarm01` → `lowerarm01` | `upperarm01`, `upperarm02` |
| Thigh L/R | `upperleg01` → `lowerleg01` | `upperleg01`, `upperleg02` |
| Calf L/R | `lowerleg01` → `foot` | `lowerleg01`, `lowerleg02` |
| Neck | `neck01` → `head` | `neck01`, `neck02`, `neck03` |

The cylindrical wrap only draws on vertices of its limb (turn on "Show wrap region" in the app to
see them), so a forearm design never lands on the hip even though the hand hangs next to it.

Non-skin parts (eye backs, eye sockets, mouth cavity, tongue) are removed at export using Anny's UV
segmentation mask (`data/segmentation/body_parts_segmentation.png`).

## Phase 2: hand-tuned region IDs

Dominant-bone boundaries are jagged and follow the rig, not tattoo vocabulary (an "inner forearm" is
not a bone). Process to build the full part/area map from the spec:

1. Start from the dominant bone per vertex (as above) to get the coarse parts.
2. Split parts into areas by angle around the limb axis (inner/outer/top/bottom) using the same
   fitted limb frame as the cylindrical wrap, and by height for the torso (upper/lower back).
3. Open the body in Blender (import the GLB), paint the boundaries where they read wrong, and store
   the result as a vertex attribute `_REGION` (integer id) in the export. Keep a table of ids in
   `src/regions/regions.json`.
4. Re-export with `tools/export_bodies.py --regions regions.blend` (to be added) so the ids survive
   regenerating the body.
5. Check: every vertex has exactly one region; left/right pairs mirror; each region is connected.
