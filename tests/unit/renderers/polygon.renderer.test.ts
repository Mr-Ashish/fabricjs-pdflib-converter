import { describe, it, expect, vi } from 'vitest';
import { PolygonRenderer } from '../../../src/renderers/polygon.renderer';
import type { FabricPolygonObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock polygon objects
function createMockPolygon(overrides: Partial<FabricPolygonObject> = {}): FabricPolygonObject {
  return {
    type: 'polygon',
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
    points: [{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }],
    ...overrides,
  } as FabricPolygonObject;
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

describe('PolygonRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "polygon"', () => {
      const renderer = new PolygonRenderer();
      expect(renderer.type).toBe('polygon');
    });

    it('should render polygon objects', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon();
      expect(renderer.canRender(polygon)).toBe(true);
    });

    it('should not render non-polygon objects', () => {
      const renderer = new PolygonRenderer();
      const rect = { ...createMockPolygon(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('basic polygon rendering', () => {
    it('should call drawSvgPath for polygon', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon();
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      expect(context.page.drawSvgPath).toHaveBeenCalled();
    });

    it('should convert points to closed SVG path', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        points: [{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }],
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(typeof svgPath).toBe('string');
      expect(svgPath).toContain('M');
      expect(svgPath).toContain('L');
      expect(svgPath).toContain('Z'); // Should close path
    });

    it('should generate correct path for diamond shape', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        points: [
          { x: 50, y: 0 },
          { x: 100, y: 50 },
          { x: 50, y: 100 },
          { x: 0, y: 50 },
        ],
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toMatch(/M\s+50\s+0/);
      expect(svgPath).toMatch(/L\s+100\s+50/);
      expect(svgPath).toMatch(/L\s+50\s+100/);
      expect(svgPath).toMatch(/L\s+0\s+50/);
      expect(svgPath).toMatch(/Z/);
    });

    it('should apply fill color', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({ fill: '#FF0000' });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeDefined();
    });

    it('should apply stroke color and width', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.borderColor).toBeDefined();
      expect(options.borderWidth).toBe(2);
    });
  });

  describe('fill and stroke combinations', () => {
    it('should render fill only', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        fill: '#00FF00',
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeDefined();
      expect(options.borderWidth).toBe(0);
    });

    it('should render stroke only', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        fill: null,
        stroke: '#0000FF',
        strokeWidth: 3,
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeUndefined();
      expect(options.borderColor).toBeDefined();
      expect(options.borderWidth).toBe(3);
    });

    it('should render fill and stroke together', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        fill: '#FF0000',
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeDefined();
      expect(options.borderColor).toBeDefined();
      expect(options.borderWidth).toBe(2);
    });
  });

  describe('no fill and no stroke', () => {
    it('should not render if both fill and stroke are null', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        fill: null,
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      expect(context.page.drawSvgPath).not.toHaveBeenCalled();
    });
  });

  describe('different polygon shapes', () => {
    it('should handle triangle (3 points)', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        points: [{ x: 50, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toContain('M');
      expect(svgPath).toContain('Z');
    });

    it('should handle hexagon (6 points)', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        points: [
          { x: 50, y: 0 },
          { x: 100, y: 25 },
          { x: 100, y: 75 },
          { x: 50, y: 100 },
          { x: 0, y: 75 },
          { x: 0, y: 25 },
        ],
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toContain('M');
      expect(svgPath).toContain('Z');
    });
  });

  describe('edge cases', () => {
    it('should handle single point gracefully', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        points: [{ x: 50, y: 50 }],
      });
      const context = createMockContext();

      expect(() => renderer.render(polygon, context.page, context)).not.toThrow();
    });

    it('should handle empty points array gracefully', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        points: [],
      });
      const context = createMockContext();

      expect(() => renderer.render(polygon, context.page, context)).not.toThrow();
    });

    it('should handle two points gracefully', () => {
      const renderer = new PolygonRenderer();
      const polygon = createMockPolygon({
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      });
      const context = createMockContext();

      renderer.render(polygon, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toContain('M');
      expect(svgPath).toContain('Z');
    });
  });
});
