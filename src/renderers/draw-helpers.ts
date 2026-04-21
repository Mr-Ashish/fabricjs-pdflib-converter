import type { PDFPage } from 'pdf-lib';
import {
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
} from 'pdf-lib';

/**
 * Draw an SVG path, interpreting path coordinates in the caller's
 * canvas-local (Y-DOWN) frame.
 *
 * WHY THIS WRAPPER EXISTS
 * -----------------------
 * pdf-lib's `page.drawSvgPath` internally applies `scale(1, -1)` (see
 * `node_modules/pdf-lib/.../operations.js` "SVG path Y axis is opposite
 * pdf-lib's"). That flip assumes the caller's frame is PDF's native Y-UP.
 *
 * Our transform layer (`applyTransformations`) establishes a canvas-local
 * Y-DOWN frame instead. If we call `page.drawSvgPath` directly from there,
 * pdf-lib's internal flip mirrors the path vertically, producing inverted
 * triangles, upside-down rounded corners, etc.
 *
 * We wrap the call with our own `scale(1, -1)` which CANCELS pdf-lib's
 * internal flip. Net effect: SVG path coordinates are rendered 1:1 in the
 * caller's canvas-Y-down frame. Write paths the way you'd write them for
 * the canvas (tip at y=0 = top, base at y=h = bottom).
 */
export function drawSvgPathInCanvas(
  page: PDFPage,
  path: string,
  options: Parameters<PDFPage['drawSvgPath']>[1],
): void {
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, -1, 0, 0));
  page.drawSvgPath(path, options);
  page.pushOperators(popGraphicsState());
}

/**
 * Draw text, interpreting x/y in the caller's canvas-local (Y-DOWN) frame.
 *
 * Our outer CTM has a negative Y scale so that +Y means "down" in canvas
 * view. pdf-lib's `drawText` writes glyphs upward from the baseline in its
 * local frame; under a negative Y scale the glyphs render upside-down.
 *
 * This helper flips Y locally (cancelling our outer Y flip for the text
 * subtree only) and adjusts the baseline so that `y` in the caller still
 * refers to the BASELINE's canvas-Y-down position.
 */
export function drawTextInCanvas(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
  } & Omit<NonNullable<Parameters<PDFPage['drawText']>[1]>, 'x' | 'y' | 'rotate'>,
): void {
  const { x, y, ...rest } = options;
  // cm: [1, 0, 0, -1, x, y] — move origin to (x, y) then flip Y.
  // After this, +Y in the text subtree corresponds to −Y in the caller
  // (canvas-Y-down) frame, which cancels the outer scale(1, -1).
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, -1, x, y));
  page.drawText(text, { x: 0, y: 0, ...rest });
  page.pushOperators(popGraphicsState());
}
