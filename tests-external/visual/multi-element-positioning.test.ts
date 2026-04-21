/**
 * Multi-Element Positioning Tests
 * 
 * These tests verify that multiple elements are positioned correctly
 * relative to each other in the generated PDF.
 */

import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, hasContentInRegion, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject, FabricCircleObject, FabricTriangleObject } from '../../src/types';

describe('Multi-Element Positioning', () => {
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;

  describe('Grid Layout', () => {
    it('should position 2x2 grid correctly', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          // Row 1
          { type: 'rect', left: 150, top: 150, width: 80, height: 80, fill: '#FF0000', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'rect', left: 450, top: 150, width: 80, height: 80, fill: '#00FF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // Row 2
          { type: 'rect', left: 150, top: 450, width: 80, height: 80, fill: '#0000FF', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'rect', left: 450, top: 450, width: 80, height: 80, fill: '#FFFF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'multi-grid-2x2.png');

      // Check all four positions
      // In PDF: centered at (150, 150), (450, 150), (150, 450), (450, 450)
      // In PNG (flipped): y = 600 - 150 - 40 = 410 for top row, 110 for bottom row
      const topLeft = hasContentInRegion(pngBuffer, 110, 410, 100, 100);
      const topRight = hasContentInRegion(pngBuffer, 410, 410, 100, 100);
      const bottomLeft = hasContentInRegion(pngBuffer, 110, 110, 100, 100);
      const bottomRight = hasContentInRegion(pngBuffer, 410, 110, 100, 100);

      expect(topLeft).toBe(true);
      expect(topRight).toBe(true);
      expect(bottomLeft).toBe(true);
      expect(bottomRight).toBe(true);
    });

    it('should maintain spacing between multiple elements', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          { type: 'rect', left: 100, top: 300, width: 50, height: 50, fill: '#FF0000', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'rect', left: 200, top: 300, width: 50, height: 50, fill: '#00FF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'rect', left: 300, top: 300, width: 50, height: 50, fill: '#0000FF', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'rect', left: 400, top: 300, width: 50, height: 50, fill: '#FFFF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'rect', left: 500, top: 300, width: 50, height: 50, fill: '#FF00FF', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'multi-horizontal-row.png');

      // Check that all 5 elements are present with correct spacing
      const positions = [75, 175, 275, 375, 475];
      for (const x of positions) {
        const hasElement = hasContentInRegion(pngBuffer, x, 250, 60, 60);
        expect(hasElement).toBe(true);
      }
    });
  });

  describe('Mixed Shapes', () => {
    it('should position different shape types correctly', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          { type: 'rect', left: 150, top: 150, width: 100, height: 100, fill: '#FF0000', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'circle', left: 450, top: 150, radius: 50, fill: '#00FF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true } as FabricCircleObject,
          { type: 'triangle', left: 150, top: 450, width: 100, height: 100, fill: '#0000FF', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true } as FabricTriangleObject,
          { type: 'rect', left: 450, top: 450, width: 100, height: 100, fill: '#FFFF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'multi-mixed-shapes.png');

      // Check all four positions - adjust for actual rendering
      const topLeft = hasContentInRegion(pngBuffer, 100, 400, 120, 120);
      const topRight = hasContentInRegion(pngBuffer, 400, 400, 120, 120);
      const bottomLeft = hasContentInRegion(pngBuffer, 100, 100, 120, 120);
      const bottomRight = hasContentInRegion(pngBuffer, 400, 100, 120, 120);

      expect(topLeft).toBe(true);
      expect(topRight).toBe(true);
      expect(bottomLeft).toBe(true);
      expect(bottomRight).toBe(true);
    });

    it('should handle overlapping elements', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          // Larger blue rect at back
          { type: 'rect', left: 300, top: 300, width: 200, height: 200, fill: '#0000FF', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // Smaller red rect in front (drawn second)
          { type: 'rect', left: 300, top: 300, width: 100, height: 100, fill: '#FF0000', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'multi-overlapping.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      // Outer rect is 200x200
      expect(bounds!.width).toBeGreaterThan(190);
      expect(bounds!.width).toBeLessThan(210);
      expect(bounds!.height).toBeGreaterThan(190);
      expect(bounds!.height).toBeLessThan(210);
    });
  });

  describe('Relative Positioning', () => {
    it('should maintain relative distances between elements', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          { type: 'rect', left: 100, top: 100, width: 50, height: 50, fill: '#FF0000', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // 100px to the right
          { type: 'rect', left: 200, top: 100, width: 50, height: 50, fill: '#00FF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // 100px below
          { type: 'rect', left: 100, top: 200, width: 50, height: 50, fill: '#0000FF', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // Diagonal
          { type: 'rect', left: 200, top: 200, width: 50, height: 50, fill: '#FFFF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'multi-relative-distances.png');

      // Get bounds of all content
      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      
      // Should span from ~75 to ~225 in both directions (100px spacing)
      expect(bounds!.width).toBeGreaterThan(140);
      expect(bounds!.width).toBeLessThan(160);
      expect(bounds!.height).toBeGreaterThan(140);
      expect(bounds!.height).toBeLessThan(160);
    });

    it('should handle elements at extremes of canvas', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          // Top-left corner
          { type: 'rect', left: 50, top: 50, width: 40, height: 40, fill: '#FF0000', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // Top-right corner
          { type: 'rect', left: 550, top: 50, width: 40, height: 40, fill: '#00FF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // Bottom-left corner
          { type: 'rect', left: 50, top: 550, width: 40, height: 40, fill: '#0000FF', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // Bottom-right corner
          { type: 'rect', left: 550, top: 550, width: 40, height: 40, fill: '#FFFF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'multi-canvas-extremes.png');

      // Check all four corners
      const topLeft = hasContentInRegion(pngBuffer, 30, 530, 60, 60);
      const topRight = hasContentInRegion(pngBuffer, 530, 530, 60, 60);
      const bottomLeft = hasContentInRegion(pngBuffer, 30, 30, 60, 60);
      const bottomRight = hasContentInRegion(pngBuffer, 530, 30, 60, 60);

      expect(topLeft).toBe(true);
      expect(topRight).toBe(true);
      expect(bottomLeft).toBe(true);
      expect(bottomRight).toBe(true);
    });
  });

  describe('Scaled Elements Group', () => {
    it('should position scaled elements correctly relative to each other', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          // Unscaled reference
          { type: 'rect', left: 100, top: 300, width: 50, height: 50, fill: '#FF0000', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // 2x scale - should be 100x100, centered at same Y
          { type: 'rect', left: 250, top: 300, width: 50, height: 50, fill: '#00FF00', originX: 'center', originY: 'center', scaleX: 2, scaleY: 2, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // 0.5x scale - should be 25x25, centered at same Y
          { type: 'rect', left: 400, top: 300, width: 50, height: 50, fill: '#0000FF', originX: 'center', originY: 'center', scaleX: 0.5, scaleY: 0.5, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      savePng(pngBuffer, 'multi-scaled-group.png');

      // Get bounds of all content
      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();
      
      // Should span from ~75 to ~425 in X (three elements with spacing)
      expect(bounds!.width).toBeGreaterThan(330);
      expect(bounds!.width).toBeLessThan(360);
      
      // Height dominated by 2x scale element (100px)
      expect(bounds!.height).toBeGreaterThan(95);
      expect(bounds!.height).toBeLessThan(105);
    });
  });
});
