/**
 * Visual Scale Verification Tests
 * 
 * These tests verify that scaling is applied correctly by measuring
 * the rendered size of elements in generated PDFs.
 */

import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

describe('Visual Scale Verification', () => {
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 400;

  describe('Uniform Scale', () => {
    it('should apply 2x scale correctly', async () => {
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

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'scale-2x.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // 100x100 rect with 2x scale should be 200x200
      // Allow tolerance for rendering
      expect(bounds!.width).toBeGreaterThan(190);
      expect(bounds!.width).toBeLessThan(210);
      expect(bounds!.height).toBeGreaterThan(190);
      expect(bounds!.height).toBeLessThan(210);
    });

    it('should apply 0.5x scale correctly', async () => {
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
          scaleX: 0.5,
          scaleY: 0.5,
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

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'scale-0.5x.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // 100x100 rect with 0.5x scale should be 50x50
      expect(bounds!.width).toBeGreaterThan(45);
      expect(bounds!.width).toBeLessThan(55);
      expect(bounds!.height).toBeGreaterThan(45);
      expect(bounds!.height).toBeLessThan(55);
    });
  });

  describe('Non-Uniform Scale', () => {
    it('should apply different X and Y scales', async () => {
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
          scaleY: 0.5,
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

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'scale-non-uniform.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // 100x100 rect with scaleX=2, scaleY=0.5 should be 200x50
      expect(bounds!.width).toBeGreaterThan(190);
      expect(bounds!.width).toBeLessThan(210);
      expect(bounds!.height).toBeGreaterThan(45);
      expect(bounds!.height).toBeLessThan(55);
    });
  });

  describe('No Double Scaling', () => {
    it('should NOT double-scale when using transformation matrix', async () => {
      // This test verifies that we don't have the double-scaling bug
      // where both the renderer multiplies dimensions AND the matrix applies scale
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

      const pngBuffer = await pdfToPng(result.pdfBytes, { 
        width: CANVAS_WIDTH, 
        height: CANVAS_HEIGHT 
      });
      savePng(pngBuffer, 'scale-no-double.png');

      const bounds = findContentBounds(pngBuffer);
      expect(bounds).not.toBeNull();

      // If double-scaling occurred, we'd see 400x400
      // Correct size is 200x200
      // So we verify it's NOT 400x400
      expect(bounds!.width).toBeLessThan(250);
      expect(bounds!.height).toBeLessThan(250);

      // And verify it IS approximately 200x200
      expect(bounds!.width).toBeGreaterThan(190);
      expect(bounds!.height).toBeGreaterThan(190);
    });
  });

  describe('Scale Comparison', () => {
    it('should produce different sizes for different scales', async () => {
      const scales = [0.5, 1, 1.5, 2];
      const sizes: number[] = [];

      for (const scale of scales) {
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
            scaleX: scale,
            scaleY: scale,
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

        const pngBuffer = await pdfToPng(result.pdfBytes, { 
          width: CANVAS_WIDTH, 
          height: CANVAS_HEIGHT 
        });

        const bounds = findContentBounds(pngBuffer);
        expect(bounds).not.toBeNull();
        sizes.push(bounds!.width);
      }

      // Verify sizes increase with scale
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(sizes[i - 1]!);
      }

      // Verify approximate ratios
      // scale 0.5 -> ~50px, scale 1 -> ~100px, scale 1.5 -> ~150px, scale 2 -> ~200px
      expect(sizes[0]).toBeGreaterThan(45);
      expect(sizes[0]).toBeLessThan(60);
      expect(sizes[1]).toBeGreaterThan(90);
      expect(sizes[1]).toBeLessThan(110);
      expect(sizes[3]).toBeGreaterThan(190);
      expect(sizes[3]).toBeLessThan(210);
    });
  });
});
