import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricTriangleObject, RenderContext } from '../types';
import { parseColor } from '../color';
import { drawSvgPathInCanvas } from './draw-helpers';

/**
 * Renderer for Fabric.js triangle objects.
 *
 * Fabric's triangle always points UP visually (tip at the top of its bbox,
 * base along the bottom). In our canvas-local Y-down frame that's:
 *   tip  = (width/2, 0)      // top of bbox
 *   base = (0, height), (width, height)
 *
 * Object-level scaling, rotation and positioning are all applied by the
 * transform layer, so we use intrinsic width/height here.
 */
export class TriangleRenderer extends BaseRenderer {
  readonly type = 'triangle';

  renderObject(
    obj: FabricTriangleObject,
    page: PDFPage,
    context: RenderContext,
  ): void {
    const fillColor = parseColor(obj.fill);
    const strokeColor = parseColor(obj.stroke);

    if (!fillColor && (!strokeColor || obj.strokeWidth === 0)) {
      return;
    }

    const pdfFillColor = fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined;
    const pdfStrokeColor = strokeColor ? rgb(strokeColor.r, strokeColor.g, strokeColor.b) : undefined;

    const width = obj.width;
    const height = obj.height;

    // Canvas-Y-down: y=0 is TOP, y=height is BOTTOM.
    const path = `M ${width / 2} 0 L 0 ${height} L ${width} ${height} Z`;

    drawSvgPathInCanvas(page, path, {
      color: pdfFillColor,
      borderColor: pdfStrokeColor,
      borderWidth: pdfStrokeColor ? obj.strokeWidth : 0,
    });
  }
}
