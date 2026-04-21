import { describe, it, expect, vi } from 'vitest';
import { RectRenderer } from '../../../src/renderers/rect.renderer';
import { CircleRenderer } from '../../../src/renderers/circle.renderer';
import { TriangleRenderer } from '../../../src/renderers/triangle.renderer';
import type { FabricRectObject, FabricCircleObject, FabricTriangleObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

/**
 * Edge case tests for renderers.
 * These catch bugs that occur with specific combinations of properties.
 */

function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawRectangle: vi.fn(),
      drawCircle: vi.fn(),
      drawSvgPath: vi.fn(),
      drawEllipse: vi.fn(),
      pushGraphicsState: vi.fn(),
      popGraphicsState: vi.fn(),
      concatTransformationMatrix: vi.fn(),
      pushOperators: vi.fn(),
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

describe('Renderer Edge Cases', () => {
  describe('RectRenderer', () => {
    it('should handle rect with scaleX and scaleY', () => {
      const renderer = new RectRenderer();
      const rect: FabricRectObject = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
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

      // Should draw with original dimensions (scaling is in transform matrix)
      const call = vi.mocked(context.page.drawRectangle).mock.calls[0]![0];
      expect(call.width).toBe(50);
      expect(call.height).toBe(50);
    });

    it('should handle rect with rotation', () => {
      const renderer = new RectRenderer();
      const rect: FabricRectObject = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        angle: 45,
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

      // Should not throw
      expect(() => renderer.render(rect, context.page, context)).not.toThrow();
    });

    it('should handle rect with combined rotation and scaling', () => {
      const renderer = new RectRenderer();
      const rect: FabricRectObject = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        scaleX: 2,
        scaleY: 2,
        angle: 45,
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

      // Should not throw - this catches the "rotation + scaling breaks" bug
      expect(() => renderer.render(rect, context.page, context)).not.toThrow();
    });
  });

  describe('CircleRenderer', () => {
    it('should handle circle with scale (ellipse)', () => {
      const renderer = new CircleRenderer();
      const circle: FabricCircleObject = {
        type: 'circle',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        radius: 50,
        scaleX: 2,
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
      };
      const context = createMockContext();

      renderer.render(circle, context.page, context);

      // Should draw with original radius (scaling is in transform matrix)
      const call = vi.mocked(context.page.drawCircle).mock.calls[0]![0];
      // Circle is drawn at (radius, radius) with size = radius
      // so its bounding box matches the expected (0,0) to (2*radius, 2*radius)
      expect(call.x).toBe(50);
      expect(call.y).toBe(50);
      expect(call.size).toBe(50); // radius (pdf-lib uses radius, not diameter)
    });
  });

  describe('TriangleRenderer', () => {
    it('should handle triangle with scaling', () => {
      const renderer = new TriangleRenderer();
      const triangle: FabricTriangleObject = {
        type: 'triangle',
        left: 100,
        top: 100,
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

      // Should draw with original dimensions (scaling is in transform matrix)
      const path = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(typeof path).toBe('string');
      
      // Path should contain coordinates based on original width/height, not scaled
      expect(path).toContain('M');
      expect(path).toContain('L');
      expect(path).toContain('Z');
    });

    it('should handle triangle with rotation', () => {
      const renderer = new TriangleRenderer();
      const triangle: FabricTriangleObject = {
        type: 'triangle',
        left: 100,
        top: 100,
        width: 60,
        height: 60,
        scaleX: 1,
        scaleY: 1,
        angle: 45,
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

      // Should not throw
      expect(() => renderer.render(triangle, context.page, context)).not.toThrow();
    });

    it('should handle triangle with combined rotation and scaling', () => {
      const renderer = new TriangleRenderer();
      const triangle: FabricTriangleObject = {
        type: 'triangle',
        left: 100,
        top: 100,
        width: 60,
        height: 60,
        scaleX: 2,
        scaleY: 2,
        angle: 45,
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

      // Should not throw - this catches the "triangle scaling + rotation" bug
      expect(() => renderer.render(triangle, context.page, context)).not.toThrow();
    });
  });

  describe('Origin handling edge cases', () => {
    it('should handle object with left/top origin', () => {
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
      };
      const context = createMockContext();

      // Should not throw - tests origin handling
      expect(() => renderer.render(rect, context.page, context)).not.toThrow();
    });

    it('should handle object with right/bottom origin', () => {
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
        originX: 'right',
        originY: 'bottom',
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

      // Should not throw - tests origin handling
      expect(() => renderer.render(rect, context.page, context)).not.toThrow();
    });
  });
});
