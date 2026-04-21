import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricTextObject, RenderContext } from '../types';
import { parseColor } from '../color';
import { getTextWidth, getBaselineOffset } from '../fonts/font-metrics';

/**
 * Renderer for Fabric.js text objects (text, i-text, textbox).
 * Handles single/multi-line text with alignment and styling.
 * 
 * Coordinate System:
 * - The transformation matrix positions us at the bottom-left of the text box
 * - We need to draw text upward from there
 * - PDF Y increases upward, so positive Y moves up
 */
export class TextRenderer extends BaseRenderer {
  readonly type = 'text';

  canRender(obj: { type: string }): boolean {
    return obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox';
  }

  async renderObject(
    obj: FabricTextObject,
    page: PDFPage,
    context: RenderContext,
  ): Promise<void> {
    try {
      // Resolve the font
      const font = await context.fontManager.resolve(
        obj.fontFamily,
        obj.fontWeight,
        obj.fontStyle,
      );

      // Parse text color
      const fillColor = parseColor(obj.fill);
      const pdfColor = fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined;

      // Split text into lines
      const lines = obj.text.split('\n');

      // Calculate line height in points
      const lineHeight = obj.fontSize * obj.lineHeight;

      // Get baseline offset for proper vertical positioning
      const baselineOffset = getBaselineOffset(font, obj.fontSize);

      // Render each line
      // Lines stack upward from the bottom of the text box
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        
        // Calculate line Y position
        // First line is at the bottom (highest Y in PDF coordinates)
        // Each subsequent line moves down (lower Y in PDF)
        const lineY = (lines.length - 1 - i) * lineHeight + baselineOffset;

        // Calculate horizontal position based on alignment
        let xOffset = 0;
        if (obj.textAlign !== 'left') {
          const lineWidth = getTextWidth(font, line, obj.fontSize);
          if (obj.textAlign === 'center') {
            xOffset = (obj.width - lineWidth) / 2;
          } else if (obj.textAlign === 'right') {
            xOffset = obj.width - lineWidth;
          }
        }

        // Draw the line
        page.drawText(line, {
          x: xOffset,
          y: lineY,
          size: obj.fontSize,
          font,
          color: pdfColor,
        });
      }
    } catch (error) {
      // Add warning and skip this text object
      context.warnings.add({
        type: 'font_missing',
        objectType: obj.type,
        objectIndex: -1,
        feature: 'text_rendering',
        message: `Failed to render text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
