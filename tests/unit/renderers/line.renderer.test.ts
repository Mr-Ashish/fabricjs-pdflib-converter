import { describe, it, expect, vi } from 'vitest';
import { LineRenderer } from '../../../src/renderers/line.renderer';
import type { FabricLineObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock line objects
function createMockLine(overrides: Partial<FabricLineObject> = {}): FabricLineObject {
  return {
    type: 'line',
    left: 50,
    top: 50,
    width: 100,
    height: 0,
    x1: -50,
    y1: 0,
    x2: 50,
    y2: 0,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'center',
    originY: 'center',
    fill: null,
    stroke: '#000000',
    strokeWidth: 1,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    ...overrides,
  } as FabricLineObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawLine: vi.fn(),
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

describe('LineRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "line"', () => {
      const renderer = new LineRenderer();
      expect(renderer.type).toBe('line');
    });

    it('should render line objects', () => {
      const renderer = new LineRenderer();
      const line = createMockLine();
      expect(renderer.canRender(line)).toBe(true);
    });

    it('should not render non-line objects', () => {
      const renderer = new LineRenderer();
      const rect = { ...createMockLine(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('line rendering', () => {
    it('should call drawLine', () => {
      const renderer = new LineRenderer();
      const line = createMockLine();
      const context = createMockContext();

      renderer.render(line, context.page, context);

      expect(context.page.drawLine).toHaveBeenCalled();
    });

    it('should pass correct start and end points', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 50,
      });
      const context = createMockContext();

      renderer.render(line, context.page, context);

      const call = vi.mocked(context.page.drawLine).mock.calls[0]![0];
      expect(call.start).toEqual({ x: 0, y: 0 });
      expect(call.end).toEqual({ x: 100, y: 50 });
    });

    it('should apply stroke color', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({ stroke: '#FF0000' });
      const context = createMockContext();

      renderer.render(line, context.page, context);

      const call = vi.mocked(context.page.drawLine).mock.calls[0]![0];
      expect(call.color).toBeDefined();
    });

    it('should apply stroke width as thickness', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({ strokeWidth: 3 });
      const context = createMockContext();

      renderer.render(line, context.page, context);

      const call = vi.mocked(context.page.drawLine).mock.calls[0]![0];
      expect(call.thickness).toBe(3);
    });
  });

  describe('horizontal line', () => {
    it('should render horizontal line correctly', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({
        x1: -50,
        y1: 0,
        x2: 50,
        y2: 0,
      });
      const context = createMockContext();

      renderer.render(line, context.page, context);

      const call = vi.mocked(context.page.drawLine).mock.calls[0]![0];
      expect(call.start.y).toBe(call.end.y); // Same Y = horizontal
    });
  });

  describe('vertical line', () => {
    it('should render vertical line correctly', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({
        x1: 0,
        y1: -50,
        x2: 0,
        y2: 50,
      });
      const context = createMockContext();

      renderer.render(line, context.page, context);

      const call = vi.mocked(context.page.drawLine).mock.calls[0]![0];
      expect(call.start.x).toBe(call.end.x); // Same X = vertical
    });
  });

  describe('diagonal line', () => {
    it('should render diagonal line correctly', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
      });
      const context = createMockContext();

      renderer.render(line, context.page, context);

      const call = vi.mocked(context.page.drawLine).mock.calls[0]![0];
      expect(call.start).toEqual({ x: 0, y: 0 });
      expect(call.end).toEqual({ x: 100, y: 100 });
    });
  });

  describe('no stroke', () => {
    it('should not render if stroke is null', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({ stroke: null });
      const context = createMockContext();

      renderer.render(line, context.page, context);

      expect(context.page.drawLine).not.toHaveBeenCalled();
    });

    it('should not render if strokeWidth is 0', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({ strokeWidth: 0 });
      const context = createMockContext();

      renderer.render(line, context.page, context);

      expect(context.page.drawLine).not.toHaveBeenCalled();
    });
  });

  describe('zero length line', () => {
    it('should handle zero length line gracefully', () => {
      const renderer = new LineRenderer();
      const line = createMockLine({
        x1: 50,
        y1: 50,
        x2: 50,
        y2: 50,
      });
      const context = createMockContext();

      expect(() => renderer.render(line, context.page, context)).not.toThrow();
    });
  });
});
