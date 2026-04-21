import { describe, it, expect, vi } from 'vitest';
import { TriangleRenderer } from '../../../src/renderers/triangle.renderer';
import type { FabricTriangleObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock triangle objects
function createMockTriangle(overrides: Partial<FabricTriangleObject> = {}): FabricTriangleObject {
  return {
    type: 'triangle',
    left: 50,
    top: 50,
    width: 60,
    height: 80,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'center',
    originY: 'center',
    fill: '#FFFF00',
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
  } as FabricTriangleObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawSvgPath: vi.fn(),
      pushGraphicsState: vi.fn(),
      pushOperators: vi.fn(),
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

describe('TriangleRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "triangle"', () => {
      const renderer = new TriangleRenderer();
      expect(renderer.type).toBe('triangle');
    });

    it('should render triangle objects', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle();
      expect(renderer.canRender(triangle)).toBe(true);
    });

    it('should not render non-triangle objects', () => {
      const renderer = new TriangleRenderer();
      const rect = { ...createMockTriangle(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('triangle rendering', () => {
    it('should call drawSvgPath', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle();
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      expect(context.page.drawSvgPath).toHaveBeenCalled();
    });

    it('should generate valid SVG path for triangle', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({
        width: 60,
        height: 80,
      });
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const call = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(typeof call).toBe('string');
      expect(call).toContain('M');
      expect(call).toContain('L');
      expect(call).toContain('Z'); // Closed path
    });

    it('should generate correct triangle path points for center origin', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({
        width: 60,
        height: 80,
        originX: 'center',
        originY: 'center',
      });
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const path = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0] as string;
      // Triangle with center origin: point at higher Y in PDF coords
      // For width=60, height=80:
      // - Point at (30, 80) - higher Y in PDF (pointing up)
      // - Base from (0, 0) to (60, 0)
      // - After origin offset (-30, -40), bbox center is at origin
      expect(path).toContain('M 30 80');
      expect(path).toContain('L 0 0');
      expect(path).toContain('L 60 0');
    });

    it('should generate correct triangle path points for top origin', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({
        width: 60,
        height: 80,
        originX: 'left',
        originY: 'top',
      });
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const path = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0] as string;
      // Triangle with top origin: point at origin (top of bbox)
      // For width=60, height=80:
      // - Point at (30, 0) - at origin in local coords
      // - Base at (0, -80) to (60, -80) - below origin
      // - After origin offset (0, 0), point is at origin
      expect(path).toContain('M 30 0');
      expect(path).toContain('L 0 -80');
      expect(path).toContain('L 60 -80');
    });

    it('should apply fill color', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({ fill: '#FF0000' });
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeDefined();
    });

    it('should apply stroke color and width', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.borderColor).toBeDefined();
      expect(options.borderWidth).toBe(2);
    });
  });

  describe('fill only', () => {
    it('should render fill without stroke', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({
        fill: '#00FF00',
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeDefined();
      expect(options.borderWidth).toBe(0);
    });
  });

  describe('stroke only', () => {
    it('should render stroke without fill', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({
        fill: null,
        stroke: '#0000FF',
        strokeWidth: 3,
      });
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeUndefined();
      expect(options.borderColor).toBeDefined();
      expect(options.borderWidth).toBe(3);
    });
  });

  describe('no fill and no stroke', () => {
    it('should not render if both fill and stroke are null', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({
        fill: null,
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      expect(context.page.drawSvgPath).not.toHaveBeenCalled();
    });
  });

  describe('zero dimensions', () => {
    it('should handle zero width gracefully', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({ width: 0 });
      const context = createMockContext();

      expect(() => renderer.render(triangle, context.page, context)).not.toThrow();
    });

    it('should handle zero height gracefully', () => {
      const renderer = new TriangleRenderer();
      const triangle = createMockTriangle({ height: 0 });
      const context = createMockContext();

      expect(() => renderer.render(triangle, context.page, context)).not.toThrow();
    });
  });
});
