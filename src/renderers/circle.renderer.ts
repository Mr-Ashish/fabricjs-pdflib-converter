import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricCircleObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js circle objects.
 * 
 * Note: Scaling is applied via the transformation matrix in applyTransformations,
 * so we use the original radius without multiplying by scale.
 */
export class CircleRenderer extends BaseRenderer {
  readonly type = 'circle';

  renderObject(
    obj: FabricCircleObject,
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

    // Check if it's a full circle or an arc
    const isFullCircle = Math.abs((obj.endAngle ?? 360) - (obj.startAngle ?? 0)) >= 360;

    if (isFullCircle) {
      this.renderFullCircle(obj, page, pdfFillColor, pdfStrokeColor);
    } else {
      this.renderArc(obj, page, pdfFillColor, pdfStrokeColor);
    }
  }

  /**
   * Render a full circle.
   * Radius is NOT multiplied by scale - scaling is handled by the transformation matrix.
   *
   * Note: pdf-lib's drawCircle centers the circle at (x, y).
   * We draw at (radius, radius) so the circle's edge is at (0, 0), matching
   * how rectangles draw from their top-left corner.
   */
  private renderFullCircle(
    obj: FabricCircleObject,
    page: PDFPage,
    fillColor: ReturnType<typeof rgb> | undefined,
    strokeColor: ReturnType<typeof rgb> | undefined,
  ): void {
    const radius = obj.radius;

    // pdf-lib's drawCircle draws centered at (x, y) with size = radius (not diameter)
    // We draw at (radius, radius) so the circle's bounding box is from (0, 0) to (2*radius, 2*radius)
    // This matches how rectangles draw from their top-left corner
    page.drawCircle({
      x: radius,
      y: radius,
      size: radius,
      color: fillColor,
      borderColor: strokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }

  /**
   * Render a circular arc using SVG path.
   * Radius is NOT multiplied by scale - scaling is handled by the transformation matrix.
   */
  private renderArc(
    obj: FabricCircleObject,
    page: PDFPage,
    fillColor: ReturnType<typeof rgb> | undefined,
    strokeColor: ReturnType<typeof rgb> | undefined,
  ): void {
    const radius = obj.radius;
    const startAngle = (obj.startAngle ?? 0) * (Math.PI / 180);
    const endAngle = (obj.endAngle ?? 0) * (Math.PI / 180);

    // Calculate start and end points
    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);

    // Determine large arc flag
    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;

    // Build SVG path for arc
    const path = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    page.drawSvgPath(path, {
      color: fillColor,
      borderColor: strokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }
}
