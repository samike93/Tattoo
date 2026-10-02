/**
 * How fast ink ages, by pigment colour and by where it is on the body. Evidence (see
 * reports/Tattoo preview realism and capture.md): azo reds and yellows are the light-sensitive
 * pigments (Engel et al. 2007, Lehner et al. 2011) and black carbon is the most stable; light
 * colours and pastels lose visibility first. Hands, fingers and feet fade and blur fastest
 * (practitioner consensus; the Kirby-Desai laser-removal scale ranks distal limbs highest for blood
 * and lymph supply). The numbers are illustrative multipliers on the ink looks, not measured rates.
 */
export type BodyArea = 'headNeck' | 'trunk' | 'upperLimb' | 'distalLimb' | 'handFoot';

export const AREA_AGING: Record<BodyArea, { factor: number; label: string }> = {
  headNeck: { factor: 1, label: 'head or neck' },
  trunk: { factor: 1, label: 'torso' },
  upperLimb: { factor: 1.15, label: 'upper arm or thigh' },
  distalLimb: { factor: 1.35, label: 'forearm or lower leg' },
  handFoot: { factor: 2.5, label: 'hand, fingers or foot' },
};

/** Body area from a skeleton bone or limb id (Anny bone names, e.g. 'finger2-1.L', 'lowerarm01.R'). */
export function areaForBone(name: string): BodyArea {
  const n = name.toLowerCase();
  if (/^(wrist|finger|metacarpal|foot|toe|hand)/.test(n)) return 'handFoot';
  if (/^(lowerarm|lowerleg|forearm|calf|shin)/.test(n)) return 'distalLimb';
  if (/^(upperarm|upperleg|thigh|shoulder)/.test(n)) return 'upperLimb';
  if (/^(neck|head|eye)/.test(n)) return 'headNeck';
  return 'trunk';
}

/**
 * Relative light-induced loss for an ink colour (perceptual sRGB 0..1): warm reds, oranges and
 * yellows highest, light colours next, blues and greens lower, black lowest. Mirrors pigmentLoss()
 * in the GLSL below; keep the two in sync.
 */
export function pigmentLoss([r, g, b]: [number, number, number]): number {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx - mn;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const smooth = (e0: number, e1: number, x: number) => {
    const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
    return t * t * (3 - 2 * t);
  };
  const warm = sat * smooth(0, 0.2, r - b) * (b <= g + 0.05 ? 1 : 0);
  const light = smooth(0.55, 0.85, lum);
  const black = 1 - smooth(0.08, 0.35, mx);
  return Math.min(Math.max(0.45 + 1.1 * warm + 0.6 * light - 0.35 * black, 0.1), 1.6);
}

export const PIGMENT_LOSS_GLSL = /* glsl */ `
float pigmentLoss(vec3 c) {
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float sat = mx - mn;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float warm = sat * smoothstep(0.0, 0.2, c.r - c.b) * step(c.b, c.g + 0.05);
  float light = smoothstep(0.55, 0.85, lum);
  float black = 1.0 - smoothstep(0.08, 0.35, mx);
  return clamp(0.45 + 1.1 * warm + 0.6 * light - 0.35 * black, 0.1, 1.6);
}
`;
