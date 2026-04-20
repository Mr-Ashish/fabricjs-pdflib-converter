// Transform utilities: matrix math, coordinate conversion, origin resolution

import { concatTransformationMatrix } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { FabricObject, RenderContext } from '../types';
import { composeMatrix } from './matrix';

/**
 * Applies Fabric.js object transformations to the PDF page.
 * This sets up the transformation matrix for rendering the object.
 *
 * @param obj - The Fabric object with transform properties
 * @param page - The PDF page to apply transformations to
 * @param context - The render context
 */
export function applyTransformations(
  obj: FabricObject,
  page: PDFPage,
  context: RenderContext,
): void {
  // Build transformation matrix from object properties
  const matrix = composeMatrix({
    translateX: obj.left,
    translateY: context.options.pageHeight - obj.top - (obj.height * obj.scaleY),
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
