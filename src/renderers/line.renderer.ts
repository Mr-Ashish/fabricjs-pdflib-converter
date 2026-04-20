import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricLineObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js line objects.
 * Uses pdf-lib's drawLine for straight lines.
 */
export class LineRenderer extends BaseRenderer {
  readonly type = 'line';

  renderObject(
    obj: FabricLineObject,
    page: PDFPage,
    context: RenderContext,
  ): void {
    // Parse stroke color
    const strokeColor = parseColor(obj.stroke);

    // Lines need stroke to be visible
    if (!strokeColor || obj.strokeWidth === 0) {
      return;
    }

    // Convert to pdf-lib RGB format
    const pdfStrokeColor = rgb(strokeColor.r, strokeColor.g, strokeColor.b);

    // Get line endpoints (already in local coordinates relative to center)
    const x1 = obj.x1 * obj.scaleX;
    const y1 = obj.y1 * obj.scaleY;
    const x2 = obj.x2 * obj.scaleX;
    const y2 = obj.y2 * obj.scaleY;

    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: obj.strokeWidth,
      color: pdfStrokeColor,
    });
  }
}
