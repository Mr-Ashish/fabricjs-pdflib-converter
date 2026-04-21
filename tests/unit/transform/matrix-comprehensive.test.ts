import { describe, it, expect } from 'vitest';
import { 
  composeMatrix, 
  multiplyMatrices 
} from '../../../src/transform/matrix';

/**
 * Comprehensive tests for transformation matrix calculations.
 * These catch math errors in the transformation pipeline.
 */
describe('Transformation Matrix Comprehensive', () => {
  describe('composeMatrix', () => {
    it('should create identity matrix with no transforms', () => {
      const matrix = composeMatrix({});
      expect(matrix).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('should apply translation', () => {
      const matrix = composeMatrix({ translateX: 100, translateY: 200 });
      expect(matrix[4]).toBe(100); // tx
      expect(matrix[5]).toBe(200); // ty
    });

    it('should apply scaling', () => {
      const matrix = composeMatrix({ scaleX: 2, scaleY: 3 });
      expect(matrix[0]).toBe(2); // sx
      expect(matrix[3]).toBe(3); // sy
    });

    it('should apply rotation', () => {
      const matrix = composeMatrix({ angle: 90 });
      // cos(90°) ≈ 0, sin(90°) = 1
      expect(Math.abs(matrix[0])).toBeCloseTo(0, 10); // cos
      expect(matrix[1]).toBeCloseTo(1, 10); // sin
      expect(matrix[2]).toBeCloseTo(-1, 10); // -sin
      expect(Math.abs(matrix[3])).toBeCloseTo(0, 10); // cos
    });

    it('should apply flipX by negating scaleX', () => {
      const matrix = composeMatrix({ scaleX: 2, flipX: true });
      expect(matrix[0]).toBe(-2);
    });

    it('should apply flipY by negating scaleY', () => {
      const matrix = composeMatrix({ scaleY: 3, flipY: true });
      expect(matrix[3]).toBe(-3);
    });

    it('should combine translation and scale', () => {
      const matrix = composeMatrix({ 
        translateX: 100, 
        translateY: 200,
        scaleX: 2,
        scaleY: 2 
      });
      // Scale is applied first, then translate
      expect(matrix[0]).toBe(2);
      expect(matrix[3]).toBe(2);
      expect(matrix[4]).toBe(100);
      expect(matrix[5]).toBe(200);
    });

    it('should combine rotation and scale correctly', () => {
      const matrix = composeMatrix({ 
        angle: 45,
        scaleX: 2,
        scaleY: 2 
      });
      // Rotation matrix components should be scaled
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);
      
      expect(matrix[0]).toBeCloseTo(2 * cos45, 10);
      expect(matrix[1]).toBeCloseTo(2 * sin45, 10);
      expect(matrix[2]).toBeCloseTo(-2 * sin45, 10);
      expect(matrix[3]).toBeCloseTo(2 * cos45, 10);
    });
  });

  describe('multiplyMatrices', () => {
    it('should multiply identity matrices', () => {
      const a: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
      const b: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
      const result = multiplyMatrices(a, b);
      expect(result).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('should apply translation then scale', () => {
      // Translate by (10, 20) then scale by (2, 3)
      const translate: [number, number, number, number, number, number] = [1, 0, 0, 1, 10, 20];
      const scale: [number, number, number, number, number, number] = [2, 0, 0, 3, 0, 0];
      const result = multiplyMatrices(scale, translate);
      
      // Result should be [2, 0, 0, 3, 10, 20]
      expect(result[0]).toBe(2);
      expect(result[3]).toBe(3);
      expect(result[4]).toBe(10);
      expect(result[5]).toBe(20);
    });

    it('should apply scale then translation', () => {
      // Scale by (2, 3) then translate by (10, 20)
      const scale: [number, number, number, number, number, number] = [2, 0, 0, 3, 0, 0];
      const translate: [number, number, number, number, number, number] = [1, 0, 0, 1, 10, 20];
      const result = multiplyMatrices(translate, scale);
      
      // Result should be [2, 0, 0, 3, 20, 60] (translation is scaled)
      expect(result[0]).toBe(2);
      expect(result[3]).toBe(3);
      expect(result[4]).toBe(20);
      expect(result[5]).toBe(60);
    });
  });

});
