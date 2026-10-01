import type { Vec3 } from '../projection/vec';

export interface Bone {
  name: string;
  parent: number;
  head: Vec3;
}

export interface Skeleton {
  source: string;
  units: string;
  height_m: number;
  bones: Bone[];
}

export type BodyId = 'male' | 'female';

/** A limb segment for cylindrical wrapping: axis from joint `from` to joint `to`, skin limited to `bones`. */
export interface LimbDef {
  id: string;
  label: string;
  from: string;
  to: string;
  bones: string[];
}

const side = (s: 'L' | 'R', label: string): LimbDef[] => [
  { id: `forearm.${s}`, label: `${label} forearm`, from: `lowerarm01.${s}`, to: `wrist.${s}`, bones: [`lowerarm01.${s}`, `lowerarm02.${s}`] },
  { id: `upperarm.${s}`, label: `${label} upper arm`, from: `upperarm01.${s}`, to: `lowerarm01.${s}`, bones: [`upperarm01.${s}`, `upperarm02.${s}`] },
  { id: `thigh.${s}`, label: `${label} thigh`, from: `upperleg01.${s}`, to: `lowerleg01.${s}`, bones: [`upperleg01.${s}`, `upperleg02.${s}`] },
  { id: `calf.${s}`, label: `${label} calf`, from: `lowerleg01.${s}`, to: `foot.${s}`, bones: [`lowerleg01.${s}`, `lowerleg02.${s}`] },
];

export const LIMBS: LimbDef[] = [
  ...side('L', 'Left'),
  ...side('R', 'Right'),
  { id: 'neck', label: 'Neck', from: 'neck01', to: 'head', bones: ['neck01', 'neck02', 'neck03'] },
];

export function boneIndex(sk: Skeleton, name: string): number {
  const i = sk.bones.findIndex((b) => b.name === name);
  if (i < 0) throw new Error(`Bone not found in skeleton: ${name}`);
  return i;
}

export const jointPos = (sk: Skeleton, name: string): Vec3 => sk.bones[boneIndex(sk, name)].head;

export function scaleSkeleton(sk: Skeleton, k: number): Skeleton {
  return {
    ...sk,
    height_m: sk.height_m * k,
    bones: sk.bones.map((b) => ({ ...b, head: [b.head[0] * k, b.head[1] * k, b.head[2] * k] as Vec3 })),
  };
}
