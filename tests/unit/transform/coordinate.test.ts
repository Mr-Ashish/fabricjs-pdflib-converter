import { describe, it, expect } from 'vitest';
import {
  fabricToMatrix,
  fabricToPdfMatrix,
  fabricYToPdfY,
} from '../../../src/transform/coordinate';
import type { FabricObjectBase, TransformMatrix } from '../../../src/types';

describe('fabricToMatrix', () => {
  const baseObject: FabricObjectBase = {
    type: 'rect',
    left: 10,
    top: 20,
    width: 100,
    height: 50,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'left',
    originY: 'top',
    fill: null,
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    shadow: null,
    globalCompositeOperation: 'source-over',
  };

  it('should return identity-like matrix for default object', () => {
    const matrix = fabricToMatrix(baseObject);
    // Should have translation (10, 20) from left/top
    expect(matrix[0]).toBe(1); // scaleX
    expect(matrix[3]).toBe(1); // scaleY
    expect(matrix[4]).toBe(10); // translateX
    expect(matrix[5]).toBe(20); // translateY
  });

  it('should apply scale', () => {
    const obj = { ...baseObject, scaleX: 2, scaleY: 3 };
    const matrix = fabricToMatrix(obj);
    expect(matrix[0]).toBe(2);
    expect(matrix[3]).toBe(3);
  });

  it('should apply flip as negative scale', () => {
    const obj = { ...baseObject, flipX: true, flipY: true };
    const matrix = fabricToMatrix(obj);
    expect(matrix[0]).toBe(-1);
    expect(matrix[3]).toBe(-1);
  });

  it('should apply rotation', () => {
    const obj = { ...baseObject, angle: 90 };
    const matrix = fabricToMatrix(obj);
    // cos(90) ≈ 0, sin(90) = 1
    expect(matrix[0]).toBeCloseTo(0, 10);
    expect(matrix[1]).toBeCloseTo(1, 10);
    expect(matrix[2]).toBeCloseTo(-1, 10);
    expect(matrix[3]).toBeCloseTo(0, 10);
  });

  it('should apply skew', () => {
    const obj = { ...baseObject, skewX: 45 };
    const matrix = fabricToMatrix(obj);
    // tan(45) = 1
    expect(matrix[2]).toBeCloseTo(1, 10);
  });

  it('should apply origin offset for center origin', () => {
    const obj = { ...baseObject, originX: 'center', originY: 'center' };
    const matrix = fabricToMatrix(obj);
    // Position should account for center origin: left - width/2, top - height/2
    // Plus the origin offset is applied via transform
    expect(matrix).not.toEqual([1, 0, 0, 1, 10, 20]);
  });
});

describe('fabricToPdfMatrix', () => {
  it('should flip Y axis for PDF coordinate system', () => {
    const fabricMatrix: TransformMatrix = [1, 0, 0, 1, 10, 20];
    const pageHeight = 500;
    const scale = 1;
    const pdfMatrix = fabricToPdfMatrix(fabricMatrix, pageHeight, scale);

    // Y should be flipped: pdfY = pageHeight - fabricY
    expect(pdfMatrix[0]).toBe(1);
    expect(pdfMatrix[3]).toBe(-1); // Y flipped
  });

  it('should apply scale factor', () => {
    const fabricMatrix: TransformMatrix = [1, 0, 0, 1, 10, 20];
    const pageHeight = 500;
    const scale = 2;
    const pdfMatrix = fabricToPdfMatrix(fabricMatrix, pageHeight, scale);

    expect(pdfMatrix[0]).toBe(2);
    expect(pdfMatrix[3]).toBe(-2); // Y flipped and scaled
    expect(pdfMatrix[4]).toBe(20); // 10 * 2
  });

  it('should handle zero translation', () => {
    const fabricMatrix: TransformMatrix = [1, 0, 0, 1, 0, 0];
    const pdfMatrix = fabricToPdfMatrix(fabricMatrix, 500, 1);

    expect(pdfMatrix[0]).toBe(1);
    expect(pdfMatrix[3]).toBe(-1);
  });
});

describe('fabricYToPdfY', () => {
  it('should flip Y coordinate', () => {
    const pageHeight = 500;
    const result = fabricYToPdfY(100, 50, pageHeight, 1);
    // pdfY = pageHeight - (fabricY + objectHeight)
    expect(result).toBe(350); // 500 - (100 + 50)
  });

  it('should apply scale', () => {
    const pageHeight = 500;
    const result = fabricYToPdfY(100, 50, pageHeight, 2);
    // pdfY = pageHeight - (fabricY * scale + objectHeight * scale)
    expect(result).toBe(200); // 500 - (200 + 100)
  });

  it('should handle zero position', () => {
    const result = fabricYToPdfY(0, 0, 500, 1);
    expect(result).toBe(500);
  });

  it('should handle position at page height', () => {
    const result = fabricYToPdfY(400, 100, 500, 1);
    expect(result).toBe(0); // 500 - (400 + 100)
  });
});
