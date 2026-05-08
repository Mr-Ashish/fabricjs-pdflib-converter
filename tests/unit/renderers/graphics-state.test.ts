import { describe, it, expect, vi } from 'vitest';
import { applyGraphicsState } from '../../../src/renderers/graphics-state';
import { PDFName } from 'pdf-lib';
import type { PDFPage, PDFDocument } from 'pdf-lib';

let gsKeyCounter = 0;

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
        newExtGState: vi.fn().mockImplementation(() => PDFName.of(`GS-${gsKeyCounter++}`)),
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
        newExtGState: vi.fn().mockImplementation(() => PDFName.of(`GS-${gsKeyCounter++}`)),
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
      const { page } = createMockPage();
      const pdfDoc = createMockPdfDoc();
      applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: fabricBm });
      const contextObj = vi.mocked(pdfDoc.context.obj).mock.calls[0]![0] as Record<string, unknown>;
      expect(contextObj['BM']).toBe(pdfBm);
    }
  });

  it('calls newExtGState twice for successive calls', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    applyGraphicsState(page, pdfDoc, { opacity: 0.3 });
    expect((page.node as unknown as { newExtGState: ReturnType<typeof vi.fn> }).newExtGState).toHaveBeenCalledTimes(2);
  });

  it('uses unique gs operators for successive calls', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    applyGraphicsState(page, pdfDoc, { opacity: 0.3 });
    const calls = vi.mocked(page.pushOperators).mock.calls;
    expect(calls[0]![0]).not.toEqual(calls[1]![0]);
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

  it('calls page.node.newExtGState to register the ExtGState dict', () => {
    const { page } = createMockPageNoExtGState();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    expect((page.node as unknown as { newExtGState: ReturnType<typeof vi.fn> }).newExtGState).toHaveBeenCalledTimes(1);
  });

  it('clamps opacity above 1 to 1 (no-op)', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 2 });
    expect(page.pushOperators).not.toHaveBeenCalled();
  });

  it('clamps opacity below 0 to 0', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: -0.5 });
    const contextObj = vi.mocked(pdfDoc.context.obj).mock.calls[0]![0] as Record<string, unknown>;
    expect(contextObj['ca']).toBe(0);
    expect(contextObj['CA']).toBe(0);
  });
});
