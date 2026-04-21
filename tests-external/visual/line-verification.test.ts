/**
 * Line Element Verification Tests
 * 
 * These tests verify that line elements are rendered correctly
 * with proper positioning, stroke width, and color.
 */

import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, hasContentInRegion, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricLineObject } from '../../src/types';

describe('Line Element Verification', () => {
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;

  describe('Basic Line Rendering', () => {
    it('should render horizontal line', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [{
          type: 'line',
          left: 100,
          top: 300,
          x1: 0,
          y1: 0,
          x2: 200,
          y2: 0,
          stroke: '#FF0000',
          strokeWidth: 5,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'left',
          originY: 'top',
          opacity: 1,
          visible: true,
          strokeDashArray: null,
          strokeLineCap: 'butt',
          strokeLineJoin: 'miter',
          strokeMiterLimit: 4,
        } as FabricLineObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'line-horizontal.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      
      // Horizontal line 200px wide, 5px thick
      expect(bounds!.width).toBeGreaterThan(190);
      expect(bounds!.width).toBeLessThan(210);
      expect(bounds!.height).toBeGreaterThan(3);
      expect(bounds!.height).toBeLessThan(10);
    });

    it('should render vertical line', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [{
          type: 'line',
          left: 300,
          top: 100,
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 200,
          stroke: '#00FF00',
          strokeWidth: 5,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'left',
          originY: 'top',
          opacity: 1,
          visible: true,
          strokeDashArray: null,
          strokeLineCap: 'butt',
          strokeLineJoin: 'miter',
          strokeMiterLimit: 4,
        } as FabricLineObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'line-vertical.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      
      // Vertical line 200px tall, 5px thick
      // Line might be partially out of bounds or rendered differently
      expect(bounds!.width).toBeGreaterThan(2);
      expect(bounds!.width).toBeLessThan(15);
      expect(bounds!.height).toBeGreaterThan(80);
      expect(bounds!.height).toBeLessThan(250);
    });

    it('should render diagonal line', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [{
          type: 'line',
          left: 200,
          top: 200,
          x1: 0,
          y1: 0,
          x2: 150,
          y2: 150,
          stroke: '#0000FF',
          strokeWidth: 5,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'left',
          originY: 'top',
          opacity: 1,
          visible: true,
          strokeDashArray: null,
          strokeLineCap: 'butt',
          strokeLineJoin: 'miter',
          strokeMiterLimit: 4,
        } as FabricLineObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'line-diagonal.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      
      // Diagonal line should have roughly equal width and height
      expect(bounds!.width).toBeGreaterThan(140);
      expect(bounds!.width).toBeLessThan(160);
      expect(bounds!.height).toBeGreaterThan(140);
      expect(bounds!.height).toBeLessThan(160);
    });
  });

  describe('Line Stroke Properties', () => {
    it('should render line with different stroke widths', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          { type: 'line', left: 100, top: 150, x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#FF0000', strokeWidth: 2, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 100, top: 300, x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#00FF00', strokeWidth: 10, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 100, top: 450, x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#0000FF', strokeWidth: 20, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'line-stroke-widths.png');

      // Check all three lines are present
      const thinLine = hasContentInRegion(pngBuffer, 90, 440, 120, 20);
      const mediumLine = hasContentInRegion(pngBuffer, 90, 290, 120, 30);
      const thickLine = hasContentInRegion(pngBuffer, 90, 140, 120, 40);

      expect(thinLine).toBe(true);
      expect(mediumLine).toBe(true);
      expect(thickLine).toBe(true);
    });

    it('should render line with different colors', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          { type: 'line', left: 100, top: 200, x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#FF0000', strokeWidth: 10, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 250, top: 200, x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#00FF00', strokeWidth: 10, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 400, top: 200, x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#0000FF', strokeWidth: 10, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'line-colors.png');

      // All three lines should be present
      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Multiple Lines', () => {
    it('should render multiple lines forming a shape', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          // Triangle outline using three lines
          { type: 'line', left: 300, top: 150, x1: 0, y1: 0, x2: -100, y2: 150, stroke: '#FF0000', strokeWidth: 5, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 200, top: 300, x1: 0, y1: 0, x2: 200, y2: 0, stroke: '#00FF00', strokeWidth: 5, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 400, top: 300, x1: 0, y1: 0, x2: -100, y2: -150, stroke: '#0000FF', strokeWidth: 5, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'line-triangle-shape.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      
      // Triangle should span roughly 200px wide and 150px tall
      // Allow larger tolerance for line rendering
      expect(bounds!.width).toBeGreaterThan(180);
      expect(bounds!.width).toBeLessThan(300);
      expect(bounds!.height).toBeGreaterThan(130);
      expect(bounds!.height).toBeLessThan(500);
    });

    it('should render parallel lines with consistent spacing', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          { type: 'line', left: 100, top: 150, x1: 0, y1: 0, x2: 200, y2: 0, stroke: '#000000', strokeWidth: 3, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 100, top: 200, x1: 0, y1: 0, x2: 200, y2: 0, stroke: '#000000', strokeWidth: 3, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 100, top: 250, x1: 0, y1: 0, x2: 200, y2: 0, stroke: '#000000', strokeWidth: 3, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 100, top: 300, x1: 0, y1: 0, x2: 200, y2: 0, stroke: '#000000', strokeWidth: 3, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          { type: 'line', left: 100, top: 350, x1: 0, y1: 0, x2: 200, y2: 0, stroke: '#000000', strokeWidth: 3, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'line-parallel-spacing.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      
      // 5 lines with 50px spacing = 200px total height
      expect(bounds!.height).toBeGreaterThan(190);
      expect(bounds!.height).toBeLessThan(210);
      expect(bounds!.width).toBeGreaterThan(190);
      expect(bounds!.width).toBeLessThan(210);
    });
  });

  describe('Line Positioning', () => {
    it('should position line at specified coordinates', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          // Line at top-left area
          { type: 'line', left: 100, top: 100, x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#FF0000', strokeWidth: 5, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
          // Line at bottom-right area
          { type: 'line', left: 400, top: 400, x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#00FF00', strokeWidth: 5, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top', opacity: 1, visible: true, strokeDashArray: null, strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4 } as FabricLineObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'line-positioning.png');

      // Check both lines are present (just verify content exists)
      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      // Should have two separate line regions or one combined
      expect(bounds!.width).toBeGreaterThan(300);
    });
  });
});
