import { describe, it, expect } from 'vitest';
import {
  STANDARD_FONT_MAP,
  CSS_FONT_MAP,
  getStandardFontName,
  getFontVariantKey,
} from '../../../src/fonts/standard-fonts';

describe('STANDARD_FONT_MAP', () => {
  it('should contain Helvetica variants', () => {
    expect(STANDARD_FONT_MAP['Helvetica']).toBeDefined();
    expect(STANDARD_FONT_MAP['Helvetica-Bold']).toBeDefined();
    expect(STANDARD_FONT_MAP['Helvetica-Oblique']).toBeDefined();
    expect(STANDARD_FONT_MAP['Helvetica-BoldOblique']).toBeDefined();
  });

  it('should contain Times variants', () => {
    expect(STANDARD_FONT_MAP['Times-Roman']).toBeDefined();
    expect(STANDARD_FONT_MAP['Times-Bold']).toBeDefined();
    expect(STANDARD_FONT_MAP['Times-Italic']).toBeDefined();
    expect(STANDARD_FONT_MAP['Times-BoldItalic']).toBeDefined();
  });

  it('should contain Courier variants', () => {
    expect(STANDARD_FONT_MAP['Courier']).toBeDefined();
    expect(STANDARD_FONT_MAP['Courier-Bold']).toBeDefined();
    expect(STANDARD_FONT_MAP['Courier-Oblique']).toBeDefined();
    expect(STANDARD_FONT_MAP['Courier-BoldOblique']).toBeDefined();
  });

  it('should map to pdf-lib StandardFonts enum values', () => {
    // Values should be valid StandardFonts strings
    expect(Object.values(STANDARD_FONT_MAP).length).toBe(12);
  });
});

describe('CSS_FONT_MAP', () => {
  it('should map Arial to Helvetica', () => {
    expect(CSS_FONT_MAP['Arial']).toBe('Helvetica');
  });

  it('should map Times New Roman to Times-Roman', () => {
    expect(CSS_FONT_MAP['Times New Roman']).toBe('Times-Roman');
  });

  it('should map Courier New to Courier', () => {
    expect(CSS_FONT_MAP['Courier New']).toBe('Courier');
  });

  it('should map generic families', () => {
    expect(CSS_FONT_MAP['sans-serif']).toBe('Helvetica');
    expect(CSS_FONT_MAP['serif']).toBe('Times-Roman');
    expect(CSS_FONT_MAP['monospace']).toBe('Courier');
  });

  it('should be case-insensitive in lookup', () => {
    // The map keys are lowercase for case-insensitive lookup
    expect(CSS_FONT_MAP['arial']).toBe('Helvetica');
    expect(CSS_FONT_MAP['ARIAL']).toBe('Helvetica');
    expect(CSS_FONT_MAP['Arial']).toBe('Helvetica');
  });
});

describe('getStandardFontName', () => {
  it('should return mapped font for CSS font names', () => {
    expect(getStandardFontName('Arial')).toBe('Helvetica');
    expect(getStandardFontName('Times New Roman')).toBe('Times-Roman');
    expect(getStandardFontName('Courier New')).toBe('Courier');
  });

  it('should return standard font names directly', () => {
    expect(getStandardFontName('Helvetica')).toBe('Helvetica');
    expect(getStandardFontName('Times-Roman')).toBe('Times-Roman');
    expect(getStandardFontName('Courier')).toBe('Courier');
  });

  it('should return undefined for unknown fonts', () => {
    expect(getStandardFontName('UnknownFont')).toBeUndefined();
    expect(getStandardFontName('Comic Sans')).toBeUndefined();
  });

  it('should handle case-insensitive matching', () => {
    expect(getStandardFontName('arial')).toBe('Helvetica');
    expect(getStandardFontName('HELVETICA')).toBe('Helvetica');
    expect(getStandardFontName('Sans-Serif')).toBe('Helvetica');
  });
});

describe('getFontVariantKey', () => {
  it('should build key with family only', () => {
    expect(getFontVariantKey('Helvetica', 'normal', 'normal')).toBe('Helvetica');
  });

  it('should build key with bold', () => {
    expect(getFontVariantKey('Helvetica', 'bold', 'normal')).toBe('Helvetica:bold');
  });

  it('should build key with italic', () => {
    expect(getFontVariantKey('Helvetica', 'normal', 'italic')).toBe('Helvetica:italic');
  });

  it('should build key with bold and italic', () => {
    expect(getFontVariantKey('Helvetica', 'bold', 'italic')).toBe('Helvetica:bold:italic');
  });

  it('should handle numeric font weights', () => {
    expect(getFontVariantKey('Arial', '700', 'normal')).toBe('Arial:bold');
    expect(getFontVariantKey('Arial', '400', 'normal')).toBe('Arial');
  });

  it('should handle oblique as italic', () => {
    expect(getFontVariantKey('Helvetica', 'normal', 'oblique')).toBe('Helvetica:italic');
  });
});
