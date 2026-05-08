import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyGraphicsState, resetGsCounter } from '../../../src/renderers/graphics-state';
import type { PDFPage, PDFDocument } from 'pdf-lib';

function createMockPage() {
  const extGStateDict = { set: vi.fn() };
  const resourcesDict = {
    lookup: vi.fn().mockReturnValue(extGStateDict),
    set: vi.fn(),
  };
  return {
    page: {
      pushOperators: vi.fn(),
      node: {
        Resources: vi.fn().mockReturnValue(resourcesDict),
      },
    } as unknown as PDFPage,
    extGStateDict,
    resourcesDict,
  };
}

function createMockPageNoExtGState() {
  const resourcesDict = {
    lookup: vi.fn().mockReturnValue(null), // no pre-existing ExtGState
    set: vi.fn(),
  };
  return {
    page: {
      pushOperators: vi.fn(),
      node: {
        Resources: vi.fn().mockReturnValue(resourcesDict),
      },
    } as unknown as PDFPage,
    resourcesDict,
  };
}

function createMockPdfDoc() {
  return {
    context: {
      obj: vi.fn().mockImplementation((entries) => ({ _entries: entries, set: vi.fn() })),
    },
  } as unknown as PDFDocument;
}

describe('applyGraphicsState', () => {
  beforeEach(() => { resetGsCounter(); });

  it('does nothing when opacity is 1 and blendMode is source-over', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: 'source-over' });
    expect(page.pushOperators).not.toHaveBeenCalled();
  });

  it('emits gs operator when opacity < 1', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    expect(page.pushOperators).toHaveBeenCalledTimes(1);
  });

  it('creates ExtGState dict with ca and CA set to opacity', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    const contextObj = vi.mocked(pdfDoc.context.obj).mock.calls[0]![0] as Record<string, unknown>;
    expect(contextObj['ca']).toBe(0.5);
    expect(contextObj['CA']).toBe(0.5);
  });

  it('emits gs operator when blendMode is multiply', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: 'multiply' });
    expect(page.pushOperators).toHaveBeenCalledTimes(1);
  });

  it('maps Fabric blend mode names to PDF BM values', () => {
    const cases: Array<[string, string]> = [
      ['multiply', 'Multiply'],
      ['screen', 'Screen'],
      ['overlay', 'Overlay'],
      ['darken', 'Darken'],
      ['lighten', 'Lighten'],
      ['color-dodge', 'ColorDodge'],
      ['color-burn', 'ColorBurn'],
      ['hard-light', 'HardLight'],
      ['soft-light', 'SoftLight'],
      ['difference', 'Difference'],
      ['exclusion', 'Exclusion'],
    ];
    for (const [fabricBm, pdfBm] of cases) {
      resetGsCounter();
      const { page } = createMockPage();
      const pdfDoc = createMockPdfDoc();
      applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: fabricBm });
      const contextObj = vi.mocked(pdfDoc.context.obj).mock.calls[0]![0] as Record<string, unknown>;
      expect(contextObj['BM']).toBe(pdfBm);
    }
  });

  it('creates ExtGState with no-repeat resources when ExtGState dict already exists', () => {
    const { page, extGStateDict } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    applyGraphicsState(page, pdfDoc, { opacity: 0.3 });
    expect(extGStateDict.set).toHaveBeenCalledTimes(2);
  });

  it('uses unique gs names for successive calls', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    applyGraphicsState(page, pdfDoc, { opacity: 0.3 });
    const calls = vi.mocked(page.pushOperators).mock.calls;
    const op0 = calls[0]![0] as { args: Array<{ decodeText: () => string }> };
    const op1 = calls[1]![0] as { args: Array<{ decodeText: () => string }> };
    expect(op0).not.toEqual(op1);
  });

  it('does nothing when blendMode is "normal" (string literal)', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: 'normal' });
    expect(page.pushOperators).not.toHaveBeenCalled();
  });

  it('does nothing when blendMode is empty string', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: '' });
    expect(page.pushOperators).not.toHaveBeenCalled();
  });

  it('falls back to "Normal" in BM entry for unknown blend mode', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: 'xor' });
    const contextObj = vi.mocked(pdfDoc.context.obj).mock.calls[0]![0] as Record<string, unknown>;
    expect(contextObj['BM']).toBe('Normal');
  });

  it('calls resourcesDict.set to register the ExtGState dict when none exists yet', () => {
    const { page, resourcesDict } = createMockPageNoExtGState();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    expect(resourcesDict.set).toHaveBeenCalled();
  });
});
