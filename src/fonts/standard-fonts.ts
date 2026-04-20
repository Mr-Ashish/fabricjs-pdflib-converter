import { StandardFonts } from 'pdf-lib';

/**
 * Map of standard PDF font names to pdf-lib StandardFonts enum values.
 */
export const STANDARD_FONT_MAP: Record<string, StandardFonts> = {
  // Helvetica family
  'Helvetica': StandardFonts.Helvetica,
  'Helvetica-Bold': StandardFonts.HelveticaBold,
  'Helvetica-Oblique': StandardFonts.HelveticaOblique,
  'Helvetica-BoldOblique': StandardFonts.HelveticaBoldOblique,

  // Times family
  'Times-Roman': StandardFonts.TimesRoman,
  'Times-Bold': StandardFonts.TimesRomanBold,
  'Times-Italic': StandardFonts.TimesRomanItalic,
  'Times-BoldItalic': StandardFonts.TimesRomanBoldItalic,

  // Courier family
  'Courier': StandardFonts.Courier,
  'Courier-Bold': StandardFonts.CourierBold,
  'Courier-Oblique': StandardFonts.CourierOblique,
  'Courier-BoldOblique': StandardFonts.CourierBoldOblique,
};

/**
 * Raw map of common CSS font family names to standard PDF font names.
 * Keys are stored in lowercase.
 */
const CSS_FONT_MAP_RAW: Record<string, string> = {
  // Arial -> Helvetica
  'arial': 'Helvetica',

  // Times New Roman -> Times
  'times new roman': 'Times-Roman',
  'times': 'Times-Roman',

  // Courier New -> Courier
  'courier new': 'Courier',

  // Generic families
  'sans-serif': 'Helvetica',
  'serif': 'Times-Roman',
  'monospace': 'Courier',
};

/**
 * Map of common CSS font family names to standard PDF font names.
 * Uses a Proxy for case-insensitive lookup.
 */
export const CSS_FONT_MAP: Record<string, string> = new Proxy(CSS_FONT_MAP_RAW, {
  get(target, prop: string) {
    return target[prop.toLowerCase()];
  },
});

/**
 * Get the standard PDF font name for a given CSS font family.
 * Returns undefined if no mapping exists.
 *
 * @param fontFamily - CSS font family name
 * @returns Standard PDF font name or undefined
 */
export function getStandardFontName(fontFamily: string): string | undefined {
  // First check if it's already a standard font name (case-insensitive)
  const normalizedFontFamily = fontFamily.toLowerCase();
  const standardFontKey = Object.keys(STANDARD_FONT_MAP).find(
    key => key.toLowerCase() === normalizedFontFamily
  );
  if (standardFontKey) {
    return standardFontKey;
  }

  // Check CSS font map (case-insensitive via Proxy)
  return CSS_FONT_MAP[fontFamily];
}

/**
 * Build a font variant key for caching.
 * Format: family[:bold][:italic]
 *
 * @param fontFamily - Font family name
 * @param fontWeight - Font weight ('normal', 'bold', or numeric)
 * @param fontStyle - Font style ('normal', 'italic', 'oblique')
 * @returns Variant key string
 */
export function getFontVariantKey(
  fontFamily: string,
  fontWeight: string | number,
  fontStyle: string,
): string {
  const parts = [fontFamily];

  // Handle weight
  const isBold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === 700;
  if (isBold) {
    parts.push('bold');
  }

  // Handle style
  const isItalic = fontStyle === 'italic' || fontStyle === 'oblique';
  if (isItalic) {
    parts.push('italic');
  }

  return parts.join(':');
}
