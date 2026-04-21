/**
 * Visual Position Verification Tests
 * 
 * These tests verify that elements are positioned correctly in generated PDFs
 * by converting PDFs to images and analyzing pixel content.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { 
  pdfToPng, 
  findContentBounds, 
  hasContentInRegion,
  savePng 
} from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject, FabricCircleObject } from '../../src/types';

describe('Visual Position Verification', () => {
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 400;

  describe('Single Object Positioning', () => {
    it('should position rect at expected coordinates with center origin', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [{
          type: 'rect',
          left: 200,
          top: 200,
          width: 100,
          height: 100,
          fill: '#FF0000',
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'center',
          originY: 'center',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
          rx: 0,
          ry: 0,
        } as FabricRectObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      // Convert to PNG and analyze
      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'position-center-origin.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // With center origin at (200, 200), rect should be centered there
      // Canvas Y is down, PDF Y is up, so PDF Y = 400 - 200 = 200
      // Rect extends from (150, 150) to (250, 250) in canvas coords
      // In PDF: x: 150-250, y: 150-250 (flipped)
      // Allow tolerance for rendering
      expect(bounds!.x).toBeGreaterThan(140);
      expect(bounds!.x).toBeLessThan(160);
      expect(bounds!.y).toBeGreaterThan(140);
      expect(bounds!.y).toBeLessThan(160);
      expect(bounds!.width).toBeGreaterThan(90);
      expect(bounds!.width).toBeLessThan(110);
      expect(bounds!.height).toBeGreaterThan(90);
      expect(bounds!.height).toBeLessThan(110);
    });

    it('should position multiple objects at correct relative positions', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          {
            type: 'rect',
            left: 100,
            top: 100,
            width: 50,
            height: 50,
            fill: '#FF0000',
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            skewX: 0,
            skewY: 0,
            flipX: false,
            flipY: false,
            originX: 'center',
            originY: 'center',
            stroke: null,
            strokeWidth: 0,
            opacity: 1,
            visible: true,
            rx: 0,
            ry: 0,
          } as FabricRectObject,
          {
            type: 'rect',
            left: 300,
            top: 100,
            width: 50,
            height: 50,
            fill: '#00FF00',
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            skewX: 0,
            skewY: 0,
            flipX: false,
            flipY: false,
            originX: 'center',
            originY: 'center',
            stroke: null,
            strokeWidth: 0,
            opacity: 1,
            visible: true,
            rx: 0,
            ry: 0,
          } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'position-two-rects.png');

      // Check that content exists in both expected regions
      // First rect: centered at (100, 100), so from (75, 75) to (125, 125)
      const hasFirstRect = hasContentInRegion(pngBuffer, 70, 270, 60, 60);
      // Second rect: centered at (300, 100), so from (275, 275) to (325, 325)
      const hasSecondRect = hasContentInRegion(pngBuffer, 270, 270, 60, 60);

      expect(hasFirstRect).toBe(true);
      expect(hasSecondRect).toBe(true);
    });

    it('should flip Y coordinates correctly (canvas Y-down to PDF Y-up)', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [
          {
            type: 'rect',
            left: 100,
            top: 50, // Near top of canvas
            width: 50,
            height: 50,
            fill: '#FF0000',
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            skewX: 0,
            skewY: 0,
            flipX: false,
            flipY: false,
            originX: 'center',
            originY: 'center',
            stroke: null,
            strokeWidth: 0,
            opacity: 1,
            visible: true,
            rx: 0,
            ry: 0,
          } as FabricRectObject,
          {
            type: 'rect',
            left: 100,
            top: 350, // Near bottom of canvas
            width: 50,
            height: 50,
            fill: '#00FF00',
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            skewX: 0,
            skewY: 0,
            flipX: false,
            flipY: false,
            originX: 'center',
            originY: 'center',
            stroke: null,
            strokeWidth: 0,
            opacity: 1,
            visible: true,
            rx: 0,
            ry: 0,
          } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'position-y-flip.png');

      // In canvas: first rect at top (y=50), second at bottom (y=350)
      // In PDF: first rect should be at bottom (y=350), second at top (y=50)
      // Check that red rect (top in canvas) is at bottom in PDF
      const redAtBottom = hasContentInRegion(pngBuffer, 70, 20, 60, 80);
      // Check that green rect (bottom in canvas) is at top in PDF
      const greenAtTop = hasContentInRegion(pngBuffer, 70, 320, 60, 80);

      expect(redAtBottom).toBe(true);
      expect(greenAtTop).toBe(true);
    });
  });

  describe('Origin Handling', () => {
    it('should position with left/top origin correctly', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [{
          type: 'rect',
          left: 100,
          top: 100,
          width: 80,
          height: 80,
          fill: '#FF0000',
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'left',
          originY: 'top',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
          rx: 0,
          ry: 0,
        } as FabricRectObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'position-left-top-origin.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // With left/top origin at (100, 100):
      // In canvas: rect starts at (100, 100), extends to (180, 180)
      // In PDF: x same, y flipped: 400 - 180 = 220 to 400 - 100 = 300
      expect(bounds!.x).toBeGreaterThan(95);
      expect(bounds!.x).toBeLessThan(105);
      expect(bounds!.y).toBeGreaterThan(215);
      expect(bounds!.y).toBeLessThan(230);
    });

    it('should position circle at correct center point', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [{
          type: 'circle',
          left: 200,
          top: 200,
          radius: 50,
          fill: '#0000FF',
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'center',
          originY: 'center',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        } as FabricCircleObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'position-circle.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // Circle centered at (200, 200) with radius 50
      // Should be roughly centered in the image
      const centerX = bounds!.x + bounds!.width / 2;
      const centerY = bounds!.y + bounds!.height / 2;

      expect(centerX).toBeGreaterThan(190);
      expect(centerX).toBeLessThan(210);
      expect(centerY).toBeGreaterThan(190);
      expect(centerY).toBeLessThan(210);
    });
  });

  describe('Edge Cases', () => {
    it('should handle object at canvas origin (0,0)', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        objects: [{
          type: 'rect',
          left: 0,
          top: 0,
          width: 50,
          height: 50,
          fill: '#FF0000',
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'left',
          originY: 'top',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
          rx: 0,
          ry: 0,
        } as FabricRectObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'position-at-origin.png');

      // With origin at (0,0) and left/top origin, rect should be at top-left of PDF
      // In PDF Y: 400 - 0 - 50 = 350, so rect is at bottom-left
      const hasContent = hasContentInRegion(pngBuffer, 0, 350, 60, 60);
      expect(hasContent).toBe(true);
    });
  });
});
