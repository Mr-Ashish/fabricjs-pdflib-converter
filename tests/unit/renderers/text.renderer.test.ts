import { describe, it, expect, vi } from 'vitest';
import { TextRenderer } from '../../../src/renderers/text.renderer';
import type { FabricTextObject, RenderContext } from '../../../src/types';
import type { PDFPage, PDFFont } from 'pdf-lib';

// Mock PDFFont
function createMockPDFFont(): PDFFont {
  return {
    widthOfTextAtSize: vi.fn().mockImplementation((text: string, size: number) => text.length * size * 0.5),
    heightAtSize: vi.fn().mockImplementation((size: number, options?: { descender?: boolean }) => {
      if (options?.descender === false) return size * 0.75;
      return size * 1.2;
    }),
  } as unknown as PDFFont;
}

// Factory for creating mock text objects
function createMockText(overrides: Partial<FabricTextObject> = {}): FabricTextObject {
  return {
    type: 'text',
    left: 100,
    top: 100,
    width: 200,
    height: 50,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'left',
    originY: 'top',
    fill: '#000000',
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    text: 'Hello World',
    fontFamily: 'Helvetica',
    fontSize: 24,
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
    ...overrides,
  } as FabricTextObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  const mockFont = createMockPDFFont();

  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawText: vi.fn(),
      pushGraphicsState: vi.fn(),
      pushOperators: vi.fn(),
      popGraphicsState: vi.fn(),
      concatTransformationMatrix: vi.fn(),
    } as unknown as PDFPage,
    fontManager: {
      resolve: vi.fn().mockResolvedValue(mockFont),
    },
    imageLoader: {} as RenderContext['imageLoader'],
    options: {
      scale: 1,
      pageWidth: 595,
      pageHeight: 842,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      fonts: {},
      defaultFont: 'Helvetica',
      onUnsupported: 'warn',
      maxGroupDepth: 20,
    },
    warnings: {
      add: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
      hasWarnings: vi.fn().mockReturnValue(false),
    },
    renderObject: vi.fn(),
    currentDepth: 0,
  };
}

