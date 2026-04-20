import type { PDFFont } from 'pdf-lib';

/**
 * Font metrics utilities for text measurement and positioning.
 * Wraps pdf-lib font methods with convenient helpers.
 */

/**
 * Get the width of text at a given font size.
 *
 * @param font - The PDF font
 * @param text - The text to measure
 * @param fontSize - The font size in points
 * @returns The text width in points
 */
export function getTextWidth(font: PDFFont, text: string, fontSize: number): number {
  return font.widthOfTextAtSize(text, fontSize);
}

/**
 * Get the height of text at a given font size.
 * This includes both ascender and descender.
 *
 * @param font - The PDF font
 * @param fontSize - The font size in points
 * @returns The text height in points
 */
export function getTextHeight(font: PDFFont, fontSize: number): number {
  return font.heightAtSize(fontSize);
}

/**
 * Get the ascender height (height above the baseline, excluding descender).
 *
 * @param font - The PDF font
 * @param fontSize - The font size in points
 * @returns The ascender height in points
 */
export function getAscenderHeight(font: PDFFont, fontSize: number): number {
  return font.heightAtSize(fontSize, { descender: false });
}

/**
 * Get the descender depth (depth below the baseline).
 *
 * @param font - The PDF font
 * @param fontSize - The font size in points
 * @returns The descender depth in points (positive value)
 */
export function getDescenderHeight(font: PDFFont, fontSize: number): number {
  const fullHeight = font.heightAtSize(fontSize);
  const ascenderHeight = font.heightAtSize(fontSize, { descender: false });
  return fullHeight - ascenderHeight;
}

/**
 * Get the Y offset from the top of the text bounding box to the baseline.
 * This is used to convert Fabric's top-of-text positioning to PDF's baseline positioning.
 *
 * @param font - The PDF font
 * @param fontSize - The font size in points
 * @returns The baseline offset in points (positive, measured from top)
 */
export function getBaselineOffset(font: PDFFont, fontSize: number): number {
  // The baseline is at the ascender height from the top
  return getAscenderHeight(font, fontSize);
}
