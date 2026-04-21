import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricLineObject, RenderContext } from '../types';
import { parseColor } from '../color';

/**
 * Renderer for Fabric.js line objects.
 *
 * Fabric serializes line endpoints `x1,y1,x2,y2` in a *center-normalized*
 * local frame: they are canvas-space offsets from the line's own center,
 * independent of `left/top/originX/originY`. For a line with bbox width W
 * and height H, the endpoints always satisfy
 *   min(x1, x2) = -W/2,   max(x1, x2) = +W/2
 *   min(y1, y2) = -H/2,   max(y1, y2) = +H/2
 *
 * Our transform layer sets up a canvas-local frame whose origin is at the
 * TOP-LEFT of the bbox (after originX/originY resolution). To draw the
 * endpoints in that frame we shift them by (W/2, H/2):
 *   local_x = x + W/2
 *   local_y = y + H/2
 *
 * `drawLine` uses moveTo/lineTo directly in the caller frame (no hidden
 * Y-flip), so a canvas-Y-down frame renders the line exactly as Fabric
 * shows it on screen.
 */
export class LineRenderer extends BaseRenderer {
  readonly type = 'line';

  renderObject(
    obj: FabricLineObject,
    page: PDFPage,
    context: RenderContext,
  ): void {
    const strokeColor = parseColor(obj.stroke);
    if (!strokeColor || obj.strokeWidth === 0) {
      return;
    }

    const pdfStrokeColor = rgb(strokeColor.r, strokeColor.g, strokeColor.b);

    const halfW = (obj.width ?? 0) / 2;
    const halfH = (obj.height ?? 0) / 2;

    const x1 = obj.x1 + halfW;
    const y1 = obj.y1 + halfH;
    const x2 = obj.x2 + halfW;
    const y2 = obj.y2 + halfH;

    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: obj.strokeWidth,
      color: pdfStrokeColor,
    });
  }
}
