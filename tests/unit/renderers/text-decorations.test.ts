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

describe('textBackgroundColor', () => {
  it('calls drawSvgPath for background rect when textBackgroundColor is set', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ textBackgroundColor: '#ffff00' });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(1);
  });

  it('does NOT call drawSvgPath for background when textBackgroundColor is null', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ textBackgroundColor: null });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).not.toHaveBeenCalled();
  });
});

describe('text decorations', () => {
  it('draws an extra drawSvgPath when underline is true', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ underline: true });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(1);
  });

  it('draws an extra drawSvgPath when linethrough is true', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ linethrough: true });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(1);
  });

  it('draws an extra drawSvgPath when overline is true', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ overline: true });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(1);
  });

  it('draws NO extra drawSvgPath when all decorations are false and no background', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ underline: false, linethrough: false, overline: false, textBackgroundColor: null });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).not.toHaveBeenCalled();
  });

  it('draws 3 decoration paths when all three decorations are enabled', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ underline: true, linethrough: true, overline: true, text: 'hello' });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(3);
  });

  it('draws decoration paths for each line in multi-line text', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ underline: true, text: 'line1\nline2' });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(2);
  });

  it('draws background + underline = 2 drawSvgPath calls when both are set', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ textBackgroundColor: '#ffff00', underline: true, text: 'hello' });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    // 1 background + 1 underline = 2
    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(2);
  });
});

describe('justify alignment', () => {
  it('emits Tw operator for justify on non-last lines that contain spaces', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({
      textAlign: 'justify',
      text: 'hello world\nsecond line',
      width: 200,
      fontSize: 20,
    });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const twOps = allOps.filter(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tw',
    );
    expect(twOps.length).toBeGreaterThan(0);
  });

  it('does NOT emit Tw for the last line in justify mode', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({
      textAlign: 'justify',
      text: 'hello world\nlast line here',
      width: 200,
      fontSize: 20,
    });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const twOps = allOps.filter(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tw',
    );
    expect(twOps).toHaveLength(0);
  });

  it('does NOT emit Tw for left/center/right alignment', async () => {
    for (const align of ['left', 'center', 'right'] as const) {
      const renderer = new TextRenderer();
      const text = createMockText({ textAlign: align, text: 'hello world test', width: 200 });
      const context = createMockContext();
      await renderer.render(text, context.page, context);
      const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
      const twOps = allOps.filter(
        (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tw',
      );
      expect(twOps).toHaveLength(0);
    }
  });
});
