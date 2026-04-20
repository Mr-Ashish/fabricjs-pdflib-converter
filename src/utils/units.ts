/**
 * Unit conversion utilities for PDF generation.
 * Standard web DPI is 96 pixels per inch.
 * PDF uses points (1/72 inch) as base unit.
 */

const PIXELS_PER_INCH = 96;
const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

/**
 * Converts pixels to points.
 * @param px - Value in pixels
 * @returns Value in points
 */
export function pxToPt(px: number): number {
  return (px * POINTS_PER_INCH) / PIXELS_PER_INCH;
}

/**
 * Converts points to pixels.
 * @param pt - Value in points
 * @returns Value in pixels (rounded to nearest integer)
 */
export function ptToPx(pt: number): number {
  return Math.round((pt * PIXELS_PER_INCH) / POINTS_PER_INCH);
}

/**
 * Converts millimeters to pixels.
 * @param mm - Value in millimeters
 * @returns Value in pixels
 */
export function mmToPx(mm: number): number {
  return (mm * PIXELS_PER_INCH) / MM_PER_INCH;
}

/**
 * Converts pixels to millimeters.
 * @param px - Value in pixels
 * @returns Value in millimeters
 */
export function pxToMm(px: number): number {
  return (px * MM_PER_INCH) / PIXELS_PER_INCH;
}

/**
 * Converts points to millimeters.
 * @param pt - Value in points
 * @returns Value in millimeters
 */
export function ptToMm(pt: number): number {
  return (pt * MM_PER_INCH) / POINTS_PER_INCH;
}

/**
 * Converts millimeters to points.
 * @param mm - Value in millimeters
 * @returns Value in points
 */
export function mmToPt(mm: number): number {
  return (mm * POINTS_PER_INCH) / MM_PER_INCH;
}
