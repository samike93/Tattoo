import { describe, expect, it } from 'vitest';
import { ita, SKIN_PRESETS, skinAlbedo, skinHex, skinLab } from './skinTone';

const luma = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('skin tone model', () => {
  it('gets darker monotonically with melanin, and stays skin-coloured (R > G > B)', () => {
    let last = Infinity;
    for (let m = 0; m <= 1.0001; m += 0.05) {
      const c = skinAlbedo({ melanin: m, undertone: 0 });
      expect(luma(c)).toBeLessThan(last);
      last = luma(c);
      expect(c[0]).toBeGreaterThan(c[1]);
      expect(c[1]).toBeGreaterThan(c[2]);
    }
  });

  it('spans very light to very dark skin', () => {
    const light = skinAlbedo(SKIN_PRESETS[0]);
    const dark = skinAlbedo(SKIN_PRESETS[SKIN_PRESETS.length - 1]);
    console.log('presets:', SKIN_PRESETS.map((t) => `${skinHex(t)} (ITA ${ita(t).toFixed(0)}°)`).join(' '));
    expect(luma(light)).toBeGreaterThan(0.45);
    expect(luma(dark)).toBeLessThan(0.06);
    // Covers the dermatology categories from very light (> 55°) to dark (< -30°).
    expect(ita(SKIN_PRESETS[0])).toBeGreaterThan(55);
    expect(ita(SKIN_PRESETS[SKIN_PRESETS.length - 1])).toBeLessThan(-30);
  });

  it('warm undertone is more golden, cool is pinker', () => {
    const [, aw, bw] = skinLab({ melanin: 0.3, undertone: 1 });
    const [, ac, bc] = skinLab({ melanin: 0.3, undertone: -1 });
    expect(bw).toBeGreaterThan(bc + 4); // yellower
    expect(ac).toBeGreaterThan(aw + 2); // redder/pinker
  });
});
