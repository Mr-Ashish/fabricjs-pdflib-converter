import { describe, it, expect } from 'vitest';
import { pxToPt, ptToPx, mmToPx, pxToMm, ptToMm, mmToPt } from '../../../src/utils/units';

describe('pxToPt', () => {
  it('should convert pixels to points', () => {
    expect(pxToPt(72)).toBe(54); // 72px = 54pt (at 96 DPI)
    expect(pxToPt(96)).toBe(72); // 96px = 72pt
  });

  it('should handle zero', () => {
    expect(pxToPt(0)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(pxToPt(-96)).toBe(-72);
  });
});

describe('ptToPx', () => {
  it('should convert points to pixels', () => {
    expect(ptToPx(72)).toBe(96); // 72pt = 96px
    expect(ptToPx(54)).toBe(72); // 54pt = 72px
  });

  it('should handle zero', () => {
    expect(ptToPx(0)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(ptToPx(1)).toBe(1); // 1.333... rounds to 1
  });
});

describe('mmToPx', () => {
  it('should convert millimeters to pixels', () => {
    // 25.4mm = 1 inch = 96px at standard DPI
    expect(mmToPx(25.4)).toBeCloseTo(96, 0);
    expect(mmToPx(10)).toBeCloseTo(37.8, 0);
  });

  it('should handle zero', () => {
    expect(mmToPx(0)).toBe(0);
  });
});

describe('pxToMm', () => {
  it('should convert pixels to millimeters', () => {
    expect(pxToMm(96)).toBeCloseTo(25.4, 1);
    expect(pxToMm(37.8)).toBeCloseTo(10, 0);
  });

  it('should handle zero', () => {
    expect(pxToMm(0)).toBe(0);
  });
});

describe('ptToMm', () => {
  it('should convert points to millimeters', () => {
    // 72pt = 1 inch = 25.4mm
    expect(ptToMm(72)).toBeCloseTo(25.4, 1);
    expect(ptToMm(28.35)).toBeCloseTo(10, 0);
  });

  it('should handle zero', () => {
    expect(ptToMm(0)).toBe(0);
  });
});

describe('mmToPt', () => {
  it('should convert millimeters to points', () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 0);
    expect(mmToPt(10)).toBeCloseTo(28.35, 1);
  });

  it('should handle zero', () => {
    expect(mmToPt(0)).toBe(0);
  });
});
