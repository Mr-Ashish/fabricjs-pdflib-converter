import type { PDFFont } from 'pdf-lib';

/**
 * Options that govern how a textbox measures and breaks lines.
 * Mirrors the inputs Fabric.js uses for its `Textbox._wrapLine` routine.
 */
export interface WrapOptions {
  /** Embedded PDF font used to measure glyph widths. */
  font: PDFFont;
  /** Font size in points. */
  fontSize: number;
  /** Fabric charSpacing in 1/1000 em. 0 means no extra tracking. */
  charSpacing: number;
  /**
   * When true, wrapping breaks at grapheme boundaries (matches Fabric's
   * `splitByGrapheme` mode, used for CJK and for hard char-by-char wrap).
   * When false, wrapping happens only at whitespace token boundaries and a
   * single word wider than the box overflows intact.
   */
  splitByGrapheme: boolean;
}

/**
 * Re-flow `text` into lines that fit inside `boxWidth`, matching Fabric.js's
 * Textbox wrapping semantics:
 *  - Split the raw string on `\n` first ("paragraphs").
 *  - Wrap each paragraph independently.
 *  - Preserve empty paragraphs as empty lines so vertical spacing is stable.
 *
 * @param text       Raw (unwrapped) text, may contain explicit `\n`.
 * @param boxWidth   Target width in points. Measured against `font` at `fontSize`.
 * @param opts       Font + measurement options.
 * @returns          One entry per visual line, in top-to-bottom order.
 */
export function wrapTextbox(text: string, boxWidth: number, opts: WrapOptions): string[] {
  if (text === '') return [''];

  const paragraphs = text.split('\n');
  const out: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      out.push('');
      continue;
    }
    for (const wrapped of wrapLine(paragraph, boxWidth, opts)) {
      out.push(wrapped);
    }
  }
  return out;
}

/**
 * Wrap a single paragraph (no embedded `\n`) into display lines.
 *
 * Algorithm is token-based to match Fabric:
 *   - Default mode: tokens are alternating word / whitespace runs.
 *     A word that by itself exceeds the box overflows the box rather than
 *     being broken mid-word.
 *   - `splitByGrapheme`: tokens are individual graphemes (code points). A
 *     long word WILL break at the first grapheme that overflows.
 *
 * Whitespace that would become the leading whitespace of a new wrapped line
 * is dropped, so a line never begins with spaces inherited from a soft break.
 */
function wrapLine(line: string, boxWidth: number, opts: WrapOptions): string[] {
  const tokens = tokenize(line, opts.splitByGrapheme);
  if (tokens.length === 0) return [''];

  const lines: string[] = [];
  let current = '';
  let currentWidth = 0;

  for (const token of tokens) {
    const tokenWidth = measureToken(token, opts);
    const isWhitespace = isWhitespaceToken(token);

    if (current !== '' && currentWidth + tokenWidth > boxWidth) {
      lines.push(current);
      if (isWhitespace) {
        current = '';
        currentWidth = 0;
        continue;
      }
      current = token;
      currentWidth = tokenWidth;
    } else {
      current += token;
      currentWidth += tokenWidth;
    }
  }

  if (current !== '' || lines.length === 0) {
    lines.push(current);
  }
  return lines;
}

/**
 * Split a line into tokens for wrapping.
 * Default: word runs alternate with whitespace runs (both kept, in order).
 * Grapheme mode: one token per code point.
 */
function tokenize(line: string, splitByGrapheme: boolean): string[] {
  if (splitByGrapheme) {
    return Array.from(line);
  }
  return line.split(/(\s+)/).filter((t) => t !== '');
}

function isWhitespaceToken(token: string): boolean {
  return /^\s+$/.test(token);
}

/**
 * Width of a token at the configured font/size, including Fabric-style
 * per-character tracking (`charSpacing` is 1/1000 em).
 *
 * We add `charSpacing` for every inter-character gap *inside* the token —
 * this matches Fabric's `_measureChar` behavior where each subsequent char
 * inherits the accumulated advance.
 */
function measureToken(token: string, opts: WrapOptions): number {
  const base = opts.font.widthOfTextAtSize(token, opts.fontSize);
  if (opts.charSpacing === 0 || token.length < 2) return base;
  const gaps = token.length - 1;
  return base + gaps * (opts.charSpacing / 1000) * opts.fontSize;
}
