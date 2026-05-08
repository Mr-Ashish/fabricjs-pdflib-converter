import { PDFName, PDFDict, PDFOperator } from 'pdf-lib';
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

let gsCounter = 0;

export function resetGsCounter(): void {
  gsCounter = 0;
}

export function applyGraphicsState(
  page: PDFPage,
  pdfDoc: PDFDocument,
  options: { opacity?: number; blendMode?: string },
): void {
  const opacity = options.opacity ?? 1;
  const blendMode = options.blendMode ?? 'source-over';

  const isOpaque = opacity >= 0.999;
  const isNormal = blendMode === 'source-over' || blendMode === 'normal' || blendMode === '';

  if (isOpaque && isNormal) return;

  const gsName = `GS_${String(gsCounter++).padStart(4, '0')}`;

  const entries: Record<string, unknown> = { Type: 'ExtGState' };
  if (!isOpaque) {
    entries['ca'] = opacity;
    entries['CA'] = opacity;
  }
  if (!isNormal) {
    entries['BM'] = BLEND_MODE_MAP[blendMode] ?? 'Normal';
  }

  const gsDict = pdfDoc.context.obj(entries);

  const resourcesDict = (page.node as unknown as { Resources: () => PDFDict }).Resources();
  let extGState = resourcesDict.lookup(PDFName.of('ExtGState')) as PDFDict | undefined;
  if (!extGState) {
    extGState = pdfDoc.context.obj({}) as PDFDict;
    resourcesDict.set(PDFName.of('ExtGState'), extGState);
  }
  extGState.set(PDFName.of(gsName), gsDict);

  page.pushOperators(PDFOperator.of('gs', [PDFName.of(gsName)]));
}
