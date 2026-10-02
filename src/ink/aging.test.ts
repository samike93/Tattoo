import { describe, expect, it } from 'vitest';
import { AREA_AGING, areaForBone, pigmentLoss } from './aging';

describe('ink aging', () => {
  it('ranks pigments: yellow and red fade most, blue and green less, black least', () => {
    const yellow = pigmentLoss([0.95, 0.85, 0.1]);
    const red = pigmentLoss([0.8, 0.1, 0.1]);
    const blue = pigmentLoss([0.1, 0.25, 0.7]);
    const green = pigmentLoss([0.1, 0.6, 0.3]);
    const black = pigmentLoss([0.05, 0.05, 0.06]);
    expect(yellow).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
    expect(red).toBeGreaterThan(green);
    expect(blue).toBeGreaterThan(black);
    expect(black).toBeLessThan(0.2);
  });

  it('maps bones to body areas, hands and feet ageing fastest', () => {
    expect(areaForBone('finger2-1.L')).toBe('handFoot');
    expect(areaForBone('toe1-1.R')).toBe('handFoot');
    expect(areaForBone('lowerarm01.L')).toBe('distalLimb');
    expect(areaForBone('upperleg02.R')).toBe('upperLimb');
    expect(areaForBone('spine03')).toBe('trunk');
    expect(areaForBone('neck01')).toBe('headNeck');
    expect(AREA_AGING.handFoot.factor).toBeGreaterThan(AREA_AGING.distalLimb.factor);
  });
});
