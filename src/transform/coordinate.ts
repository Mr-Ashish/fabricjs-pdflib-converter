import { composeMatrix } from './matrix';
import { resolveOriginOffset } from './origin';
import type { FabricObjectBase, TransformMatrix } from '../types';

/**
 * Builds a transformation matrix from Fabric.js object properties.
 * Combines position, scale, rotation, skew, and flip into a single matrix.
 * Accounts for originX/originY by adjusting the translation.
 *
 * @param object - Fabric.js object with transform properties
 * @returns TransformMatrix representing all object transforms
 */
export function fabricToMatrix(object: FabricObjectBase): TransformMatrix {
  // Resolve origin offset to adjust position
  const originOffset = resolveOriginOffset(
    object.originX,
    object.originY,
    object.width ?? 0,
    object.height ?? 0,
  );

  return composeMatrix({
    translateX: object.left + originOffset.x,
    translateY: object.top + originOffset.y,
    scaleX: object.scaleX,
    scaleY: object.scaleY,
    angle: object.angle,
    skewX: object.skewX,
    skewY: object.skewY,
    flipX: object.flipX,
    flipY: object.flipY,
  });
}

/**
 * Converts a Fabric.js transformation matrix to PDF coordinate space.
 * PDF uses bottom-left origin (Y up), Fabric uses top-left (Y down).
 *
 * @param fabricMatrix - Transform matrix in Fabric coordinates
 * @param pageHeight - Height of the PDF page
 * @param scale - Scale factor for the output
 * @returns TransformMatrix in PDF coordinates
 */
export function fabricToPdfMatrix(
  fabricMatrix: TransformMatrix,
  pageHeight: number,
  scale: number,
): TransformMatrix {
  const [a, b, c, d, e, f] = fabricMatrix;

  // Apply scale and Y-flip for PDF coordinate system
  // PDF: Y grows upward, Fabric: Y grows downward
  return [
    a * scale, // a: scale X
    -b * scale, // b: skew Y (flipped)
    c * scale, // c: skew X
    -d * scale, // d: scale Y (flipped)
    e * scale, // e: translate X
    pageHeight - f * scale, // f: translate Y (flipped from bottom)
  ];
}

/**
 * Converts a Y coordinate from Fabric.js space to PDF space.
 * Fabric: Y=0 at top, PDF: Y=0 at bottom.
 *
 * @param fabricY - Y position in Fabric coordinates
 * @param objectHeight - Height of the object
 * @param pageHeight - Height of the PDF page
 * @param scale - Scale factor
 * @returns Y position in PDF coordinates
 */
export function fabricYToPdfY(
  fabricY: number,
  objectHeight: number,
  pageHeight: number,
  scale: number,
): number {
  // Convert to PDF coordinates: flip Y axis
  // Position from bottom = pageHeight - (fabricY + objectHeight) * scale
  return pageHeight - (fabricY + objectHeight) * scale;
}
