/**
 * Skin colour on the scale dermatology uses, instead of a free paint colour.
 *
 * Skin colour is measured in CIELAB and classified by the Individual Typology Angle,
 * ITA° = atan((L* - 50) / b*), from "very light" (> 55°) to "dark" (< -30°). Melanin is the main
 * driver: it lowers L* and moves b* (yellowness) up and then down again; blood (haemoglobin)
 * sets a* (redness). We interpolate a curve through typical L*a*b* values for each ITA category
 * (after skin colorimetry surveys such as Del Bino et al. 2013; approximate averages, not a
 * diagnostic tool), so every tone has a plausible skin hue and darker skin is not just "beige,
 * darker". Undertone shifts a* and b*: cool = pinker, warm = more golden.
 *
 * The ink is multiplied into this albedo, so coloured inks naturally lose contrast on darker skin.
 */
export interface SkinTone {
  /** 0 = very light, 1 = very dark. */
  melanin: number;
  /** -1 = cool (pink), 0 = neutral, 1 = warm (golden/olive). */
  undertone: number;
}

// melanin -> typical L*, a*, b* (very light ... very dark).
const CURVE: [number, number, number, number][] = [
  [0.0, 78, 7.5, 13],
  [0.17, 70, 9, 15.5],
  [0.33, 63, 10.5, 18],
  [0.5, 55, 12, 20.5],
  [0.67, 45, 12.5, 20],
  [0.83, 35, 11.5, 16],
  [1.0, 24, 9, 10],
];

export function skinLab({ melanin, undertone }: SkinTone): [number, number, number] {
  const m = Math.min(Math.max(melanin, 0), 1);
  const u = Math.min(Math.max(undertone, -1), 1);
  let i = 0;
  while (i < CURVE.length - 2 && m > CURVE[i + 1][0]) i++;
  const [m0, L0, a0, b0] = CURVE[i], [m1, L1, a1, b1] = CURVE[i + 1];
  const f = (m - m0) / (m1 - m0);
  const L = L0 + f * (L1 - L0);
  const a = a0 + f * (a1 - a0) + (u < 0 ? -2.5 * u : -1.0 * u);
  const b = b0 + f * (b1 - b0) + (u < 0 ? 3 * u : 3.5 * u);
  return [L, a, b];
}

/** CIELAB (D65) -> linear sRGB. */
export function labToLinear([L, a, b]: [number, number, number]): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t: number) => (t > 6 / 29 ? t * t * t : 3 * (6 / 29) ** 2 * (t - 4 / 29));
  const X = 0.95047 * inv(fx), Y = inv(fy), Z = 1.08883 * inv(fz);
  const r = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const g = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  const bl = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
  return [r, g, bl].map((c) => Math.min(Math.max(c, 0), 1)) as [number, number, number];
}

export const skinAlbedo = (t: SkinTone) => labToLinear(skinLab(t));

const toSrgb = (c: number) => Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));

export function skinHex(t: SkinTone): string {
  return '#' + skinAlbedo(t).map((c) => toSrgb(c).toString(16).padStart(2, '0')).join('');
}

/** Individual Typology Angle, degrees. */
export function ita(t: SkinTone): number {
  const [L, , b] = skinLab(t);
  return (Math.atan2(L - 50, b) * 180) / Math.PI;
}

/** Presets from very light to very dark, evenly spaced along the curve. */
export const SKIN_PRESETS: SkinTone[] = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1].map((melanin) => ({ melanin, undertone: 0 }));
