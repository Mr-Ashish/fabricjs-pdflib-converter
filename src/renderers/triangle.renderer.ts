import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricTriangleObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js triangle objects.
 * Generates an isosceles triangle using SVG path.
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

    // Calculate scaled dimensions
    const width = obj.width * obj.scaleX;
    const height = obj.height * obj.scaleY;

    // Skip if either dimension is zero
    if (width === 0 || height === 0) {
      return;
    }

    // Generate SVG path for isosceles triangle
    const path = this.generateTrianglePath(width, height);

    page.drawSvgPath(path, {
      color: pdfFillColor,
      borderColor: pdfStrokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }

  /**
   * Generate SVG path for an isosceles triangle.
   * Points: bottom-left, top-center, bottom-right
   */
  private generateTrianglePath(width: number, height: number): string {
    // Triangle vertices (isosceles pointing up)
    // Bottom-left: (0, height)
    // Top-center: (width/2, 0)
    // Bottom-right: (width, height)
    const halfWidth = width / 2;

    return `M 0 ${height} L ${halfWidth} 0 L ${width} ${height} Z`;
  }
}
