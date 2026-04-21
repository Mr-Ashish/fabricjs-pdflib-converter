// Transform utilities: matrix math, coordinate conversion, origin resolution

import { concatTransformationMatrix } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { FabricObject, RenderContext } from '../types';
import { composeMatrix, multiplyMatrices } from './matrix';

/**
 * Calculates the origin offset based on originX/originY settings.
 * Fabric.js uses origin to determine how objects are positioned.
 * 
 * @param originX - Horizontal origin ('left', 'center', 'right')
 * @param originY - Vertical origin ('top', 'center', 'bottom')
 * @param width - Object width
 * @param height - Object height
 * @returns Offset to apply so object is positioned correctly
 */
function calculateOriginOffset(
  originX: string,
  originY: string,
  width: number,
  height: number,
): { x: number; y: number } {
  let x = 0;
  let y = 0;

  // Horizontal origin offset
  switch (originX) {
    case 'left':
      x = 0;
      break;
    case 'center':
      x = -width / 2;
      break;
    case 'right':
      x = -width;
      break;
    default:
      x = -width / 2; // Default to center
  }

  // Vertical origin offset
  switch (originY) {
    case 'top':
      y = 0;
      break;
    case 'center':
      y = -height / 2;
      break;
    case 'bottom':
      y = -height;
      break;
    default:
      y = -height / 2; // Default to center
  }

  return { x, y };
}

/**
 * Applies Fabric.js object transformations to the PDF page.
 * This sets up the transformation matrix for rendering the object.
 * 
 * PDF Coordinate System:
 * - Origin (0, 0) is at the bottom-left of the page
 * - Y increases upward
 * 
 * Fabric.js Coordinate System:
 * - Origin (0, 0) is at the top-left of the canvas
 * - Y increases downward
 * 
 * This function converts Fabric coordinates to PDF coordinates.
 */
export function applyTransformations(
  obj: FabricObject,
  page: PDFPage,
  context: RenderContext,
): void {
  // Get object dimensions (handle missing height for text, etc.)
  // For circles, calculate from radius. For ellipses, calculate from rx/ry.
  // IMPORTANT: Use UNscaled dimensions for origin offset calculation.
  // The scale matrix will handle scaling the origin offset.
  let objWidth = obj.width || 0;
  let objHeight = obj.height || 0;

  if (obj.type === 'circle') {
    const radius = (obj as { radius?: number }).radius ?? 0;
    objWidth = radius * 2;
    objHeight = radius * 2;
  } else if (obj.type === 'ellipse') {
    const rx = (obj as { rx?: number }).rx ?? 0;
    const ry = (obj as { ry?: number }).ry ?? 0;
    objWidth = rx * 2;
    objHeight = ry * 2;
  }

  // Get origin settings (default to 'center' as per Fabric.js)
  const originX = obj.originX || 'center';
  const originY = obj.originY || 'center';

  // Calculate origin offset based on originX/originY
  // This is where the object's origin is relative to its top-left corner
  const originOffset = calculateOriginOffset(originX, originY, objWidth, objHeight);

  // Convert Fabric Y (top-down) to PDF Y (bottom-up)
  // In Fabric: obj.top is distance from top of canvas to the object's origin point
  // In PDF: we need distance from bottom of page to the same origin point
  const pdfOriginY = context.options.pageHeight - obj.top;

  // Build the transformation matrix for scale, rotate, skew, and origin offset.
  // Translation is applied SEPARATELY to avoid scaling the translation.
  //
  // We want: point' = Translate(Rotate(Scale(Skew(OriginOffset(point)))))
  //
  // In matrix form: p' = T × R × S × Skew × O × p
  // Where O, Skew, S, R are matrices and T is a separate translation.

  // Build the transform matrix (without translation): R × S × Skew × O
  // multiplyMatrices(m1, m2) returns m2 × m1, so m1 is applied first.
  // We want O applied first, so we start with O and multiply by Skew, S, R.

  // Step 1: Origin offset (applied first to point)
  let transformMatrix: [number, number, number, number, number, number] = [1, 0, 0, 1, originOffset.x, originOffset.y];

  // Step 2: Skew
  const skewX = obj.skewX ?? 0;
  const skewY = obj.skewY ?? 0;
  if (skewX !== 0 || skewY !== 0) {
    const skewXRad = (skewX * Math.PI) / 180;
    const skewYRad = (skewY * Math.PI) / 180;
    transformMatrix = multiplyMatrices(transformMatrix, [1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0]);
  }

  // Step 3: Scale (with flips)
  const scaleXValue = obj.scaleX ?? 1;
  const scaleYValue = obj.scaleY ?? 1;
  const scaleX = obj.flipX ? -scaleXValue : scaleXValue;
  const scaleY = obj.flipY ? -scaleYValue : scaleYValue;
  if (scaleX !== 1 || scaleY !== 1) {
    transformMatrix = multiplyMatrices(transformMatrix, [scaleX, 0, 0, scaleY, 0, 0]);
  }

  // Step 4: Rotate
  const angle = obj.angle ?? 0;
  if (angle !== 0) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    transformMatrix = multiplyMatrices(transformMatrix, [cos, sin, -sin, cos, 0, 0]);
  }

  // Apply transformations in the correct order.
  // pdf-lib's concatTransformationMatrix multiplies: CTM = new_matrix × CTM
  // So we apply transforms in REVERSE order of application:
  // 1. Translation (applied last)
  // 2. Rotate, Scale, Skew, Origin (applied first)

  // Step 5: Apply translation first (will be rightmost in matrix multiplication)
  // For top origin, we need to adjust because pdf-lib draws upward from the given Y
  let translateY = pdfOriginY;
  if (originY === 'top') {
    translateY -= objHeight;
  }
  page.pushOperators(concatTransformationMatrix(1, 0, 0, 1, obj.left, translateY));

  // Apply the transformation matrix (scale, rotate, skew, origin)
  // This will be multiplied on the LEFT, so it's applied FIRST to points
  const [a, b, c, d, e, f] = transformMatrix;
  page.pushOperators(concatTransformationMatrix(a, b, c, d, e, f));
}

// Re-export all transform utilities
export * from './matrix';
export * from './coordinate';
export * from './origin';
