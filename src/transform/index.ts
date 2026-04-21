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
  const objWidth = obj.width || 0;
  const objHeight = obj.height || 0;

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

  // Build the transformation matrix manually with correct order
  // We want: point' = Translate × Rotate × Scale × Skew × (point + originOffset)
  // Which is equivalent to: point' = M × point + M × originOffset
  // 
  // For PDF, we need to apply transforms in this order (right to left):
  // 1. Move to origin (apply origin offset)
  // 2. Skew
  // 3. Scale  
  // 4. Rotate
  // 5. Translate to final position
  
  // Start with identity
  let matrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  
  // Step 1: Origin offset (move object so its origin is at 0,0)
  if (originOffset.x !== 0 || originOffset.y !== 0) {
    matrix = multiplyMatrices(matrix, [1, 0, 0, 1, originOffset.x, originOffset.y]);
  }
  
  // Step 2: Skew
  if (obj.skewX !== 0 || obj.skewY !== 0) {
    const skewXRad = (obj.skewX * Math.PI) / 180;
    const skewYRad = (obj.skewY * Math.PI) / 180;
    matrix = multiplyMatrices(matrix, [1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0]);
  }
  
  // Step 3: Scale (with flips)
  const scaleX = obj.flipX ? -obj.scaleX : obj.scaleX;
  const scaleY = obj.flipY ? -obj.scaleY : obj.scaleY;
  if (scaleX !== 1 || scaleY !== 1) {
    matrix = multiplyMatrices(matrix, [scaleX, 0, 0, scaleY, 0, 0]);
  }
  
  // Step 4: Rotate
  if (obj.angle !== 0) {
    const rad = (obj.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    matrix = multiplyMatrices(matrix, [cos, sin, -sin, cos, 0, 0]);
  }
  
  // Step 5: Translate to final position
  // For top origin, we need to adjust because pdf-lib draws upward from the given Y
  // The origin is at the top edge, so we need to subtract height to position correctly
  let translateY = pdfOriginY;
  if (originY === 'top') {
    translateY -= objHeight;
  }
  matrix = multiplyMatrices(matrix, [1, 0, 0, 1, obj.left, translateY]);

  // Apply the transformation matrix to the page
  const [a, b, c, d, e, f] = matrix;
  page.pushOperators(concatTransformationMatrix(a, b, c, d, e, f));
}

// Re-export all transform utilities
export * from './matrix';
export * from './coordinate';
export * from './origin';
