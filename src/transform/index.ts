// Transform utilities: matrix math, coordinate conversion, origin resolution

import { concatTransformationMatrix } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { FabricObject, RenderContext } from '../types';
import { composeMatrix } from './matrix';

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

  // Convert Fabric Y (top-down) to PDF Y (bottom-up)
  // In Fabric: obj.top is distance from top of canvas
  // In PDF: we need distance from bottom of page
  // We also need to account for the object's height because Fabric positions
  // from the top-left corner, but after our transformation we want to draw
  // from the bottom-left
  const pdfY = context.options.pageHeight - obj.top - objHeight;

  // Build transformation matrix from object properties
  const matrix = composeMatrix({
    translateX: obj.left,
    translateY: pdfY,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    angle: obj.angle,
    skewX: obj.skewX,
    skewY: obj.skewY,
    flipX: obj.flipX,
    flipY: obj.flipY,
  });

  // Apply the transformation matrix to the page using pushOperators
  // pdf-lib's concatTransformationMatrix: [a, b, c, d, e, f]
  const [a, b, c, d, e, f] = matrix;
  page.pushOperators(concatTransformationMatrix(a, b, c, d, e, f));
}

// Re-export all transform utilities
export * from './matrix';
export * from './coordinate';
export * from './origin';
