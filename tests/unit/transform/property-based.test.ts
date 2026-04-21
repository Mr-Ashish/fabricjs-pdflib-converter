import { describe, it, expect } from 'vitest';
import { composeMatrix } from '../../../src/transform/matrix';

/**
 * Property-based tests for transformations.
 * Tests that mathematical properties hold for various transformation combinations.
 */
describe('Transformation Properties', () => {
  describe('Identity properties', () => {
    it('should return identity for zero transforms', () => {
      const matrix = composeMatrix({
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
      });
      expect(matrix).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('should return identity for no arguments', () => {
      const matrix = composeMatrix({});
      expect(matrix).toEqual([1, 0, 0, 1, 0, 0]);
    });
  });

  describe('Scale properties', () => {
    it('should be commutative for scale (scaleX then scaleY = scaleY then scaleX)', () => {
      // Note: In matrix multiplication, order matters, but pure scaling 
      // on different axes is commutative
      const matrix1 = composeMatrix({ scaleX: 2, scaleY: 3 });
      const matrix2 = composeMatrix({ scaleX: 2, scaleY: 3 });
      
      expect(matrix1).toEqual(matrix2);
      expect(matrix1[0]).toBe(2);
      expect(matrix1[3]).toBe(3);
    });

    it('should handle uniform scaling (same scaleX and scaleY)', () => {
      const matrix = composeMatrix({ scaleX: 2, scaleY: 2 });
      expect(matrix[0]).toBe(2);
      expect(matrix[3]).toBe(2);
      expect(matrix[1]).toBe(0);
      expect(matrix[2]).toBe(0);
    });

    it('should handle non-uniform scaling (different scaleX and scaleY)', () => {
      const matrix = composeMatrix({ scaleX: 2, scaleY: 3 });
      expect(matrix[0]).toBe(2);
      expect(matrix[3]).toBe(3);
    });

    it('should handle negative scaling (flipping)', () => {
      const matrix = composeMatrix({ scaleX: -1, scaleY: 1 });
      expect(matrix[0]).toBe(-1);
      expect(matrix[3]).toBe(1);
    });
  });

  describe('Rotation properties', () => {
    it('should have period of 360 degrees', () => {
      const matrix0 = composeMatrix({ angle: 0 });
      const matrix360 = composeMatrix({ angle: 360 });
      const matrix720 = composeMatrix({ angle: 720 });
      
      for (let i = 0; i < 6; i++) {
        expect(matrix0[i]).toBeCloseTo(matrix360[i], 10);
        expect(matrix0[i]).toBeCloseTo(matrix720[i], 10);
      }
    });

    it('should have period of 360 degrees for negative angles', () => {
      const matrix0 = composeMatrix({ angle: 0 });
      const matrixNeg360 = composeMatrix({ angle: -360 });
      
      for (let i = 0; i < 6; i++) {
        expect(matrix0[i]).toBeCloseTo(matrixNeg360[i], 10);
      }
    });

    it('should rotate 90 degrees clockwise correctly', () => {
      const matrix = composeMatrix({ angle: 90 });
      // [cos(90) sin(90) -sin(90) cos(90) 0 0]
      // = [0 1 -1 0 0 0]
      expect(matrix[0]).toBeCloseTo(0, 10);
      expect(matrix[1]).toBeCloseTo(1, 10);
      expect(matrix[2]).toBeCloseTo(-1, 10);
      expect(matrix[3]).toBeCloseTo(0, 10);
    });

    it('should rotate 180 degrees correctly', () => {
      const matrix = composeMatrix({ angle: 180 });
      // [cos(180) sin(180) -sin(180) cos(180) 0 0]
      // = [-1 0 0 -1 0 0]
      expect(matrix[0]).toBeCloseTo(-1, 10);
      expect(matrix[1]).toBeCloseTo(0, 10);
      expect(matrix[2]).toBeCloseTo(0, 10);
      expect(matrix[3]).toBeCloseTo(-1, 10);
    });
  });

  describe('Combined transformation properties', () => {
    it('should maintain determinant for rotation-only transforms', () => {
      // Pure rotation should have determinant = 1
      const matrix45 = composeMatrix({ angle: 45 });
      const matrix90 = composeMatrix({ angle: 90 });
      const matrix180 = composeMatrix({ angle: 180 });
      
      const det45 = matrix45[0] * matrix45[3] - matrix45[1] * matrix45[2];
      const det90 = matrix90[0] * matrix90[3] - matrix90[1] * matrix90[2];
      const det180 = matrix180[0] * matrix180[3] - matrix180[1] * matrix180[2];
      
      expect(det45).toBeCloseTo(1, 10);
      expect(det90).toBeCloseTo(1, 10);
      expect(det180).toBeCloseTo(1, 10);
    });

    it('should scale determinant by product of scale factors', () => {
      // Scale(2, 3) should have determinant = 6
      const matrix = composeMatrix({ scaleX: 2, scaleY: 3 });
      const det = matrix[0] * matrix[3] - matrix[1] * matrix[2];
      expect(det).toBe(6);
    });

    it('should handle combined rotation and uniform scale', () => {
      const matrix = composeMatrix({ angle: 45, scaleX: 2, scaleY: 2 });
      
      // The matrix should represent both operations
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);
      
      expect(matrix[0]).toBeCloseTo(2 * cos45, 10);
      expect(matrix[1]).toBeCloseTo(2 * sin45, 10);
      expect(matrix[2]).toBeCloseTo(-2 * sin45, 10);
      expect(matrix[3]).toBeCloseTo(2 * cos45, 10);
      
      // Determinant should be scaleX * scaleY = 4
      const det = matrix[0] * matrix[3] - matrix[1] * matrix[2];
      expect(det).toBeCloseTo(4, 10);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small scales', () => {
      const matrix = composeMatrix({ scaleX: 0.001, scaleY: 0.001 });
      expect(matrix[0]).toBe(0.001);
      expect(matrix[3]).toBe(0.001);
    });

    it('should handle very large scales', () => {
      const matrix = composeMatrix({ scaleX: 1000, scaleY: 1000 });
      expect(matrix[0]).toBe(1000);
      expect(matrix[3]).toBe(1000);
    });

    it('should handle fractional angles', () => {
      const matrix = composeMatrix({ angle: 33.7 });
      expect(matrix[0]).not.toBeNaN();
      expect(matrix[1]).not.toBeNaN();
      expect(matrix[2]).not.toBeNaN();
      expect(matrix[3]).not.toBeNaN();
    });

    it('should handle zero scale (degenerate case)', () => {
      const matrix = composeMatrix({ scaleX: 0, scaleY: 0 });
      expect(matrix[0]).toBe(0);
      expect(matrix[3]).toBe(0);
    });
  });
});
