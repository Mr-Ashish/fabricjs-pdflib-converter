import { describe, it, expect, vi } from 'vitest';
import type { PDFFont } from 'pdf-lib';
import { wrapTextbox } from '../../../src/fonts/text-wrap';

/**
 * Deterministic mock font: every character has width `fontSize * 0.5`,
 * so `widthOfTextAtSize(text, size) === text.length * size * 0.5`.
 *
 * Tests sized so that arithmetic is obvious:
 *   fontSize=10  →  each char = 5 pt
 */
function createMockFont(): PDFFont {
  return {
    widthOfTextAtSize: vi
      .fn()
      .mockImplementation((text: string, size: number) => text.length * size * 0.5),
  } as unknown as PDFFont;
}

const baseOpts = (font: PDFFont) => ({
  font,
  fontSize: 10,
  charSpacing: 0,
  splitByGrapheme: false,
});

describe('wrapTextbox', () => {
  describe('trivial cases', () => {
    it('returns a single empty line for empty input', () => {
      const font = createMockFont();
      expect(wrapTextbox('', 100, baseOpts(font))).toEqual(['']);
    });

    it('returns a single line when text fits within the box', () => {
      const font = createMockFont();
      // "hello" = 5 chars * 5pt = 25pt, fits in 100pt.
      expect(wrapTextbox('hello', 100, baseOpts(font))).toEqual(['hello']);
    });

    it('returns a single line for multiple words that fit', () => {
      const font = createMockFont();
      // "hello world" = 11 chars * 5pt = 55pt, fits in 100pt.
      expect(wrapTextbox('hello world', 100, baseOpts(font))).toEqual(['hello world']);
    });
  });

  describe('word wrapping', () => {
    it('wraps at word boundary when the next word would overflow', () => {
      const font = createMockFont();
      // "aaaa bbbb cccc" — each word = 20pt, space = 5pt.
      // Box = 30pt:
      //   "aaaa"        → 20pt, fits
      //   "aaaa "       → 25pt, fits
      //   "aaaa bbbb"   → 45pt, overflows → commit "aaaa ", start "bbbb"
      //   "bbbb "       → 25pt, fits
      //   "bbbb cccc"   → 45pt, overflows → commit "bbbb ", start "cccc"
      //   final: ["aaaa ", "bbbb ", "cccc"]
      // We accept either "aaaa" or "aaaa " as the committed line; both are
      // valid renderings. We check conceptually — 3 output lines, last is
      // "cccc".
      const result = wrapTextbox('aaaa bbbb cccc', 30, baseOpts(font));
      expect(result).toHaveLength(3);
      expect(result[0]!.trim()).toBe('aaaa');
      expect(result[1]!.trim()).toBe('bbbb');
      expect(result[2]).toBe('cccc');
    });

    it('does not start a wrapped line with leading whitespace', () => {
      const font = createMockFont();
      const result = wrapTextbox('aaaa bbbb', 25, baseOpts(font));
      // First line commits at "aaaa" (fits), then the whitespace becomes
      // leading on the new line and must be dropped; line 2 is "bbbb".
      expect(result).toHaveLength(2);
      expect(result[1]).toBe('bbbb');
    });

    it('preserves content-only lines exactly (no reflow when it all fits)', () => {
      const font = createMockFont();
      const result = wrapTextbox('one two three', 1000, baseOpts(font));
      expect(result).toEqual(['one two three']);
    });
  });

  describe('explicit newlines', () => {
    it('wraps each paragraph independently', () => {
      const font = createMockFont();
      // Two paragraphs, each needs to wrap.
      const result = wrapTextbox('aaaa bbbb\ncccc dddd', 25, baseOpts(font));
      expect(result).toHaveLength(4);
      expect(result[0]!.trim()).toBe('aaaa');
      expect(result[1]).toBe('bbbb');
      expect(result[2]!.trim()).toBe('cccc');
      expect(result[3]).toBe('dddd');
    });

    it('preserves empty lines from consecutive newlines', () => {
      const font = createMockFont();
      const result = wrapTextbox('a\n\nb', 100, baseOpts(font));
      expect(result).toEqual(['a', '', 'b']);
    });

    it('preserves a trailing empty paragraph', () => {
      const font = createMockFont();
      const result = wrapTextbox('a\n', 100, baseOpts(font));
      expect(result).toEqual(['a', '']);
    });
  });

  describe('single-word overflow', () => {
    it('emits an overflowing line when a single word is wider than the box (default)', () => {
      const font = createMockFont();
      // "aaaaaaaa" = 8 * 5 = 40pt, box = 20pt. Fabric's default behavior
      // keeps the word intact and lets it overflow the box.
      const result = wrapTextbox('aaaaaaaa', 20, baseOpts(font));
      expect(result).toEqual(['aaaaaaaa']);
    });

    it('breaks a word mid-stream when splitByGrapheme is true', () => {
      const font = createMockFont();
      // "aaaaaaaa", box = 20pt → 4 chars per line (4 * 5 = 20 fits, 5 * 5 = 25 overflows).
      const result = wrapTextbox('aaaaaaaa', 20, {
        ...baseOpts(font),
        splitByGrapheme: true,
      });
      expect(result).toEqual(['aaaa', 'aaaa']);
    });
  });

  describe('charSpacing', () => {
    it('wraps earlier when charSpacing increases measured width', () => {
      const font = createMockFont();
      // Without char spacing: "aa bb" = 5 chars * 5pt = 25pt, fits in 30pt.
      const without = wrapTextbox('aa bb', 30, baseOpts(font));
      expect(without).toEqual(['aa bb']);

      // With charSpacing = 500 (1/1000 em), each gap adds 500/1000 * 10 = 5pt.
      // Per-token measure:
      //   "aa"  → 2 chars, base 10pt + 1 gap * 5pt = 15pt
      //   " "   → 1 char,  base 5pt  + 0 gaps     = 5pt
      //   "bb"  → 2 chars, base 10pt + 1 gap * 5pt = 15pt
      // "aa" (15) + " " (5) = 20 → fits
      // + "bb" (15) = 35 → overflows 30 → wrap.
      const withSpacing = wrapTextbox('aa bb', 30, {
        ...baseOpts(font),
        charSpacing: 500,
      });
      expect(withSpacing).toHaveLength(2);
      expect(withSpacing[1]).toBe('bb');
    });
  });

  describe('splitByGrapheme for CJK-like input', () => {
    it('breaks per character when there are no word boundaries', () => {
      const font = createMockFont();
      // 6 CJK chars, each 5pt wide, box = 15pt → 3 per line.
      const result = wrapTextbox('你好世界再见', 15, {
        ...baseOpts(font),
        splitByGrapheme: true,
      });
      expect(result).toEqual(['你好世', '界再见']);
    });
  });

  describe('whitespace preservation', () => {
    it('keeps a trailing space on a wrapped line when the trailing space still fits', () => {
      const font = createMockFont();
      // "aaaa bbbb", box 25:
      //   "aaaa" (20) fits, " " (+5 = 25) still fits at boundary, then "bbbb"
      //   (+20 = 45) overflows → line 1 = "aaaa ", line 2 = "bbbb".
      const result = wrapTextbox('aaaa bbbb', 25, baseOpts(font));
      expect(result[0]).toBe('aaaa ');
      expect(result[1]).toBe('bbbb');
    });
  });
});
