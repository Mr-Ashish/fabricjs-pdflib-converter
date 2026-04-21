/**
 * Visual Rotation Verification Tests
 * 
 * These tests verify that rotation is applied correctly by checking
 * bounding box dimensions of rotated elements.
 */

import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

describe('Visual Rotation Verification', () => {
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 400;

  describe('Rotation Effects on Bounds', () => {
    it('should produce larger bounding box for 45-degree rotated square', async () => {
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
          angle: 45,
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

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'rotation-45deg.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // A 100x100 square rotated 45° should have bounding box of ~141x141
      // (100 * sqrt(2) ≈ 141.4)
      expect(bounds!.width).toBeGreaterThan(130);
      expect(bounds!.width).toBeLessThan(155);
      expect(bounds!.height).toBeGreaterThan(130);
      expect(bounds!.height).toBeLessThan(155);
    });

    it('should maintain same bounds for 0 and 90 degree rotation', async () => {
      // 0° and 90° rotations of a square should have same bounding box
      const angles = [0, 90];
      const sizes: Array<{ width: number; height: number }> = [];

      for (const angle of angles) {
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
            angle,
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

        const pngBuffer = await pdfToPng(result.pdfBytes, { 
          width: CANVAS_WIDTH, 
          height: CANVAS_HEIGHT 
        });

        const bounds = findContentBounds(pngBuffer);
        expect(bounds).not.toBeNull();
        sizes.push({ width: bounds!.width, height: bounds!.height });
      }

      // Both should be approximately 100x100
      expect(sizes[0]!.width).toBeGreaterThan(90);
      expect(sizes[0]!.width).toBeLessThan(110);
      expect(sizes[1]!.width).toBeGreaterThan(90);
      expect(sizes[1]!.width).toBeLessThan(110);
    });
  });

  describe('Combined Rotation and Scale', () => {
    it('should handle rotation with scale together', async () => {
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
          scaleX: 2,
          scaleY: 2,
          angle: 45,
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

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'rotation-and-scale.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // 100x100 square, scaled 2x = 200x200, rotated 45°
      // Bounding box should be 200 * sqrt(2) ≈ 282.8
      expect(bounds!.width).toBeGreaterThan(270);
      expect(bounds!.width).toBeLessThan(295);
      expect(bounds!.height).toBeGreaterThan(270);
      expect(bounds!.height).toBeLessThan(295);
    });
  });

  describe('Center of Rotation', () => {
    it('should rotate around object center (not origin)', async () => {
      // A rect rotated 45° should stay roughly centered at its position
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
          angle: 45,
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

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'rotation-center.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // Center of bounding box should be near (200, 200)
      const centerX = bounds!.x + bounds!.width / 2;
      const centerY = bounds!.y + bounds!.height / 2;

      // In PDF Y: 400 - 200 = 200, so center should be at (200, 200)
      expect(centerX).toBeGreaterThan(190);
      expect(centerX).toBeLessThan(210);
      expect(centerY).toBeGreaterThan(190);
      expect(centerY).toBeLessThan(210);
    });
  });
});
