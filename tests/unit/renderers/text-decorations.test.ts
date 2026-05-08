import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextRenderer } from '../../../src/renderers/text.renderer';
import type { FabricTextObject, RenderContext } from '../../../src/types';
import type { PDFPage, PDFFont } from 'pdf-lib';
import { PDFName } from 'pdf-lib';

function createMockFont(): PDFFont {
  return {
    widthOfTextAtSize: vi.fn().mockImplementation((text: string, size: number) => text.length * size * 0.5),
    heightAtSize: vi.fn().mockImplementation((size: number) => size * 1.2),
  } as unknown as PDFFont;
}

function createMockText(overrides: Partial<FabricTextObject> = {}): FabricTextObject {
  return {
    type: 'text',
    left: 0, top: 0, width: 300, height: 50,
    scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
    flipX: false, flipY: false,
    originX: 'left', originY: 'top',
    fill: '#000000', stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeLineJoin: 'miter', strokeMiterLimit: 4,
    strokeUniform: false, opacity: 1, visible: true,
    text: 'Hello World',
    fontFamily: 'Helvetica',
    fontSize: 20,
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: 1.16,
    textAlign: 'left',
    textBackgroundColor: null,
    charSpacing: 0,
    styles: {},
    underline: false,
    linethrough: false,
    overline: false,
    shadow: null,
    globalCompositeOperation: 'source-over',
    ...overrides,
  } as FabricTextObject;
}

function createMockContext(): RenderContext {
  const font = createMockFont();
  return {
    pdfDoc: {
      context: {
        obj: vi.fn().mockImplementation(() => ({ set: vi.fn(), lookup: vi.fn() })),
      },
    } as unknown as RenderContext['pdfDoc'],
    page: {
      drawText: vi.fn(),
      drawSvgPath: vi.fn(),
      pushOperators: vi.fn(),
      node: {
        newExtGState: vi.fn().mockReturnValue(PDFName.of('GS_0000')),
      },
    } as unknown as PDFPage,
    fontManager: {
      resolve: vi.fn().mockResolvedValue(font),
    },
    imageLoader: {} as RenderContext['imageLoader'],
    options: {
      scale: 1, pageWidth: 595, pageHeight: 842,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      fonts: {}, defaultFont: 'Helvetica',
      onUnsupported: 'warn', maxGroupDepth: 20,
    },
    warnings: { add: vi.fn(), getAll: vi.fn().mockReturnValue([]), hasWarnings: vi.fn() },
    renderObject: vi.fn(),
    currentDepth: 0,
  };
}

describe('charSpacing', () => {
  it('emits Tc operator when charSpacing is non-zero', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ charSpacing: 200, fontSize: 20 });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const tcOp = allOps.find(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tc',
    );
    expect(tcOp).toBeDefined();
  });

  it('Tc value equals charSpacing/1000 * fontSize', async () => {
    const renderer = new TextRenderer();
    // charSpacing=200, fontSize=20 → Tc = 200/1000*20 = 4
    const text = createMockText({ charSpacing: 200, fontSize: 20 });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const tcOp = allOps.find(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tc',
    ) as { args: Array<{ numberValue: number }> } | undefined;
    expect(tcOp?.args[0]?.numberValue).toBeCloseTo(4, 3);
  });

  it('does NOT emit Tc operator when charSpacing is 0', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ charSpacing: 0 });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const tcOp = allOps.find(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tc',
    );
    expect(tcOp).toBeUndefined();
  });
});
