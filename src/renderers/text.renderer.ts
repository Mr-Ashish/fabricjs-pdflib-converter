import { rgb, PDFOperator, PDFNumber, PDFOperatorNames } from 'pdf-lib';
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
import { drawTextInCanvas, drawSvgPathInCanvas } from './draw-helpers';

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

function normalizeType(type: string): string {
  const compact = type.trim().replace(/[_\s]+/g, '-').toLowerCase();
  if (compact === 'itext') return 'i-text';
  return compact;
}

function drawTextBackground(
  page: PDFPage,
  xOffset: number,
  baselineY: number,
  lineHeightPx: number,
  fontSize: number,
  lineWidth: number,
  backgroundColor: string,
): void {
  const bgColor = parseColor(backgroundColor);
  if (bgColor) {
    const bgPdfColor = rgb(bgColor.r, bgColor.g, bgColor.b);
    const bgTop = baselineY - fontSize * FABRIC_FONT_SIZE_MULT;
    drawSvgPathInCanvas(page,
      `M ${xOffset} ${bgTop} h ${lineWidth} v ${lineHeightPx} h ${-lineWidth} Z`,
      { color: bgPdfColor },
    );
  }
}

function drawTextDecorations(
  page: PDFPage,
  xOffset: number,
  baselineY: number,
  fontSize: number,
  lineWidth: number,
  pdfColor: ReturnType<typeof rgb> | undefined,
  options: {
    underline?: boolean;
    linethrough?: boolean;
    overline?: boolean;
  },
): void {
  const thickness = Math.max(1, fontSize / 15);

  if (options.underline) {
    const y = baselineY + fontSize * 0.07;
    drawSvgPathInCanvas(page,
      `M ${xOffset} ${y} h ${lineWidth} v ${thickness} h ${-lineWidth} Z`,
      { color: pdfColor },
    );
  }

  if (options.linethrough) {
    const y = baselineY - fontSize * 0.35;
    drawSvgPathInCanvas(page,
      `M ${xOffset} ${y} h ${lineWidth} v ${thickness} h ${-lineWidth} Z`,
      { color: pdfColor },
    );
  }

  if (options.overline) {
    const y = baselineY - fontSize * 0.85;
    drawSvgPathInCanvas(page,
      `M ${xOffset} ${y} h ${lineWidth} v ${thickness} h ${-lineWidth} Z`,
      { color: pdfColor },
    );
  }
}

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
    const normalizedType = normalizeType(obj.type);
    return normalizedType === 'text' || normalizedType === 'i-text' || normalizedType === 'textbox';
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

      const normalizedType = normalizeType(obj.type);
      const lines =
        normalizedType === 'textbox'
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
      const charSpacingPt = obj.charSpacing !== 0 ? (obj.charSpacing / 1000) * obj.fontSize : 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const baselineY = firstBaselineY + i * lineHeightPx;

        // Always compute lineWidth (needed for alignment, bg, and decorations)
        const lineWidth = getTextWidth(font, line, obj.fontSize);

        let xOffset = 0;
        let wordSpacingPt = 0;

        if (obj.textAlign === 'justify') {
          const isLastLine = i === lines.length - 1;
          const spaceCount = line.split(' ').length - 1;
          if (!isLastLine && spaceCount > 0) {
            wordSpacingPt = Math.max(0, (obj.width - lineWidth) / spaceCount);
          }
          // justify last line = left-aligned, xOffset stays 0
        } else if (obj.textAlign === 'center') {
          xOffset = (obj.width - lineWidth) / 2;
        } else if (obj.textAlign === 'right') {
          xOffset = obj.width - lineWidth;
        }

        // Background (drawn before text so it appears behind glyphs)
        if (obj.textBackgroundColor) {
          drawTextBackground(page, xOffset, baselineY, lineHeightPx, obj.fontSize, lineWidth, obj.textBackgroundColor);
        }

        if (charSpacingPt !== 0) {
          page.pushOperators(PDFOperator.of(PDFOperatorNames.SetCharacterSpacing, [PDFNumber.of(charSpacingPt)]));
        }

        if (wordSpacingPt !== 0) {
          page.pushOperators(PDFOperator.of(PDFOperatorNames.SetWordSpacing, [PDFNumber.of(wordSpacingPt)]));
        }

        drawTextInCanvas(page, line, {
          x: xOffset,
          y: baselineY,
          size: obj.fontSize,
          font,
          color: pdfColor,
        });

        if (charSpacingPt !== 0) {
          page.pushOperators(PDFOperator.of(PDFOperatorNames.SetCharacterSpacing, [PDFNumber.of(0)]));
        }

        if (wordSpacingPt !== 0) {
          page.pushOperators(PDFOperator.of(PDFOperatorNames.SetWordSpacing, [PDFNumber.of(0)]));
        }

        // Decorations (drawn after text so they render on top)
        drawTextDecorations(page, xOffset, baselineY, obj.fontSize, lineWidth, pdfColor, {
          underline: obj.underline,
          linethrough: obj.linethrough,
          overline: obj.overline,
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
