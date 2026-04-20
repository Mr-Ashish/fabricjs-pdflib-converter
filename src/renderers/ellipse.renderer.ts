import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricEllipseObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js ellipse objects.
 * Uses pdf-lib's drawEllipse with xScale/yScale.
 */
export class EllipseRenderer extends BaseRenderer {
  readonly type = 'ellipse';

  renderObject(
    obj: FabricEllipseObject,
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

    // Convert to pdf-lib RGB format
    const pdfFillColor = fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined;
    const pdfStrokeColor = strokeColor ? rgb(strokeColor.r, strokeColor.g, strokeColor.b) : undefined;

    // Calculate scaled radii
    const xScale = (obj.rx ?? 0) * Math.abs(obj.scaleX);
    const yScale = (obj.ry ?? 0) * Math.abs(obj.scaleY);

    // Skip if either radius is zero
    if (xScale === 0 || yScale === 0) {
      return;
    }

    page.drawEllipse({
      xScale,
      yScale,
      color: pdfFillColor,
      borderColor: pdfStrokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }
}
