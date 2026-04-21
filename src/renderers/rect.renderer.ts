import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricRectObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js rectangle objects.
 * Handles both basic rectangles and rounded corner rectangles.
 * 
 * Note: Scaling is applied via the transformation matrix in applyTransformations,
 * so we use the original width/height without multiplying by scaleX/scaleY.
 */
export class RectRenderer extends BaseRenderer {
  readonly type = 'rect';

  renderObject(
    obj: FabricRectObject,
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

    // Check if rounded corners
    const hasRoundedCorners = (obj.rx ?? 0) > 0 || (obj.ry ?? 0) > 0;

    if (hasRoundedCorners) {
      this.renderRoundedRect(obj, page, pdfFillColor, pdfStrokeColor);
    } else {
      this.renderBasicRect(obj, page, pdfFillColor, pdfStrokeColor);
    }
  }

  /**
   * Render a basic rectangle using pdf-lib's drawRectangle.
   * Dimensions are NOT multiplied by scale - scaling is handled by the transformation matrix.
   */
  private renderBasicRect(
    obj: FabricRectObject,
    page: PDFPage,
    fillColor: ReturnType<typeof rgb> | undefined,
    strokeColor: ReturnType<typeof rgb> | undefined,
  ): void {
    // Draw at (0, 0) - the transformation matrix handles positioning
    page.drawRectangle({
      x: 0,
      y: 0,
      width: obj.width,
      height: obj.height,
      color: fillColor,
      borderColor: strokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }

  /**
   * Render a rounded rectangle using SVG path.
   * Dimensions are NOT multiplied by scale - scaling is handled by the transformation matrix.
   */
  private renderRoundedRect(
    obj: FabricRectObject,
    page: PDFPage,
    fillColor: ReturnType<typeof rgb> | undefined,
    strokeColor: ReturnType<typeof rgb> | undefined,
  ): void {
    const width = obj.width;
    const height = obj.height;
    const rx = Math.min((obj.rx ?? 0), width / 2);
    const ry = Math.min((obj.ry ?? 0), height / 2);

    // Generate SVG path for rounded rectangle
    const path = this.generateRoundedRectPath(width, height, rx, ry);

    page.drawSvgPath(path, {
      color: fillColor,
      borderColor: strokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }

  /**
   * Generate SVG path string for a rounded rectangle.
   * Uses arc commands for the corners.
   */
  private generateRoundedRectPath(
    width: number,
    height: number,
    rx: number,
    ry: number,
  ): string {
    // If no rounding, use simple rect path
    if (rx === 0 || ry === 0) {
      return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
    }

    // Build path with rounded corners
    // Start at top-left, after the corner arc
    let path = `M 0 ${ry}`;

    // Top edge to top-right corner
    path += ` L 0 ${height - ry}`;
    // Bottom-left corner arc
    path += ` A ${rx} ${ry} 0 0 0 ${rx} ${height}`;
    // Bottom edge to bottom-right
    path += ` L ${width - rx} ${height}`;
    // Bottom-right corner arc
    path += ` A ${rx} ${ry} 0 0 0 ${width} ${height - ry}`;
    // Right edge to top-right
    path += ` L ${width} ${ry}`;
    // Top-right corner arc
    path += ` A ${rx} ${ry} 0 0 0 ${width - rx} 0`;
    // Top edge to top-left
    path += ` L ${rx} 0`;
    // Top-left corner arc
    path += ` A ${rx} ${ry} 0 0 0 0 ${ry}`;

    // Close path
    path += ' Z';

    return path;
  }
}
