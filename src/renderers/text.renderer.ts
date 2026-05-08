import { rgb, PDFOperator, PDFNumber, PDFOperatorNames } from 'pdf-lib';
import type { PDFPage, PDFFont } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type {
  FabricITextObject,
  FabricTextObject,
  FabricTextboxObject,
  FabricTextStyles,
  FontStyle,
  FontWeight,
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
 * Effective per-character style after merging Fabric's per-char overrides
 * over the base text object's properties. This is what we group consecutive
 * characters by to form "runs" — adjacent characters with identical
 * effective style render together as a single drawText call.
 */
interface EffectiveCharStyle {
  fill: string | null;
  fontSize: number;
  fontFamily: string;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  underline: boolean;
  linethrough: boolean;
  overline: boolean;
  textBackgroundColor: string | null;
}

function effectiveStyleKey(s: EffectiveCharStyle): string {
  return `${String(s.fill)}|${s.fontSize}|${s.fontFamily}|${String(s.fontWeight)}|${s.fontStyle}|${String(s.underline)}|${String(s.linethrough)}|${String(s.overline)}|${String(s.textBackgroundColor)}`;
}

/**
 * Build per-line "runs" — maximal sequences of consecutive characters whose
 * effective style is identical. When the line has no `styles` overrides, we
 * fast-path to a single run covering the whole line so the no-styles case
 * stays bit-identical to the pre-refactor behavior (one drawText per line).
 */
function buildStyleRuns(
  line: string,
  lineIndex: number,
  obj: AnyFabricText,
): Array<{ text: string; style: EffectiveCharStyle }> {
  const lineStyles = (obj.styles as FabricTextStyles)?.[lineIndex.toString()] ?? {};
  const hasAnyOverride = Object.keys(lineStyles).length > 0;

  const baseStyle: EffectiveCharStyle = {
    fill: typeof obj.fill === 'string' ? obj.fill : null,
    fontSize: obj.fontSize,
    fontFamily: obj.fontFamily,
    fontWeight: obj.fontWeight,
    fontStyle: obj.fontStyle,
    underline: obj.underline,
    linethrough: obj.linethrough,
    overline: obj.overline,
    textBackgroundColor: obj.textBackgroundColor,
  };

  if (!hasAnyOverride) {
    return [{ text: line, style: baseStyle }];
  }

  const runs: Array<{ text: string; style: EffectiveCharStyle }> = [];
  let current: { text: string; style: EffectiveCharStyle } | null = null;

  for (let j = 0; j < line.length; j++) {
    const charOverride = lineStyles[j.toString()] ?? {};
    const effective: EffectiveCharStyle = {
      fill: charOverride.fill ?? baseStyle.fill,
      fontSize: charOverride.fontSize ?? baseStyle.fontSize,
      fontFamily: charOverride.fontFamily ?? baseStyle.fontFamily,
      fontWeight: charOverride.fontWeight ?? baseStyle.fontWeight,
      fontStyle: charOverride.fontStyle ?? baseStyle.fontStyle,
      underline: charOverride.underline ?? baseStyle.underline,
      linethrough: charOverride.linethrough ?? baseStyle.linethrough,
      overline: charOverride.overline ?? baseStyle.overline,
      textBackgroundColor: charOverride.textBackgroundColor ?? baseStyle.textBackgroundColor,
    };

    const key = effectiveStyleKey(effective);
    if (current && effectiveStyleKey(current.style) === key) {
      current.text += line[j];
    } else {
      if (current) runs.push(current);
      current = { text: line[j]!, style: effective };
    }
  }
  if (current) runs.push(current);
  return runs;
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
      // Resolve the base font once for textbox wrapping. Per-run fonts are
      // resolved inside the loop with caching so identical (family, weight,
      // style) tuples don't trigger redundant resolve() calls.
      const font = await context.fontManager.resolve(
        obj.fontFamily,
        obj.fontWeight,
        obj.fontStyle,
      );

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
      // Shared across all lines so identical (family, weight, style) tuples
      // that appear on multiple lines don't trigger redundant resolve() calls.
      const fontCache = new Map<string, PDFFont>();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const baselineY = firstBaselineY + i * lineHeightPx;

        const runs = buildStyleRuns(line, i, obj);
        const resolvedRuns: Array<{
          text: string;
          style: EffectiveCharStyle;
          font: PDFFont;
          width: number;
        }> = [];

        for (const run of runs) {
          const cacheKey = `${run.style.fontFamily}:${String(run.style.fontWeight)}:${run.style.fontStyle}`;
          let runFont = fontCache.get(cacheKey);
          if (!runFont) {
            runFont = await context.fontManager.resolve(
              run.style.fontFamily,
              run.style.fontWeight,
              run.style.fontStyle,
            );
            fontCache.set(cacheKey, runFont);
          }
          const runWidth = getTextWidth(runFont, run.text, run.style.fontSize);
          resolvedRuns.push({ text: run.text, style: run.style, font: runFont, width: runWidth });
        }

        const totalLineWidth = resolvedRuns.reduce((sum, r) => sum + r.width, 0);

        let xOffset = 0;
        let wordSpacingPt = 0;

        if (obj.textAlign === 'justify') {
          const isLastLine = i === lines.length - 1;
          const spaceCount = line.split(' ').length - 1;
          // Tw (word spacing) only applies cleanly to a single uniformly-styled
          // run. With mixed styles per line, justify falls back to left-aligned
          // (no Tw emitted) — matching what Fabric does on canvas anyway.
          if (!isLastLine && spaceCount > 0 && resolvedRuns.length === 1) {
            wordSpacingPt = Math.max(0, (obj.width - totalLineWidth) / spaceCount);
          }
          // justify last line = left-aligned, xOffset stays 0
        } else if (obj.textAlign === 'center') {
          xOffset = (obj.width - totalLineWidth) / 2;
        } else if (obj.textAlign === 'right') {
          xOffset = obj.width - totalLineWidth;
        }

        if (wordSpacingPt !== 0) {
          page.pushOperators(PDFOperator.of(PDFOperatorNames.SetWordSpacing, [PDFNumber.of(wordSpacingPt)]));
        }

        // Draw each run with its own font, color, char-spacing, background,
        // and decorations, advancing xCursor by the run's width.
        let xCursor = xOffset;

        for (const rr of resolvedRuns) {
          const runFillColor = parseColor(rr.style.fill);
          const runPdfColor = runFillColor ? rgb(runFillColor.r, runFillColor.g, runFillColor.b) : undefined;
          // charSpacing is an object-level property (not per-character in Fabric's schema)
          const runCharSpacingPt =
            obj.charSpacing !== 0 ? (obj.charSpacing / 1000) * rr.style.fontSize : 0;

          // Background (drawn before text so it appears behind glyphs)
          if (rr.style.textBackgroundColor) {
            drawTextBackground(
              page,
              xCursor,
              baselineY,
              lineHeightPx,
              rr.style.fontSize,
              rr.width,
              rr.style.textBackgroundColor,
            );
          }

          if (runCharSpacingPt !== 0) {
            page.pushOperators(PDFOperator.of(PDFOperatorNames.SetCharacterSpacing, [PDFNumber.of(runCharSpacingPt)]));
          }

          drawTextInCanvas(page, rr.text, {
            x: xCursor,
            y: baselineY,
            size: rr.style.fontSize,
            font: rr.font,
            color: runPdfColor,
          });

          if (runCharSpacingPt !== 0) {
            page.pushOperators(PDFOperator.of(PDFOperatorNames.SetCharacterSpacing, [PDFNumber.of(0)]));
          }

          // Decorations (drawn after text so they render on top)
          drawTextDecorations(page, xCursor, baselineY, rr.style.fontSize, rr.width, runPdfColor, {
            underline: rr.style.underline,
            linethrough: rr.style.linethrough,
            overline: rr.style.overline,
          });

          xCursor += rr.width;
        }

        if (wordSpacingPt !== 0) {
          page.pushOperators(PDFOperator.of(PDFOperatorNames.SetWordSpacing, [PDFNumber.of(0)]));
        }
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
