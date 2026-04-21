/**
 * PDF.js Origin Handling and Graphics State Isolation Tests
 */

import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { extractElements, extractOperators } from '../helpers/pdfjs-helpers';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

describe('PDF.js Origin Handling', () => {
  describe('Center Origin (Default)', () => {
    it('should position with center origin correctly', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [{
          type: 'rect',
          left: 100,
          top: 100,
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

      const elements = await extractElements(result.pdfBytes);

      // With center origin at (100, 100):
      // - Center is at (100, 100)
      // - Rect extends from (50, 50) to (150, 150)
      // - In PDF Y: 600 - 100 = 500, so y from 450 to 550
      expect(elements[0].bounds.x).toBeCloseTo(50, 1);
      expect(elements[0].bounds.y).toBeCloseTo(450, 1);
    });
  });

  describe('Left/Top Origin', () => {
    it('should position with left/top origin correctly', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [{
          type: 'rect',
          left: 100,
          top: 100,
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

      const elements = await extractElements(result.pdfBytes);

      // With left/top origin at (100, 100):
      // - Top-left is at (100, 100)
      // - Rect extends from (100, 100) to (200, 200)
      // - In PDF Y: 600 - 100 = 500, so y from 400 to 500
      expect(elements[0].bounds.x).toBeCloseTo(100, 1);
      expect(elements[0].bounds.y).toBeCloseTo(400, 1);
    });
  });

  describe('Right/Bottom Origin', () => {
    it('should position with right/bottom origin correctly', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [{
          type: 'rect',
          left: 100,
          top: 100,
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
          originX: 'right',
          originY: 'bottom',
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

      const elements = await extractElements(result.pdfBytes);

      // With right/bottom origin at (100, 100):
      // - Bottom-right is at (100, 100)
      // - Rect extends from (0, 0) to (100, 100)
      // - In PDF Y: 600 - 100 = 500
      expect(elements[0].bounds.x).toBeCloseTo(0, 1);
      expect(elements[0].bounds.y).toBeCloseTo(500, 1);
    });
  });
});

describe('PDF.js Graphics State Isolation', () => {
  it('should save and restore graphics state for each object', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [
        {
          type: 'rect',
          left: 100,
          top: 100,
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
        } as FabricRectObject,
        {
          type: 'rect',
          left: 300,
          top: 100,
          width: 100,
          height: 100,
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

    const operators = await extractOperators(result.pdfBytes);
    
    // Count save (q) and restore (Q) operators
    const saveCount = operators.filter(op => op.name === 'save').length;
    const restoreCount = operators.filter(op => op.name === 'restore').length;
    
    // Should have balanced save/restore
    expect(saveCount).toBe(restoreCount);
    // Should have at least one per object
    expect(saveCount).toBeGreaterThanOrEqual(2);
  });

  it('should not leak transformations between objects', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [
        {
          type: 'rect',
          left: 100,
          top: 100,
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
        } as FabricRectObject,
        {
          type: 'rect',
          left: 300,
          top: 100,
          width: 100,
          height: 100,
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

    const elements = await extractElements(result.pdfBytes);

    expect(elements).toHaveLength(2);
    
    // Second object should not have scale from first
    const [a, b] = elements[1].transform;
    const scaleX = Math.sqrt(a * a + b * b);
    
    expect(scaleX).toBeCloseTo(1, 5);
  });

  it('should handle multiple objects with different transforms', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [
        {
          type: 'rect',
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: '#FF0000',
          scaleX: 2,
          scaleY: 1,
          angle: 30,
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
          width: 100,
          height: 100,
          fill: '#00FF00',
          scaleX: 1,
          scaleY: 2,
          angle: -30,
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
          left: 500,
          top: 100,
          width: 100,
          height: 100,
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
          rx: 0,
          ry: 0,
        } as FabricRectObject,
      ],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);

    const elements = await extractElements(result.pdfBytes);

    expect(elements).toHaveLength(3);
    
    // Each object should have its own transform
    // Object 1: scaleX=2, angle=30
    const scaleX1 = Math.sqrt(
      elements[0].transform[0] ** 2 + elements[0].transform[1] ** 2
    );
    expect(scaleX1).toBeCloseTo(2, 5);
    
    // Object 2: scaleY=2, angle=-30
    const scaleY2 = Math.sqrt(
      elements[1].transform[2] ** 2 + elements[1].transform[3] ** 2
    );
    expect(scaleY2).toBeCloseTo(2, 5);
    
    // Object 3: no scale, no rotation
    const scaleX3 = Math.sqrt(
      elements[2].transform[0] ** 2 + elements[2].transform[1] ** 2
    );
    expect(scaleX3).toBeCloseTo(1, 5);
  });
});
