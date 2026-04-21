/**
 * PDF.js Rotation Verification Tests
 * 
 * These tests verify that rotation is applied correctly via transformation
 * matrices.
 */

import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { 
  extractElements, 
  extractOperators, 
  extractRotationFromMatrix 
} from '../helpers/pdfjs-helpers';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

describe('PDF.js Rotation Verification', () => {
  describe('Rotation in Transformation Matrix', () => {
    it('should apply 45 degree rotation via transformation matrix', async () => {
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

      const operators = await extractOperators(result.pdfBytes);
      const matrixOps = operators.filter(op => op.name === 'transform');
      
      expect(matrixOps.length).toBeGreaterThan(0);
      
      const matrix = matrixOps[0].args as number[];
      
      // Rotation matrix for 45 degrees:
      // [cos(45), sin(45), -sin(45), cos(45), tx, ty]
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);
      
      expect(matrix[0]).toBeCloseTo(cos45, 5);
      expect(matrix[1]).toBeCloseTo(sin45, 5);
      expect(matrix[2]).toBeCloseTo(-sin45, 5);
      expect(matrix[3]).toBeCloseTo(cos45, 5);
    });

    it('should apply 90 degree rotation via transformation matrix', async () => {
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
          angle: 90,
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
      
      // 90 degree rotation: [0, 1, -1, 0, tx, ty]
      expect(matrix[0]).toBeCloseTo(0, 5);
      expect(matrix[1]).toBeCloseTo(1, 5);
      expect(matrix[2]).toBeCloseTo(-1, 5);
      expect(matrix[3]).toBeCloseTo(0, 5);
    });

    it('should apply 180 degree rotation via transformation matrix', async () => {
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
          angle: 180,
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
      
      // 180 degree rotation: [-1, 0, 0, -1, tx, ty]
      expect(matrix[0]).toBeCloseTo(-1, 5);
      expect(matrix[1]).toBeCloseTo(0, 5);
      expect(matrix[2]).toBeCloseTo(0, 5);
      expect(matrix[3]).toBeCloseTo(-1, 5);
    });

    it('should extract correct rotation angle from matrix', async () => {
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

      const elements = await extractElements(result.pdfBytes);
      
      const rotation = extractRotationFromMatrix(elements[0].transform);
      
      expect(rotation).toBeCloseTo(45, 1);
    });
  });

  describe('Rotation Effects on Bounds', () => {
    it('should produce larger bounding box for rotated square', async () => {
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
          } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(2);
      
      // A 100x100 square rotated 45° should have bounding box of ~141x141
      // (100 * sqrt(2) ≈ 141.4)
      expect(elements[1].bounds.width).toBeGreaterThan(elements[0].bounds.width);
      expect(elements[1].bounds.height).toBeGreaterThan(elements[0].bounds.height);
      
      // Should be approximately 141
      expect(elements[1].bounds.width).toBeCloseTo(141.4, 1);
      expect(elements[1].bounds.height).toBeCloseTo(141.4, 1);
    });
  });

  describe('Combined Rotation and Scale', () => {
    it('should handle rotation and scale together', async () => {
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

      const operators = await extractOperators(result.pdfBytes);
      const matrixOps = operators.filter(op => op.name === 'transform');
      
      const matrix = matrixOps[0].args as number[];
      const [a, b, c, d] = matrix;
      
      // Extract scale from matrix
      const scaleX = Math.sqrt(a * a + b * b);
      const scaleY = Math.sqrt(c * c + d * d);
      
      // Extract rotation from matrix
      const rotation = Math.atan2(b, a) * (180 / Math.PI);
      
      // Should have both scale and rotation
      expect(scaleX).toBeCloseTo(2, 5);
      expect(scaleY).toBeCloseTo(2, 5);
      expect(rotation).toBeCloseTo(45, 1);
    });

    it('should maintain both scale and rotation in bounds', async () => {
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

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(1);
      
      // 100x100 square, scaled 2x = 200x200, rotated 45°
      // Bounding box should be 200 * sqrt(2) ≈ 282.8
      expect(elements[0].bounds.width).toBeCloseTo(282.8, 1);
      expect(elements[0].bounds.height).toBeCloseTo(282.8, 1);
    });
  });

  describe('Negative Angles', () => {
    it('should handle negative rotation angles', async () => {
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
          angle: -45,
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
      
      const rotation = extractRotationFromMatrix(elements[0].transform);
      
      // -45° should be normalized to 315°
      expect(rotation).toBeCloseTo(315, 1);
    });
  });
});
