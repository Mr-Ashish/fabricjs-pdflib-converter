import { describe, it, expect, vi } from 'vitest';
import { TextRenderer } from '../../../src/renderers/text.renderer';
import type { FabricTextObject, FabricTextStyles, RenderContext } from '../../../src/types';
import type { PDFPage, PDFFont } from 'pdf-lib';
import { PDFName } from 'pdf-lib';

function createMockFont(): PDFFont {
  return {
    widthOfTextAtSize: vi.fn().mockImplementation((text: string, size: number) => text.length * size * 0.5),
    heightAtSize: vi.fn().mockImplementation((size: number) => size * 1.2),
  } as unknown as PDFFont;
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

function makeText(overrides: Partial<FabricTextObject> = {}): FabricTextObject {
  return {
    type: 'text',
    left: 0, top: 0, width: 300, height: 60,
    scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
    flipX: false, flipY: false,
    originX: 'left', originY: 'top',
    fill: '#000000', stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeLineJoin: 'miter', strokeMiterLimit: 4,
    strokeUniform: false, opacity: 1, visible: true,
    text: 'AB',
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

describe('per-character style runs', () => {
  it('renders single drawText call when styles is empty', async () => {
    const renderer = new TextRenderer();
    const text = makeText({ text: 'Hello', styles: {} });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawText).toHaveBeenCalledTimes(1);
    expect(vi.mocked(context.page.drawText).mock.calls[0]![0]).toBe('Hello');
  });

  it('renders two drawText calls when two characters have different fill colors', async () => {
    const renderer = new TextRenderer();
    const styles: FabricTextStyles = {
      '0': {
        '0': { fill: '#ff0000' },  // 'A' = red
        // 'B' has no override → inherits black
      },
    };
    const text = makeText({ text: 'AB', styles });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    // Two runs: 'A' (red) and 'B' (black)
    expect(context.page.drawText).toHaveBeenCalledTimes(2);
    expect(vi.mocked(context.page.drawText).mock.calls[0]![0]).toBe('A');
    expect(vi.mocked(context.page.drawText).mock.calls[1]![0]).toBe('B');
  });

  it('groups consecutive characters with the same style into one run', async () => {
    const renderer = new TextRenderer();
    // A, B, C all have no override → same style → one run
    const text = makeText({ text: 'ABC', styles: {} });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawText).toHaveBeenCalledTimes(1);
    expect(vi.mocked(context.page.drawText).mock.calls[0]![0]).toBe('ABC');
  });

  it('resolves a different font for a run with different fontWeight', async () => {
    const renderer = new TextRenderer();
    const boldFont = createMockFont();
    const styles: FabricTextStyles = {
      '0': {
        '0': { fontWeight: 'bold' },
      },
    };
    const text = makeText({ text: 'AB', styles });
    const context = createMockContext();
    // Return boldFont for bold, normalFont for normal
    vi.mocked(context.fontManager.resolve).mockImplementation(async (family, weight) => {
      return weight === 'bold' ? boldFont : createMockFont();
    });

    await renderer.render(text, context.page, context);

    // Should resolve font for bold (for 'A') and for normal (for 'B')
    expect(context.fontManager.resolve).toHaveBeenCalledWith('Helvetica', 'bold', 'normal');
    expect(context.fontManager.resolve).toHaveBeenCalledWith('Helvetica', 'normal', 'normal');
  });

  it('x-cursor advances correctly: second run starts after first run width', async () => {
    const renderer = new TextRenderer();
    // 'A' red (run 1), 'B' black (run 2)
    // Font: charWidth = char.length * fontSize * 0.5 = 1 * 20 * 0.5 = 10 per char
    const styles: FabricTextStyles = {
      '0': {
        '0': { fill: '#ff0000' },
      },
    };
    const text = makeText({ text: 'AB', styles });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    // drawTextInCanvas emits a cm op with the x position encoded in args[4]
    const pushOpsCalls = vi.mocked(context.page.pushOperators).mock.calls;
    type CmOp = { name: string; args: { numberValue: number }[] };
    const cms = pushOpsCalls
      .flatMap((call) => call)
      .filter((op): op is CmOp => (op as CmOp).name === 'cm');

    // drawTextInCanvas emits cm(1, 0, 0, -1, x, y) per call
    // With left-aligned text: first run x=0, second run x=runWidth of 'A' = 10
    const xPositions = cms.map((cm) => cm.args[4]!.numberValue);

    expect(xPositions[0]).toBeCloseTo(0, 3);   // first run starts at 0
    expect(xPositions[1]).toBeCloseTo(10, 3);  // second run starts at width of 'A' = 10
  });

  it('draws inline underline decoration per run when style overrides underline', async () => {
    const renderer = new TextRenderer();
    const styles: FabricTextStyles = {
      '0': { '0': { underline: true } }, // only 'A' is underlined
    };
    const text = makeText({ text: 'AB', styles, underline: false });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    // drawSvgPath called once (for 'A' underline); 'B' has no decoration
    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(1);
  });
});
