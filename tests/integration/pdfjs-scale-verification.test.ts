/**
 * PDF.js Scale Verification Tests
 * 
 * These tests verify that scaling is applied correctly via transformation
 * matrices and NOT by modifying element dimensions directly.
 */

import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { 
  extractElements, 
  extractOperators, 
  extractScaleFromMatrix 
} from '../helpers/pdfjs-helpers';
import type { FabricCanvasJSON, FabricRectObject, FabricTriangleObject } from '../../src/types';

describe('PDF.js Scale Verification', () => {
  describe('Scale in Transformation Matrix', () => {
    it('should apply uniform scale via transformation matrix', async () => {
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

      const operators = await extractOperators(result.pdfBytes);
      
      // Find transformation matrix operators (cm)
      const matrixOps = operators.filter(op => op.name === 'transform');
      expect(matrixOps.length).toBeGreaterThan(0);
      
      // The matrix should contain scale
      const matrix = matrixOps[0].args as number[];
      const { scaleX, scaleY } = extractScaleFromMatrix(matrix);
      
      expect(scaleX).toBeCloseTo(2, 5);
      expect(scaleY).toBeCloseTo(2, 5);
    });

    it('should apply non-uniform scale via transformation matrix', async () => {
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
          scaleX: 2,
          scaleY: 3,
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

      const operators = await extractOperators(result.pdfBytes);
      const matrixOps = operators.filter(op => op.name === 'transform');
      
      const matrix = matrixOps[0].args as number[];
      const { scaleX, scaleY } = extractScaleFromMatrix(matrix);
      
      expect(scaleX).toBeCloseTo(2, 5);
      expect(scaleY).toBeCloseTo(3, 5);
    });

    it('should NOT double-scale rectangle dimensions', async () => {
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

      const operators = await extractOperators(result.pdfBytes);
      
      // Find rectangle operator (re)
      const rectOps = operators.filter(op => op.name === 'rectangle');
      expect(rectOps.length).toBeGreaterThan(0);
      
      // Rectangle dimensions should be ORIGINAL (100x100), NOT scaled (200x200)
      const rectOp = rectOps[0];
      const [, , width, height] = rectOp.args as number[];
      
      expect(width).toBe(100);
      expect(height).toBe(100);
    });

    it('should NOT double-scale triangle path', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [{
          type: 'triangle',
          left: 150,
          top: 150,
          width: 60,
          height: 60,
          fill: '#f39c12',
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
        } as FabricTriangleObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(1);
      expect(elements[0].type).toBe('path');
      
      // The element should have scale in its transform matrix
      const { scaleX, scaleY } = extractScaleFromMatrix(elements[0].transform);
      expect(scaleX).toBeCloseTo(2, 5);
      expect(scaleY).toBeCloseTo(2, 5);
    });
  });

  describe('Scale Effects on Bounds', () => {
    it('should produce larger bounds for scaled objects', async () => {
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
            top: 100,
            width: 100,
            height: 100,
            fill: '#00FF00',
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
          } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(2);
      
      // Second rect (2x scale) should have 2x the bounds
      expect(elements[1].bounds.width).toBeCloseTo(elements[0].bounds.width * 2, 1);
      expect(elements[1].bounds.height).toBeCloseTo(elements[0].bounds.height * 2, 1);
    });

    it('should handle fractional scales', async () => {
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

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(1);
      
      // Should be half the original size
      expect(elements[0].bounds.width).toBeCloseTo(50, 1);
      expect(elements[0].bounds.height).toBeCloseTo(50, 1);
    });
  });

  describe('Flip Scale', () => {
    it('should handle flipX via negative scale', async () => {
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
          flipX: true,
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

      const operators = await extractOperators(result.pdfBytes);
      const matrixOps = operators.filter(op => op.name === 'transform');
      
      const matrix = matrixOps[0].args as number[];
      
      // FlipX should result in negative scaleX in matrix
      // For flipX: scaleX = -1, scaleY = 1
      expect(matrix[0]).toBeCloseTo(-1, 5);
      expect(matrix[3]).toBeCloseTo(1, 5);
    });

    it('should handle combined flip and scale', async () => {
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
          scaleX: 2,
          scaleY: 2,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: true,
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

      const operators = await extractOperators(result.pdfBytes);
      const matrixOps = operators.filter(op => op.name === 'transform');
      
      const matrix = matrixOps[0].args as number[];
      const { scaleX } = extractScaleFromMatrix(matrix);
      
      // Scale should be 2 (absolute value)
      expect(scaleX).toBeCloseTo(2, 5);
      // But matrix[0] should be negative (flip)
      expect(matrix[0]).toBeCloseTo(-2, 5);
    });
  });
});
