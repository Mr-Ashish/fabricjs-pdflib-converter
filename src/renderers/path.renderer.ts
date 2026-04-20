import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricPathObject, RenderContext } from '../types';
import { parseColor } from '../color';
import { pathCommandsToSvg } from '../core/path-utils';

/**
 * Renderer for Fabric.js path objects.
 * Converts Fabric path command arrays to SVG paths and renders via pdf-lib.
 */
export class PathRenderer extends BaseRenderer {
  readonly type = 'path';

  renderObject(
    obj: FabricPathObject,
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

    // Convert Fabric path commands to SVG path string
    const svgPath = pathCommandsToSvg(obj.path);

    // Skip if path is empty
    if (!svgPath || svgPath.trim().length === 0) {
      return;
    }

    page.drawSvgPath(svgPath, {
      color: pdfFillColor,
      borderColor: pdfStrokeColor,
      borderWidth: strokeColor ? obj.strokeWidth : 0,
    });
  }
}
