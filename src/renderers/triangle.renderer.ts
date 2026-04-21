import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricTriangleObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js triangle objects.
 * 
 * Note: Scaling is applied via the transformation matrix in applyTransformations,
 * so we use the original width/height without multiplying by scaleX/scaleY.
 */
export class TriangleRenderer extends BaseRenderer {
  readonly type = 'triangle';

  renderObject(
    obj: FabricTriangleObject,
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

    // Generate triangle path
    // Fabric.js triangle: pointing up, centered, with given width/height
    const width = obj.width;
    const height = obj.height;

    // Triangle points (pointing up)
    // Top point at (width/2, 0)
    // Bottom left at (0, height)
    // Bottom right at (width, height)
    const path = `M ${width / 2} 0 L 0 ${height} L ${width} ${height} Z`;

    page.drawSvgPath(path, {
      color: pdfFillColor,
      borderColor: pdfStrokeColor,
      borderWidth: pdfStrokeColor ? obj.strokeWidth : 0,
    });
  }
}
