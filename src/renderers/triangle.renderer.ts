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
    // Fabric.js triangle always points upward (point at top, base at bottom)
    //
    // The key insight: in Fabric.js (Y-down), the point is at the top (lower Y)
    // and base is at the bottom (higher Y). In PDF (Y-up), this is reversed.
    //
    // For center origin:
    //   - Origin is at bbox center
    //   - Point should be at center - height/2 (in Fabric Y-down coords)
    //   - In PDF: point has HIGHER Y than center (pointing up)
    //   - Path: point at (width/2, height), base at y=0
    //
    // For left/top origin:
    //   - Origin is at bbox TOP (in Fabric Y-down coords)
    //   - Point should be at origin (top of bbox)
    //   - In PDF: point should have the SAME Y as origin (highest Y in bbox)
    //   - Path: point at (width/2, 0), base at y=height
    const width = obj.width;
    const height = obj.height;

    // Check origin to determine path orientation
    const originY = obj.originY ?? 'top';

    let path: string;
    if (originY === 'center') {
      // Center origin: point at higher Y (pointing up in PDF)
      // After origin offset (-width/2, -height/2), bbox center is at origin
      // Point at (width/2, height) -> after offset -> (0, height/2) -> above center
      path = `M ${width / 2} ${height} L 0 0 L ${width} 0 Z`;
    } else {
      // Top origin (or default): origin is at bbox TOP
      // We want the point at the origin (top of bbox)
      // In PNG (Y-down), point should have LOWER Y than base to point UP
      // After origin offset (0, 0), local (0,0) is at origin
      // Point at local y=0 -> PDF y=pdfY -> PNG y=pageHeight-pdfY=top
      // Base at local y=-height -> PDF y=pdfY-height -> PNG y=pageHeight-(pdfY-height)=top+height
      path = `M ${width / 2} 0 L 0 ${-height} L ${width} ${-height} Z`;
    }

    page.drawSvgPath(path, {
      color: pdfFillColor,
      borderColor: pdfStrokeColor,
      borderWidth: pdfStrokeColor ? obj.strokeWidth : 0,
    });
  }
}