describe('TextRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "text"', () => {
      const renderer = new TextRenderer();
      expect(renderer.type).toBe('text');
    });

    it('should render text objects', () => {
      const renderer = new TextRenderer();
      const text = createMockText();
      expect(renderer.canRender(text)).toBe(true);
    });

    it('should not render non-text objects', () => {
      const renderer = new TextRenderer();
      const rect = { ...createMockText(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });

    it('should also handle i-text type', () => {
      const renderer = new TextRenderer();
      const text = createMockText({ type: 'i-text' });
      expect(renderer.canRender(text)).toBe(true);
    });

    it('should also handle textbox type', () => {
      const renderer = new TextRenderer();
      const text = createMockText({ type: 'textbox' });
      expect(renderer.canRender(text)).toBe(true);
    });
  });

  describe('basic text rendering', () => {
    it('should resolve font via fontManager', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ fontFamily: 'Helvetica', fontWeight: 'normal', fontStyle: 'normal' });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      expect(context.fontManager.resolve).toHaveBeenCalledWith('Helvetica', 'normal', 'normal');
    });

    it('should call drawText with text content', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ text: 'Hello World' });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      expect(context.page.drawText).toHaveBeenCalled();
      const call = vi.mocked(context.page.drawText).mock.calls[0]!;
      expect(call[0]).toBe('Hello World');
    });

    it('should pass font and size to drawText', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ fontSize: 24 });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      const options = vi.mocked(context.page.drawText).mock.calls[0]![1];
      expect(options).toMatchObject({
        size: 24,
      });
    });

    it('should apply text color', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ fill: '#FF0000' });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      const options = vi.mocked(context.page.drawText).mock.calls[0]![1];
      expect(options.color).toBeDefined();
    });
  });

  describe('multi-line text', () => {
    it('should split text by newlines', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ text: 'Line 1\nLine 2\nLine 3' });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      // Should draw 3 lines
      expect(context.page.drawText).toHaveBeenCalledTimes(3);
    });

    it('should position multiple lines vertically', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({
        text: 'Line 1\nLine 2',
        fontSize: 20,
        lineHeight: 1.5,
      });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      const calls = vi.mocked(context.page.drawText).mock.calls;
      expect(calls.length).toBe(2);

      // Both lines should have y positions
      expect(calls[0]![1]?.y).toBeDefined();
      expect(calls[1]![1]?.y).toBeDefined();
    });
  });

  describe('text alignment', () => {
    it('should handle left alignment (default)', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ textAlign: 'left', width: 200 });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      const options = vi.mocked(context.page.drawText).mock.calls[0]![1];
      expect(options?.x).toBe(0);
    });

    it('should handle center alignment', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ textAlign: 'center', width: 200 });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      // Center alignment should adjust x position
      expect(context.page.drawText).toHaveBeenCalled();
    });

    it('should handle right alignment', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ textAlign: 'right', width: 200 });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      expect(context.page.drawText).toHaveBeenCalled();
    });
  });

  describe('font variants', () => {
    it('should resolve bold font', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ fontWeight: 'bold' });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      expect(context.fontManager.resolve).toHaveBeenCalledWith('Helvetica', 'bold', 'normal');
    });

    it('should resolve italic font', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ fontStyle: 'italic' });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      expect(context.fontManager.resolve).toHaveBeenCalledWith('Helvetica', 'normal', 'italic');
    });

    it('should resolve bold italic font', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({ fontWeight: 'bold', fontStyle: 'italic' });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      expect(context.fontManager.resolve).toHaveBeenCalledWith('Helvetica', 'bold', 'italic');
    });
  });

  describe('error handling', () => {
    it('should handle font resolution failure gracefully', async () => {
      const renderer = new TextRenderer();
      const text = createMockText();
      const context = createMockContext();

      context.fontManager.resolve = vi.fn().mockRejectedValue(new Error('Font not found'));

      // Should not throw
      await renderer.render(text, context.page, context);
      // Should add warning
      expect(context.warnings.add).toHaveBeenCalled();
    });
  });

  describe('textbox word wrapping', () => {
    // Mock font width = text.length * fontSize * 0.5.
    // With fontSize 10, each char is 5pt wide.

    it('wraps a textbox so the text flows to the next line when it exceeds width', async () => {
      const renderer = new TextRenderer();
      // Width 30pt, fontSize 10 → ~6 chars per line.
      // "aaaa bbbb cccc" → wraps into 3 lines.
      const textbox = createMockText({
        type: 'textbox',
        text: 'aaaa bbbb cccc',
        width: 30,
        fontSize: 10,
      });
      const context = createMockContext();

      await renderer.render(textbox, context.page, context);

      // A plain `text` object with the same string would render as ONE line
      // (single `\n`-free string). The textbox must emit 3 calls.
      expect(context.page.drawText).toHaveBeenCalledTimes(3);
    });

    it('does NOT auto-wrap a plain text object even if it would overflow its width', async () => {
      const renderer = new TextRenderer();
      const text = createMockText({
        type: 'text',
        text: 'aaaa bbbb cccc',
        width: 30,
        fontSize: 10,
      });
      const context = createMockContext();

      await renderer.render(text, context.page, context);

      // Plain text: no wrapping, just a single drawText (no \n in input).
      expect(context.page.drawText).toHaveBeenCalledTimes(1);
    });

    it('respects explicit newlines in a textbox while also wrapping each paragraph', async () => {
      const renderer = new TextRenderer();
      const textbox = createMockText({
        type: 'textbox',
        text: 'aaaa bbbb\ncccc dddd',
        width: 25,
        fontSize: 10,
      });
      const context = createMockContext();

      await renderer.render(textbox, context.page, context);

      // Each paragraph wraps to 2 lines → 4 total.
      expect(context.page.drawText).toHaveBeenCalledTimes(4);
    });

    it('uses splitByGrapheme to break long words mid-stream when set', async () => {
      const renderer = new TextRenderer();
      // One 8-char word in a 20pt box with 5pt-per-char font → 4 per line.
      const textbox = createMockText({
        type: 'textbox',
        text: 'aaaaaaaa',
        width: 20,
        fontSize: 10,
        // splitByGrapheme lives on FabricTextboxObject; tests cast through
        // the partial helper.
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (textbox as any).splitByGrapheme = true;

      const context = createMockContext();

      await renderer.render(textbox, context.page, context);

      expect(context.page.drawText).toHaveBeenCalledTimes(2);
    });

    it('positions wrapped lines with increasing y so they stack vertically', async () => {
      const renderer = new TextRenderer();
      const textbox = createMockText({
        type: 'textbox',
        text: 'aaaa bbbb cccc',
        width: 30,
        fontSize: 10,
        lineHeight: 1.2,
      });
      const context = createMockContext();

      await renderer.render(textbox, context.page, context);

      expect(context.page.drawText).toHaveBeenCalledTimes(3);

      // `drawTextInCanvas` encodes the baseline y into a `cm` (concat transform
      // matrix) operator — the 6th matrix slot — then calls drawText(x:0, y:0).
      // Inspect pushOperators calls to recover per-line baseline Y in canvas-Y-down.
      const pushOps = vi.mocked(context.page.pushOperators).mock.calls;
      type CmOp = { name: string; args: { numberValue: number }[] };
      const matrixCalls = pushOps.filter((call) =>
        call.some((op) => (op as CmOp).name === 'cm'),
      );
      expect(matrixCalls.length).toBeGreaterThanOrEqual(3);

      const ys = matrixCalls.map((call) => {
        const op = call.find((o) => (o as CmOp).name === 'cm') as CmOp;
        return op.args[5]!.numberValue;
      });

      // Successive lines' baseline Y in canvas-Y-down strictly increases.
      expect(ys[1]).toBeGreaterThan(ys[0]!);
      expect(ys[2]).toBeGreaterThan(ys[1]!);
    });
  });
});
