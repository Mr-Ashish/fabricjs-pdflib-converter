import { describe, it, expect, vi } from 'vitest';
import { PolylineRenderer } from '../../../src/renderers/polyline.renderer';
import type { FabricPolylineObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock polyline objects
function createMockPolyline(overrides: Partial<FabricPolylineObject> = {}): FabricPolylineObject {
  return {
    type: 'polyline',
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
    points: [{ x: 0, y: 0 }, { x: 50, y: 25 }, { x: 100, y: 0 }],
    ...overrides,
  } as FabricPolylineObject;
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

describe('PolylineRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "polyline"', () => {
      const renderer = new PolylineRenderer();
      expect(renderer.type).toBe('polyline');
    });

    it('should render polyline objects', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline();
      expect(renderer.canRender(polyline)).toBe(true);
    });

    it('should not render non-polyline objects', () => {
      const renderer = new PolylineRenderer();
      const rect = { ...createMockPolyline(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('basic polyline rendering', () => {
    it('should call drawSvgPath for polyline', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline();
      const context = createMockContext();

      renderer.render(polyline, context.page, context);

      expect(context.page.drawSvgPath).toHaveBeenCalled();
    });

    it('should convert points to open SVG path', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        points: [{ x: 0, y: 0 }, { x: 50, y: 25 }, { x: 100, y: 0 }],
      });
      const context = createMockContext();

      renderer.render(polyline, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(typeof svgPath).toBe('string');
      expect(svgPath).toContain('M');
      expect(svgPath).toContain('L');
      expect(svgPath).not.toContain('Z'); // Should not close path
    });

    it('should generate correct path for multiple points', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 50 },
          { x: 90, y: 10 },
        ],
      });
      const context = createMockContext();

      renderer.render(polyline, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toMatch(/M\s+10\s+10/);
      expect(svgPath).toMatch(/L\s+50\s+50/);
      expect(svgPath).toMatch(/L\s+90\s+10/);
    });

    it('should apply stroke color and width', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(polyline, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.borderColor).toBeDefined();
      expect(options.borderWidth).toBe(2);
    });
  });

  describe('fill handling', () => {
    it('should not fill by default for polylines', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        fill: null,
        stroke: '#000000',
        strokeWidth: 1,
      });
      const context = createMockContext();

      renderer.render(polyline, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeUndefined();
    });

    it('should render fill if explicitly set', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        fill: '#FF0000',
        stroke: '#000000',
        strokeWidth: 1,
      });
      const context = createMockContext();

      renderer.render(polyline, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeDefined();
    });
  });

  describe('no stroke handling', () => {
    it('should not render if no stroke and no fill', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        fill: null,
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(polyline, context.page, context);

      expect(context.page.drawSvgPath).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle single point gracefully', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        points: [{ x: 50, y: 50 }],
      });
      const context = createMockContext();

      expect(() => renderer.render(polyline, context.page, context)).not.toThrow();
    });

    it('should handle empty points array gracefully', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        points: [],
      });
      const context = createMockContext();

      expect(() => renderer.render(polyline, context.page, context)).not.toThrow();
    });

    it('should handle two points (simple line)', () => {
      const renderer = new PolylineRenderer();
      const polyline = createMockPolyline({
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      });
      const context = createMockContext();

      renderer.render(polyline, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toMatch(/M\s+0\s+0/);
      expect(svgPath).toMatch(/L\s+100\s+100/);
    });
  });
});
