import { setGraphicsState } from 'pdf-lib';
import type { PDFPage, PDFDocument } from 'pdf-lib';

const BLEND_MODE_MAP: Record<string, string> = {
  'multiply': 'Multiply',
  'screen': 'Screen',
  'overlay': 'Overlay',
  'darken': 'Darken',
  'lighten': 'Lighten',
  'color-dodge': 'ColorDodge',
  'color-burn': 'ColorBurn',
  'hard-light': 'HardLight',
  'soft-light': 'SoftLight',
  'difference': 'Difference',
  'exclusion': 'Exclusion',
};

export function applyGraphicsState(
  page: PDFPage,
  pdfDoc: PDFDocument,
  options: { opacity?: number; blendMode?: string },
): void {
  const opacity = Math.min(1, Math.max(0, options.opacity ?? 1));
  const blendMode = options.blendMode ?? 'source-over';

  const isOpaque = opacity >= 1;
  const isNormal = blendMode === 'source-over' || blendMode === 'normal' || blendMode === '';

  if (isOpaque && isNormal) return;

  const entries: Record<string, unknown> = { Type: 'ExtGState' };
  if (!isOpaque) {
    entries['ca'] = opacity;
    entries['CA'] = opacity;
  }
  if (!isNormal) {
    entries['BM'] = BLEND_MODE_MAP[blendMode] ?? 'Normal';
  }

  const gsDict = pdfDoc.context.obj(entries as Parameters<typeof pdfDoc.context.obj>[0]);
  const gsKey = (page.node as unknown as { newExtGState: (tag: string, dict: unknown) => import('pdf-lib').PDFName }).newExtGState('GS', gsDict);
  page.pushOperators(setGraphicsState(gsKey));
}
