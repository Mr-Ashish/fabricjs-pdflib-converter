/**
 * Dash pattern utilities for stroke styles.
 * Handles conversion between Fabric.js strokeDashArray and PDF dash patterns.
 */

/**
 * PDF dash pattern specification.
 */
export interface PdfDashPattern {
  /** Array of dash and gap lengths, or null for solid line */
  dashArray: number[] | null;
  /** Phase offset into the dash pattern */
  dashPhase: number;
}

/**
 * Normalizes a dash array value to a standard format.
 * Handles null, single numbers, and filters invalid values.
 *
 * @param dashArray - Input dash array (null, number, or array of numbers)
 * @returns Normalized array or null for solid line
 */
export function normalizeDashArray(
  dashArray: number[] | null | undefined,
): number[] | null {
  if (dashArray === null || dashArray === undefined) {
    return null;
  }

  // Handle single number (convert to [n, n] pattern)
  if (typeof dashArray === 'number') {
    return dashArray > 0 ? [dashArray, dashArray] : null;
  }

  // Filter array to only positive values
  const filtered = dashArray.filter((v) => typeof v === 'number' && v > 0);

  if (filtered.length === 0) {
    return null;
  }

  return filtered;
}

/**
 * Scales a dash array by a factor.
 *
 * @param dashArray - Dash array to scale
 * @param scale - Scale factor
 * @returns Scaled dash array or null
 */
export function scaleDashArray(
  dashArray: number[] | null,
  scale: number,
): number[] | null {
  if (dashArray === null) {
    return null;
  }

  return dashArray.map((v) => v * scale);
}

/**
 * Converts a dash array to PDF format.
 * PDF requires even-length dash arrays, so odd-length arrays are duplicated.
 *
 * @param dashArray - Input dash array
 * @param scale - Scale factor to apply
 * @returns PDF dash pattern specification
 */
export function dashArrayToPdf(
  dashArray: number[] | null | undefined,
  scale: number,
): PdfDashPattern {
  const normalized = normalizeDashArray(dashArray);

  if (normalized === null) {
    return { dashArray: null, dashPhase: 0 };
  }

  let scaled = scaleDashArray(normalized, scale);

  // PDF requires even-length dash arrays
  if (scaled !== null && scaled.length % 2 === 1) {
    // Duplicate the array to make it even length
    scaled = [...scaled, ...scaled];
  }

  return {
    dashArray: scaled,
    dashPhase: 0,
  };
}
