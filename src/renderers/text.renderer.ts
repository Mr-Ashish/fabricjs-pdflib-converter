import { rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type {
  FabricITextObject,
  FabricTextObject,
  FabricTextboxObject,
  RenderContext,
} from '../types';
import { parseColor } from '../color';
import { getTextWidth } from '../fonts/font-metrics';
import { wrapTextbox } from '../fonts/text-wrap';
import { drawTextInCanvas } from './draw-helpers';

/**
 * Fabric's hard-coded `_fontSizeMult` constant (see `Text` class in fabric.js
 * v5/v6). Fabric inflates every line's vertical extent by this factor so
 * descenders never get clipped, AND shifts the first baseline down by the
 * same factor. Both Fabric's bbox `height` and its baseline positioning bake
 * this in — so if we want our PDF to sit at the same Y inside the textbox
 * bbox as the canvas did, we must apply it too. Without it, text renders
 * ~13% of fontSize too high, visibly climbing out of the bbox top.
 */
const FABRIC_FONT_SIZE_MULT = 1.13;

/**
 * Union of all Fabric text-like objects this renderer handles. Using a
 * discriminated union lets TypeScript narrow on `obj.type` so we can branch
 * safely into textbox-specific properties (like `splitByGrapheme`).
 */
type AnyFabricText = FabricTextObject | FabricITextObject | FabricTextboxObject;

/**
 * Renderer for Fabric.js text objects (text, i-text, textbox).
 *
 * COORDINATE FRAME
 * ----------------
 * After `applyTransformations`, we draw in canvas-local Y-DOWN with origin
 * at the top-left of the text box's bbox. Lines stack downward:
 *   line 0 occupies y ∈ [0, lineHeight]
 *   line 1 occupies y ∈ [lineHeight, 2·lineHeight]
 *   ...
 *
 * For each line we pass the baseline Y (in canvas-Y-down) to
 * `drawTextInCanvas`, which locally cancels the outer Y-flip so glyphs
 * render right-side-up.
 */
export class TextRenderer extends BaseRenderer {
  readonly type = 'text';

  canRender(obj: { type: string }): boolean {
    return obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox';
  }

  async renderObject(
    obj: AnyFabricText,
    page: PDFPage,
    context: RenderContext,
  ): Promise<void> {
    try {
      const font = await context.fontManager.resolve(
        obj.fontFamily,
        obj.fontWeight,
        obj.fontStyle,
      );

      const fillColor = parseColor(obj.fill);
      const pdfColor = fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined;

      const lines =
        obj.type === 'textbox'
          ? wrapTextbox(obj.text, obj.width, {
              font,
              fontSize: obj.fontSize,
              charSpacing: obj.charSpacing,
              splitByGrapheme: obj.splitByGrapheme,
            })
          : obj.text.split('\n');
      // Match Fabric's line math exactly:
      //   heightOfLine  = fontSize * lineHeight * _fontSizeMult
      //   baselineY[0]  = fontSize * _fontSizeMult           (from bbox top)
      //   baselineY[i]  = baselineY[0] + i * heightOfLine
      // See `Text.getHeightOfLine` and `Text._renderTextCommon` in fabric.js.
      const lineHeightPx = obj.fontSize * obj.lineHeight * FABRIC_FONT_SIZE_MULT;
      const firstBaselineY = obj.fontSize * FABRIC_FONT_SIZE_MULT;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;

        const baselineY = firstBaselineY + i * lineHeightPx;

        let xOffset = 0;
        if (obj.textAlign !== 'left') {
          const lineWidth = getTextWidth(font, line, obj.fontSize);
          if (obj.textAlign === 'center') {
            xOffset = (obj.width - lineWidth) / 2;
          } else if (obj.textAlign === 'right') {
            xOffset = obj.width - lineWidth;
          }
        }

        drawTextInCanvas(page, line, {
          x: xOffset,
          y: baselineY,
          size: obj.fontSize,
          font,
          color: pdfColor,
        });
      }
    } catch (error) {
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
