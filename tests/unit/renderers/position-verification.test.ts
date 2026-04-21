import { describe, it, expect, vi } from 'vitest';
import { RectRenderer } from '../../../src/renderers/rect.renderer';
import { CircleRenderer } from '../../../src/renderers/circle.renderer';
import { TriangleRenderer } from '../../../src/renderers/triangle.renderer';
import type { FabricRectObject, FabricCircleObject, FabricTriangleObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

/**
 * These tests verify that objects are drawn at the correct positions.
 * They capture the actual coordinates passed to pdf-lib drawing methods.
 */

function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawRectangle: vi.fn(),
      drawCircle: vi.fn(),
      drawSvgPath: vi.fn(),
      pushGraphicsState: vi.fn(),
      popGraphicsState: vi.fn(),
      concatTransformationMatrix: vi.fn(),
      pushOperators: vi.fn(),
    } as unknown as PDFPage,
    fontManager: {} as RenderContext['fontManager'],
    imageLoader: {} as RenderContext['imageLoader'],
    options: {
      scale: 1,
      pageWidth: 800,
      pageHeight: 600,
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

describe('Position Verification Tests', () => {
  describe('RectRenderer positioning', () => {
    it('should draw rectangle with original dimensions (not scaled)', () => {
      const renderer = new RectRenderer();
      const rect: FabricRectObject = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        scaleX: 2,
        scaleY: 3,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        originY: 'center',
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
      };
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      // Verify drawRectangle was called with original dimensions
      expect(context.page.drawRectangle).toHaveBeenCalled();
      
      const call = vi.mocked(context.page.drawRectangle).mock.calls[0]![0];
      
      // Dimensions should be original (scaling is in transformation matrix)
      expect(call.width).toBe(100);
      expect(call.height).toBe(50);
      
      // Should NOT have scale multiplied
      expect(call.width).not.toBe(200);
      expect(call.height).not.toBe(150);
    });

    it('should apply transformation via pushOperators', () => {
      const renderer = new RectRenderer();
      const rect: FabricRectObject = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        originY: 'center',
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
      };
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      // Transformation is applied via pushOperators (not concatTransformationMatrix directly)
      expect(context.page.pushOperators).toHaveBeenCalled();
    });
  });

  describe('CircleRenderer positioning', () => {
    it('should draw circle at correct local position', () => {
      const renderer = new CircleRenderer();
      const circle: FabricCircleObject = {
        type: 'circle',
        left: 150,
        top: 150,
        width: 100,
        height: 100,
        radius: 50,
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
      };
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      const call = vi.mocked(context.page.drawCircle).mock.calls[0]![0];

      // Circle should be drawn at (radius, radius) so its bounding box
      // is from (0, 0) to (2*radius, 2*radius), matching rect behavior
      expect(call.x).toBe(50);
      expect(call.y).toBe(50);
      expect(call.size).toBe(50); // radius (pdf-lib uses radius, not diameter)
    });
  });

  describe('TriangleRenderer positioning', () => {
    it('should draw triangle with correct path coordinates', () => {
      const renderer = new TriangleRenderer();
      const triangle: FabricTriangleObject = {
        type: 'triangle',
        left: 200,
        top: 200,
        width: 60,
        height: 60,
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
      };
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const path = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];

      // Canvas-Y-down contract: tip at y=0 (top of bbox),
      // base at y=height (bottom of bbox). Origin is handled by the
      // transform layer, not the path.
      expect(path).toContain('M 30 0');
      expect(path).toContain('L 0 60');
      expect(path).toContain('L 60 60');
    });

    it('should NOT multiply dimensions by scale in path generation', () => {
      const renderer = new TriangleRenderer();
      const triangle: FabricTriangleObject = {
        type: 'triangle',
        left: 200,
        top: 200,
        width: 60,
        height: 60,
        scaleX: 2,
        scaleY: 2,
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
      };
      const context = createMockContext();

      renderer.render(triangle, context.page, context);

      const path = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];

      // Even with scaleX=2, scaleY=2, the path should use intrinsic
      // width/height. Scaling is applied by the transform matrix.
      // Canvas-Y-down: tip at y=0, base at y=height.
      expect(path).toContain('M 30 0');
      expect(path).toContain('L 0 60');
      expect(path).not.toContain('L 0 120');
    });
  });

  describe('Transformation matrix verification', () => {
    it('should apply transformation for positioned object', () => {
      const renderer = new RectRenderer();
      const rect: FabricRectObject = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        originY: 'center',
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
      };
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      // pushOperators should be called twice: once for graphics state, once for transformation
      expect(context.page.pushOperators).toHaveBeenCalled();
      
      // Get all pushOperators calls
      const calls = vi.mocked(context.page.pushOperators).mock.calls;
      
      // Should have at least one call for the transformation matrix
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should apply origin offset for left/top origin', () => {
      const renderer = new RectRenderer();
      const rect: FabricRectObject = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: 'left', // Not center
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
      };
      const context = createMockContext();

      renderer.render(rect, context.page, context);

      // Should apply transformation (which includes origin offset)
      expect(context.page.pushOperators).toHaveBeenCalled();
    });
  });
});
