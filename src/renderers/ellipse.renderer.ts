import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricEllipseObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js ellipse objects.
 * Uses pdf-lib's drawEllipse with xScale/yScale.
 * 
 * Note: Scaling is applied via the transformation matrix in applyTransformations,
 * so we use the original rx/ry without multiplying by scaleX/scaleY.
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

    // Use original radii - scaling is handled by transformation matrix
    const xRadius = obj.rx ?? 0;
    const yRadius = obj.ry ?? 0;

    // Skip if either radius is zero
    if (xRadius === 0 || yRadius === 0) {
      return;
    }

    // pdf-lib's drawEllipse centers at (x, y) with xScale/yScale as radii
    // We draw at (0, 0) and let the transformation matrix handle positioning
    page.drawEllipse({
      x: 0,
      y: 0,
      xScale: xRadius,
      yScale: yRadius,
      color: pdfFillColor,
      borderColor: pdfStrokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }
}
