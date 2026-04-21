import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricRectObject, RenderContext } from '../types';
import { parseColor } from '../color';
import { drawSvgPathInCanvas } from './draw-helpers';

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

    const path = this.generateRoundedRectPath(width, height, rx, ry);

    drawSvgPathInCanvas(page, path, {
      color: fillColor,
      borderColor: strokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }

  /**
   * Generate an SVG path for a rounded rectangle in canvas-Y-down local coords:
   *   (0, 0) = top-left of bbox, (w, h) = bottom-right.
   *
   * Sweep-flag = 1 (clockwise) is the natural direction around each corner
   * when Y points down, matching the canvas view.
   */
  private generateRoundedRectPath(
    width: number,
    height: number,
    rx: number,
    ry: number,
  ): string {
    if (rx === 0 || ry === 0) {
      return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
    }

    let path = `M ${rx} 0`;
    path += ` L ${width - rx} 0`;
    path += ` A ${rx} ${ry} 0 0 1 ${width} ${ry}`;
    path += ` L ${width} ${height - ry}`;
    path += ` A ${rx} ${ry} 0 0 1 ${width - rx} ${height}`;
    path += ` L ${rx} ${height}`;
    path += ` A ${rx} ${ry} 0 0 1 0 ${height - ry}`;
    path += ` L 0 ${ry}`;
    path += ` A ${rx} ${ry} 0 0 1 ${rx} 0`;
    path += ' Z';

    return path;
  }
}
