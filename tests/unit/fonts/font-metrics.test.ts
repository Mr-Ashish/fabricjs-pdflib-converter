import { describe, it, expect, vi } from 'vitest';
import {
  getTextWidth,
  getTextHeight,
  getAscenderHeight,
  getDescenderHeight,
  getBaselineOffset,
} from '../../../src/fonts/font-metrics';
import type { PDFFont } from 'pdf-lib';

// Mock PDFFont
function createMockPDFFont() {
  return {
    widthOfTextAtSize: vi.fn().mockReturnValue(100),
    heightAtSize: vi.fn().mockImplementation((size: number, options?: { descender?: boolean }) => {
      // Approximate height calculation
      if (options?.descender === false) {
        return size * 0.75; // Ascender only (approx 75% of full height)
      }
      return size * 1.2; // Full height with descender
    }),
  } as unknown as PDFFont;
}

describe('getTextWidth', () => {
  it('should return text width from font', () => {
    const font = createMockPDFFont();
    const width = getTextWidth(font, 'Hello', 12);

    expect(width).toBe(100);
    expect(font.widthOfTextAtSize).toHaveBeenCalledWith('Hello', 12);
  });

  it('should handle empty string', () => {
    const font = createMockPDFFont();
    font.widthOfTextAtSize = vi.fn().mockReturnValue(0);

    const width = getTextWidth(font, '', 12);
    expect(width).toBe(0);
  });

  it('should handle different font sizes', () => {
    const font = createMockPDFFont();
    font.widthOfTextAtSize = vi.fn().mockImplementation((text, size) => text.length * size * 0.5);

    const width12 = getTextWidth(font, 'Hello', 12);
    const width24 = getTextWidth(font, 'Hello', 24);

    expect(width24).toBe(width12 * 2);
  });
});

describe('getTextHeight', () => {
  it('should return text height from font', () => {
    const font = createMockPDFFont();
    const height = getTextHeight(font, 12);

    expect(height).toBe(12 * 1.2); // Mock returns 1.2x size
    expect(font.heightAtSize).toHaveBeenCalledWith(12);
  });

  it('should handle different font sizes', () => {
    const font = createMockPDFFont();

    const height12 = getTextHeight(font, 12);
    const height24 = getTextHeight(font, 24);

    expect(height24).toBeGreaterThan(height12);
  });
});

describe('getAscenderHeight', () => {
  it('should return ascender height without descender', () => {
    const font = createMockPDFFont();
    const height = getAscenderHeight(font, 12);

    expect(height).toBe(12 * 0.75); // Mock returns 0.75x for ascender only
    expect(font.heightAtSize).toHaveBeenCalledWith(12, { descender: false });
  });
});

describe('getDescenderHeight', () => {
  it('should return descender depth', () => {
    const font = createMockPDFFont();
    const descender = getDescenderHeight(font, 12);

    // Full height (14.4) - ascender height (9) = descender (5.4)
    expect(descender).toBe(12 * 1.2 - 12 * 0.75);
  });

  it('should handle different font sizes', () => {
    const font = createMockPDFFont();

    const descender12 = getDescenderHeight(font, 12);
    const descender24 = getDescenderHeight(font, 24);

    expect(descender24).toBeGreaterThan(descender12);
  });
});

describe('getBaselineOffset', () => {
  it('should return Y offset from top to baseline', () => {
    const font = createMockPDFFont();
    const offset = getBaselineOffset(font, 12);

    // Baseline offset = ascender height
    expect(offset).toBe(12 * 0.75);
  });

  it('should be consistent with ascender height', () => {
    const font = createMockPDFFont();

    const baseline = getBaselineOffset(font, 12);
    const ascender = getAscenderHeight(font, 12);

    expect(baseline).toBe(ascender);
  });
});
