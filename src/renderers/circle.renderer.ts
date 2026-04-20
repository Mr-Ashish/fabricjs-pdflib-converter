import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricCircleObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js circle objects.
 * Handles full circles and partial arcs.
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

    // Check if it's a full circle or partial arc
    const startAngle = obj.startAngle ?? 0;
    const endAngle = obj.endAngle ?? 360;
    const isFullCircle = Math.abs(endAngle - startAngle) >= 360;

    if (isFullCircle) {
      this.renderFullCircle(obj, page, pdfFillColor, pdfStrokeColor);
    } else {
      this.renderArc(obj, page, pdfFillColor, pdfStrokeColor, startAngle, endAngle);
    }
  }

  /**
   * Render a full circle using pdf-lib's drawCircle.
   */
  private renderFullCircle(
    obj: FabricCircleObject,
    page: PDFPage,
    fillColor: ReturnType<typeof rgb> | undefined,
    strokeColor: ReturnType<typeof rgb> | undefined,
  ): void {
    const radius = obj.radius * Math.abs(obj.scaleX);

    page.drawCircle({
      size: radius * 2, // pdf-lib uses diameter, not radius
      color: fillColor,
      borderColor: strokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }

  /**
   * Render a partial arc using SVG path.
   */
  private renderArc(
    obj: FabricCircleObject,
    page: PDFPage,
    fillColor: ReturnType<typeof rgb> | undefined,
    strokeColor: ReturnType<typeof rgb> | undefined,
    startAngle: number,
    endAngle: number,
  ): void {
    const radius = obj.radius * Math.abs(obj.scaleX);

    // Generate SVG path for the arc
    const path = this.generateArcPath(radius, startAngle, endAngle);

    page.drawSvgPath(path, {
      color: fillColor,
      borderColor: strokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }

  /**
   * Generate SVG path for a circular arc.
   * Uses arc command: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
   */
  private generateArcPath(
    radius: number,
    startAngle: number,
    endAngle: number,
  ): string {
    // Convert angles from degrees to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate start and end points
    const x1 = radius * Math.cos(startRad);
    const y1 = radius * Math.sin(startRad);
    const x2 = radius * Math.cos(endRad);
    const y2 = radius * Math.sin(endRad);

    // Determine arc flags
    const angleDiff = endAngle - startAngle;
    const largeArcFlag = Math.abs(angleDiff) > 180 ? 1 : 0;
    const sweepFlag = angleDiff > 0 ? 1 : 0;

    // Build path: move to start, arc to end
    // For a pie slice (filled arc), we need to draw lines to center
    let path = `M 0 0 L ${x1} ${y1}`;
    path += ` A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`;
    path += ' Z';

    return path;
  }
}
