import { describe, it, expect, vi } from 'vitest';
import { EllipseRenderer } from '../../../src/renderers/ellipse.renderer';
import type { FabricEllipseObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock ellipse objects
function createMockEllipse(overrides: Partial<FabricEllipseObject> = {}): FabricEllipseObject {
  return {
    type: 'ellipse',
    left: 50,
    top: 50,
    width: 100,
    height: 60,
    rx: 50,
    ry: 30,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'center',
    originY: 'center',
    fill: '#00FF00',
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    ...overrides,
  } as FabricEllipseObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawEllipse: vi.fn(),
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

describe('EllipseRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "ellipse"', () => {
      const renderer = new EllipseRenderer();
      expect(renderer.type).toBe('ellipse');
    });

    it('should render ellipse objects', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse();
      expect(renderer.canRender(ellipse)).toBe(true);
    });

    it('should not render non-ellipse objects', () => {
      const renderer = new EllipseRenderer();
      const rect = { ...createMockEllipse(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('basic ellipse rendering', () => {
    it('should call drawEllipse', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse();
      const context = createMockContext();

      renderer.render(ellipse, context.page, context);

      expect(context.page.drawEllipse).toHaveBeenCalled();
    });

    it('should pass correct rx and ry scales to drawEllipse', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({ rx: 50, ry: 30 });
      const context = createMockContext();

      renderer.render(ellipse, context.page, context);

      const call = vi.mocked(context.page.drawEllipse).mock.calls[0]![0];
      expect(call.xScale).toBe(50);
      expect(call.yScale).toBe(30);
    });

    it('should apply scale factors to rx and ry', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({
        rx: 50,
        ry: 30,
        scaleX: 2,
        scaleY: 1.5,
      });
      const context = createMockContext();

      renderer.render(ellipse, context.page, context);

      const call = vi.mocked(context.page.drawEllipse).mock.calls[0]![0];
      expect(call.xScale).toBe(100); // rx * scaleX
      expect(call.yScale).toBe(45); // ry * scaleY
    });

    it('should apply fill color', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({ fill: '#FF0000' });
      const context = createMockContext();

      renderer.render(ellipse, context.page, context);

      const call = vi.mocked(context.page.drawEllipse).mock.calls[0]![0];
      expect(call.color).toBeDefined();
    });

    it('should apply stroke color and width', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(ellipse, context.page, context);

      const call = vi.mocked(context.page.drawEllipse).mock.calls[0]![0];
      expect(call.borderColor).toBeDefined();
      expect(call.borderWidth).toBe(2);
    });
  });

  describe('fill only', () => {
    it('should render fill without stroke', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({
        fill: '#00FF00',
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(ellipse, context.page, context);

      const call = vi.mocked(context.page.drawEllipse).mock.calls[0]![0];
      expect(call.color).toBeDefined();
      expect(call.borderWidth).toBe(0);
    });
  });

  describe('stroke only', () => {
    it('should render stroke without fill', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({
        fill: null,
        stroke: '#0000FF',
        strokeWidth: 3,
      });
      const context = createMockContext();

      renderer.render(ellipse, context.page, context);

      const call = vi.mocked(context.page.drawEllipse).mock.calls[0]![0];
      expect(call.color).toBeUndefined();
      expect(call.borderColor).toBeDefined();
      expect(call.borderWidth).toBe(3);
    });
  });

  describe('no fill and no stroke', () => {
    it('should not render if both fill and stroke are null', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({
        fill: null,
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(ellipse, context.page, context);

      expect(context.page.drawEllipse).not.toHaveBeenCalled();
    });
  });

  describe('zero dimensions', () => {
    it('should handle zero rx gracefully', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({ rx: 0 });
      const context = createMockContext();

      expect(() => renderer.render(ellipse, context.page, context)).not.toThrow();
    });

    it('should handle zero ry gracefully', () => {
      const renderer = new EllipseRenderer();
      const ellipse = createMockEllipse({ ry: 0 });
      const context = createMockContext();

      expect(() => renderer.render(ellipse, context.page, context)).not.toThrow();
    });
  });
});
