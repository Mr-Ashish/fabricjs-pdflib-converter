import { describe, it, expect, vi } from 'vitest';
import { RectRenderer } from '../../../src/renderers/rect.renderer';
import type { FabricRectObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock rect objects
function createMockRect(overrides: Partial<FabricRectObject> = {}): FabricRectObject {
  return {
    type: 'rect',
    left: 10,
    top: 20,
    width: 100,
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
    fill: '#FF0000',
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    rx: 0,
    ry: 0,
    ...overrides,
  } as FabricRectObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawRectangle: vi.fn(),
      drawSvgPath: vi.fn(),
      pushGraphicsState: vi.fn(),
      popGraphicsState: vi.fn(),
      concatTransformationMatrix: vi.fn(),
    } as unknown as PDFPage,
    fontManager: {} as RenderContext['fontManager'],
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

describe('RectRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "rect"', () => {
      const renderer = new RectRenderer();
      expect(renderer.type).toBe('rect');
    });

    it('should render rect objects', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect();
      expect(renderer.canRender(rect)).toBe(true);
    });

    it('should not render non-rect objects', () => {
      const renderer = new RectRenderer();
      const circle = { ...createMockRect(), type: 'circle' };
      expect(renderer.canRender(circle)).toBe(false);
    });
  });

  describe('basic rectangle rendering', () => {
    it('should call drawRectangle for basic rect', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({ rx: 0, ry: 0 });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      expect(context.page.drawRectangle).toHaveBeenCalled();
    });

    it('should pass correct dimensions to drawRectangle', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({
        left: 10,
        top: 20,
        width: 100,
        height: 50,
      });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      const call = vi.mocked(context.page.drawRectangle).mock.calls[0]![0];
      expect(call).toMatchObject({
        width: 100,
        height: 50,
      });
    });

    it('should apply fill color', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({ fill: '#FF0000' });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      const call = vi.mocked(context.page.drawRectangle).mock.calls[0]![0];
      expect(call.color).toBeDefined();
    });

    it('should apply stroke color and width', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      const call = vi.mocked(context.page.drawRectangle).mock.calls[0]![0];
      expect(call.borderColor).toBeDefined();
      expect(call.borderWidth).toBe(2);
    });
  });

  describe('fill only', () => {
    it('should render fill without stroke', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({
        fill: '#00FF00',
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      const call = vi.mocked(context.page.drawRectangle).mock.calls[0]![0];
      expect(call.color).toBeDefined();
      expect(call.borderWidth).toBe(0);
    });
  });

  describe('stroke only', () => {
    it('should render stroke without fill', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({
        fill: null,
        stroke: '#0000FF',
        strokeWidth: 3,
      });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      const call = vi.mocked(context.page.drawRectangle).mock.calls[0]![0];
      expect(call.color).toBeUndefined();
      expect(call.borderColor).toBeDefined();
      expect(call.borderWidth).toBe(3);
    });
  });

  describe('no fill and no stroke', () => {
    it('should not render if both fill and stroke are null', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({
        fill: null,
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      expect(context.page.drawRectangle).not.toHaveBeenCalled();
      expect(context.page.drawSvgPath).not.toHaveBeenCalled();
    });
  });

  describe('rounded rectangles', () => {
    it('should use drawSvgPath for rounded corners', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({ rx: 10, ry: 10 });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      expect(context.page.drawSvgPath).toHaveBeenCalled();
      expect(context.page.drawRectangle).not.toHaveBeenCalled();
    });

    it('should generate valid SVG path for rounded rect', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({
        width: 100,
        height: 50,
        rx: 10,
        ry: 10,
      });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      const call = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(typeof call).toBe('string');
      expect(call).toContain('M');
      expect(call).toContain('A'); // Arc command for rounded corners
    });

    it('should apply fill and stroke to rounded rect', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({
        rx: 5,
        ry: 5,
        fill: '#FF0000',
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options).toMatchObject({
        color: expect.any(Object),
        borderColor: expect.any(Object),
        borderWidth: 2,
      });
    });
  });

  describe('zero dimensions', () => {
    it('should handle zero width gracefully', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({ width: 0 });
      const context = createMockContext();

      expect(() => renderer.render(rect, context.page, context)).not.toThrow();
    });

    it('should handle zero height gracefully', () => {
      const renderer = new RectRenderer();
      const rect = createMockRect({ height: 0 });
      const context = createMockContext();

      expect(() => renderer.render(rect, context.page, context)).not.toThrow();
    });
  });
});
