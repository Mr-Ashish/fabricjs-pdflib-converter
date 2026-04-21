import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricPolylineObject, RenderContext } from '../types';
import { parseColor } from '../color';
import { pointsToSvgPath } from '../core/path-utils';
import { drawSvgPathInCanvas } from './draw-helpers';

/**
 * Renderer for Fabric.js polyline objects.
 * Converts points array to an open SVG path and renders via pdf-lib.
 */
export class PolylineRenderer extends BaseRenderer {
  readonly type = 'polyline';

  renderObject(
    obj: FabricPolylineObject,
    page: PDFPage,
    context: RenderContext,
  ): void {
    // Parse colors
    const fillColor = parseColor(obj.fill);
    const strokeColor = parseColor(obj.stroke);

    // If no fill and no stroke, skip rendering
    if (!fillColor && (!strokeColor || obj.strokeWidth === 0)) {
      return;
    }

    // Skip if no points
    if (!obj.points || obj.points.length === 0) {
      return;
    }

    // Convert to pdf-lib RGB format
    const pdfFillColor = fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined;
    const pdfStrokeColor = strokeColor ? rgb(strokeColor.r, strokeColor.g, strokeColor.b) : undefined;

    // Convert points to open SVG path (false = don't close path)
    const svgPath = pointsToSvgPath(obj.points, false);

    // Skip if path is empty
    if (!svgPath || svgPath.trim().length === 0) {
      return;
    }

    drawSvgPathInCanvas(page, svgPath, {
      color: pdfFillColor,
      borderColor: pdfStrokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }
}
