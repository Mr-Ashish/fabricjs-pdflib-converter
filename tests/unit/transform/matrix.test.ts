import { describe, it, expect } from 'vitest';
import {
  identityMatrix,
  multiplyMatrices,
  composeMatrix,
  transformPoint,
  invertMatrix,
  degreesToRadians,
} from '../../../src/transform/matrix';
import type { TransformMatrix, Point } from '../../../src/types';

describe('identityMatrix', () => {
  it('should return identity matrix [1, 0, 0, 1, 0, 0]', () => {
    const result = identityMatrix();
    expect(result).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('should return a new array on each call', () => {
    const m1 = identityMatrix();
    const m2 = identityMatrix();
    expect(m1).not.toBe(m2);
    expect(m1).toEqual(m2);
  });
});

describe('multiplyMatrices', () => {
  it('should return identity when multiplying identity by identity', () => {
    const i = identityMatrix();
    const result = multiplyMatrices(i, i);
    expect(result).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('should multiply two translation matrices', () => {
    // Translate by (10, 20) then by (5, 10) = translate by (15, 30)
    const m1: TransformMatrix = [1, 0, 0, 1, 10, 20];
    const m2: TransformMatrix = [1, 0, 0, 1, 5, 10];
    const result = multiplyMatrices(m1, m2);
    expect(result[4]).toBeCloseTo(15, 10);
    expect(result[5]).toBeCloseTo(30, 10);
  });

  it('should apply transformations in correct order (m1 then m2)', () => {
    // First scale by 2, then translate by (10, 0)
    const scale: TransformMatrix = [2, 0, 0, 2, 0, 0];
    const translate: TransformMatrix = [1, 0, 0, 1, 10, 0];
    const result = multiplyMatrices(scale, translate);
    // Scaling then translating: point (1, 0) -> (2, 0) -> (12, 0)
    const point: Point = { x: 1, y: 0 };
    const transformed = transformPoint(point, result);
    expect(transformed.x).toBeCloseTo(12, 10);
    expect(transformed.y).toBeCloseTo(0, 10);
  });

  it('should handle complex matrix multiplication', () => {
    // Test with arbitrary matrices
    const m1: TransformMatrix = [2, 1, 0, 2, 5, 3];
    const m2: TransformMatrix = [1, 0, 1, 1, 2, 4];
    const result = multiplyMatrices(m1, m2);
    // multiplyMatrices(m1, m2) = m2 × m1 (m1 applied first, then m2)
    // m2 × m1 = [1*2+1*1, 0*2+1*1, 1*0+1*2, 0*0+1*2, 1*5+1*3+2, 0*5+1*3+4]
    //          = [3, 1, 2, 2, 10, 7]
    expect(result[0]).toBeCloseTo(3, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(2, 10);
    expect(result[3]).toBeCloseTo(2, 10);
    expect(result[4]).toBeCloseTo(10, 10);
    expect(result[5]).toBeCloseTo(7, 10);
  });
});

describe('composeMatrix', () => {
  it('should return identity for default values', () => {
    const result = composeMatrix({});
    expect(result).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('should apply translation', () => {
    const result = composeMatrix({ translateX: 10, translateY: 20 });
    expect(result).toEqual([1, 0, 0, 1, 10, 20]);
  });

  it('should apply scale', () => {
    const result = composeMatrix({ scaleX: 2, scaleY: 3 });
    expect(result[0]).toBe(2);
    expect(result[3]).toBe(3);
  });

  it('should apply rotation', () => {
    const result = composeMatrix({ angle: 90 });
    // cos(90) ≈ 0, sin(90) = 1
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(-1, 10);
    expect(result[3]).toBeCloseTo(0, 10);
  });

  it('should apply skewX', () => {
    const result = composeMatrix({ skewX: 45 });
    // tan(45) = 1
    expect(result[2]).toBeCloseTo(1, 10);
  });

  it('should apply skewY', () => {
    const result = composeMatrix({ skewY: 45 });
    // tan(45) = 1
    expect(result[1]).toBeCloseTo(1, 10);
  });

  it('should apply flipX', () => {
    const result = composeMatrix({ flipX: true });
    expect(result[0]).toBe(-1);
  });

  it('should apply flipY', () => {
    const result = composeMatrix({ flipY: true });
    expect(result[3]).toBe(-1);
  });

  it('should apply combined transforms in correct order', () => {
    // Fabric.js order: skew -> scale -> rotate -> translate
    const result = composeMatrix({
      translateX: 10,
      translateY: 20,
      scaleX: 2,
      scaleY: 2,
      angle: 90,
    });
    // Verify it's not just identity
    expect(result).not.toEqual([1, 0, 0, 1, 0, 0]);
    // Translation should be in the last two elements
    expect(result[4]).not.toBe(0);
    expect(result[5]).not.toBe(0);
  });
});

describe('transformPoint', () => {
  it('should not change point with identity matrix', () => {
    const point: Point = { x: 5, y: 10 };
    const result = transformPoint(point, identityMatrix());
    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
  });

  it('should translate point', () => {
    const point: Point = { x: 1, y: 2 };
    const matrix: TransformMatrix = [1, 0, 0, 1, 10, 20];
    const result = transformPoint(point, matrix);
    expect(result.x).toBe(11);
    expect(result.y).toBe(22);
  });

  it('should scale point', () => {
    const point: Point = { x: 3, y: 4 };
    const matrix: TransformMatrix = [2, 0, 0, 3, 0, 0];
    const result = transformPoint(point, matrix);
    expect(result.x).toBe(6);
    expect(result.y).toBe(12);
  });

  it('should rotate point 90 degrees', () => {
    const point: Point = { x: 1, y: 0 };
    const matrix = composeMatrix({ angle: 90 });
    const result = transformPoint(point, matrix);
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(1, 10);
  });

  it('should handle combined transforms', () => {
    const point: Point = { x: 1, y: 1 };
    const matrix = composeMatrix({
      translateX: 5,
      translateY: 5,
      scaleX: 2,
      scaleY: 2,
    });
    const result = transformPoint(point, matrix);
    // (1, 1) -> scale to (2, 2) -> translate to (7, 7)
    expect(result.x).toBe(7);
    expect(result.y).toBe(7);
  });

  it('should not mutate the input point', () => {
    const point: Point = { x: 5, y: 10 };
    const original = { ...point };
    transformPoint(point, identityMatrix());
    expect(point).toEqual(original);
  });
});

describe('invertMatrix', () => {
  it('should return identity for identity matrix', () => {
    const i = identityMatrix();
    const result = invertMatrix(i);
    expect(result[0]).toBeCloseTo(1, 10);
    expect(result[1]).toBeCloseTo(0, 10);
    expect(result[2]).toBeCloseTo(0, 10);
    expect(result[3]).toBeCloseTo(1, 10);
    expect(result[4]).toBeCloseTo(0, 10);
    expect(result[5]).toBeCloseTo(0, 10);
  });

  it('should invert translation matrix', () => {
    const matrix: TransformMatrix = [1, 0, 0, 1, 10, 20];
    const inverted = invertMatrix(matrix);
    // Inverse of translate(10, 20) is translate(-10, -20)
    expect(inverted[4]).toBeCloseTo(-10, 10);
    expect(inverted[5]).toBeCloseTo(-20, 10);
  });

  it('should invert scale matrix', () => {
    const matrix: TransformMatrix = [2, 0, 0, 4, 0, 0];
    const inverted = invertMatrix(matrix);
    expect(inverted[0]).toBeCloseTo(0.5, 10);
    expect(inverted[3]).toBeCloseTo(0.25, 10);
  });

  it('should produce identity when multiplying matrix by its inverse', () => {
    const matrix = composeMatrix({
      translateX: 10,
      translateY: 20,
      scaleX: 2,
      scaleY: 3,
      angle: 45,
    });
    const inverted = invertMatrix(matrix);
    const result = multiplyMatrices(matrix, inverted);
    expect(result[0]).toBeCloseTo(1, 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(1, 5);
    expect(result[4]).toBeCloseTo(0, 5);
    expect(result[5]).toBeCloseTo(0, 5);
  });
});

describe('degreesToRadians', () => {
  it('should convert 0 degrees to 0 radians', () => {
    expect(degreesToRadians(0)).toBe(0);
  });

  it('should convert 90 degrees to π/2 radians', () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('should convert 180 degrees to π radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
  });

  it('should convert 360 degrees to 2π radians', () => {
    expect(degreesToRadians(360)).toBeCloseTo(Math.PI * 2, 10);
  });

  it('should handle negative degrees', () => {
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 10);
  });
});
