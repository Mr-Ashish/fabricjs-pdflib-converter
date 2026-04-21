import { describe, it, expect, vi } from 'vitest';
import { CircleRenderer } from '../../../src/renderers/circle.renderer';
import type { FabricCircleObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock circle objects
function createMockCircle(overrides: Partial<FabricCircleObject> = {}): FabricCircleObject {
  return {
    type: 'circle',
    left: 50,
    top: 50,
    width: 60,
    height: 60,
    radius: 30,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'center',
    originY: 'center',
    fill: '#0000FF',
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    startAngle: 0,
    endAngle: 360,
    ...overrides,
  } as FabricCircleObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawCircle: vi.fn(),
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

describe('CircleRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "circle"', () => {
      const renderer = new CircleRenderer();
      expect(renderer.type).toBe('circle');
    });

    it('should render circle objects', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle();
      expect(renderer.canRender(circle)).toBe(true);
    });

    it('should not render non-circle objects', () => {
      const renderer = new CircleRenderer();
      const rect = { ...createMockCircle(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('basic circle rendering', () => {
    it('should call drawCircle for full circle', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({ startAngle: 0, endAngle: 360 });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      expect(context.page.drawCircle).toHaveBeenCalled();
    });

    it('should pass correct radius to drawCircle', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({ radius: 50 });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      const call = vi.mocked(context.page.drawCircle).mock.calls[0]![0];
      // Radius is passed directly - scaling is handled by transformation matrix
      expect(call.size).toBe(50);
    });

    it('should apply fill color', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({ fill: '#FF0000' });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      const call = vi.mocked(context.page.drawCircle).mock.calls[0]![0];
      expect(call.color).toBeDefined();
    });

    it('should apply stroke color and width', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      const call = vi.mocked(context.page.drawCircle).mock.calls[0]![0];
      expect(call.borderColor).toBeDefined();
      expect(call.borderWidth).toBe(2);
    });
  });

  describe('partial arcs', () => {
    it('should use drawSvgPath for partial circle', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({ startAngle: 0, endAngle: 180 });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      expect(context.page.drawSvgPath).toHaveBeenCalled();
      expect(context.page.drawCircle).not.toHaveBeenCalled();
    });

    it('should generate valid SVG path for arc', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({
        radius: 30,
        startAngle: 0,
        endAngle: 90,
      });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      const call = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(typeof call).toBe('string');
      expect(call).toContain('M');
      expect(call).toContain('A'); // Arc command
    });

    it('should apply fill and stroke to arc', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({
        startAngle: 0,
        endAngle: 180,
        fill: '#FF0000',
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options).toMatchObject({
        color: expect.any(Object),
        borderColor: expect.any(Object),
        borderWidth: 2,
      });
    });
  });

  describe('fill only', () => {
    it('should render fill without stroke', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({
        fill: '#00FF00',
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      const call = vi.mocked(context.page.drawCircle).mock.calls[0]![0];
      expect(call.color).toBeDefined();
      expect(call.borderWidth).toBe(0);
    });
  });

  describe('stroke only', () => {
    it('should render stroke without fill', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({
        fill: null,
        stroke: '#0000FF',
        strokeWidth: 3,
      });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      const call = vi.mocked(context.page.drawCircle).mock.calls[0]![0];
      expect(call.color).toBeUndefined();
      expect(call.borderColor).toBeDefined();
      expect(call.borderWidth).toBe(3);
    });
  });

  describe('no fill and no stroke', () => {
    it('should not render if both fill and stroke are null', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({
        fill: null,
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      expect(context.page.drawCircle).not.toHaveBeenCalled();
      expect(context.page.drawSvgPath).not.toHaveBeenCalled();
    });
  });

  describe('zero radius', () => {
    it('should handle zero radius gracefully', () => {
      const renderer = new CircleRenderer();
      const circle = createMockCircle({ radius: 0 });
      const context = createMockContext();

      expect(() => renderer.render(circle, context.page, context)).not.toThrow();
    });
  });
});
