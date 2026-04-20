import { describe, it, expect } from 'vitest';
import { resolveOriginOffset } from '../../../src/transform/origin';
import type { OriginX, OriginY } from '../../../src/types';

describe('resolveOriginOffset', () => {
  const width = 100;
  const height = 50;

  describe('originX variations', () => {
    it('should return 0 for left origin', () => {
      const result = resolveOriginOffset('left', 'top', width, height);
      expect(result.x).toBe(0);
    });

    it('should return -width/2 for center origin', () => {
      const result = resolveOriginOffset('center', 'top', width, height);
      expect(result.x).toBe(-50);
    });

    it('should return -width for right origin', () => {
      const result = resolveOriginOffset('right', 'top', width, height);
      expect(result.x).toBe(-100);
    });
  });

  describe('originY variations', () => {
    it('should return 0 for top origin', () => {
      const result = resolveOriginOffset('left', 'top', width, height);
      expect(result.y).toBe(0);
    });

    it('should return -height/2 for center origin', () => {
      const result = resolveOriginOffset('left', 'center', width, height);
      expect(result.y).toBe(-25);
    });

    it('should return -height for bottom origin', () => {
      const result = resolveOriginOffset('left', 'bottom', width, height);
      expect(result.y).toBe(-50);
    });
  });

  describe('all 9 combinations', () => {
    const testCases: Array<{
      originX: OriginX;
      originY: OriginY;
      expectedX: number;
      expectedY: number;
    }> = [
      { originX: 'left', originY: 'top', expectedX: 0, expectedY: 0 },
      { originX: 'left', originY: 'center', expectedX: 0, expectedY: -25 },
      { originX: 'left', originY: 'bottom', expectedX: 0, expectedY: -50 },
      { originX: 'center', originY: 'top', expectedX: -50, expectedY: 0 },
      { originX: 'center', originY: 'center', expectedX: -50, expectedY: -25 },
      { originX: 'center', originY: 'bottom', expectedX: -50, expectedY: -50 },
      { originX: 'right', originY: 'top', expectedX: -100, expectedY: 0 },
      { originX: 'right', originY: 'center', expectedX: -100, expectedY: -25 },
      { originX: 'right', originY: 'bottom', expectedX: -100, expectedY: -50 },
    ];

    testCases.forEach(({ originX, originY, expectedX, expectedY }) => {
      it(`should return correct offset for originX=${originX}, originY=${originY}`, () => {
        const result = resolveOriginOffset(originX, originY, width, height);
        expect(result.x).toBe(expectedX);
        expect(result.y).toBe(expectedY);
      });
    });
  });

  describe('zero dimensions', () => {
    it('should handle zero width', () => {
      const result = resolveOriginOffset('center', 'center', 0, 50);
      expect(result.x).toBe(-0);
      expect(result.y).toBe(-25);
    });

    it('should handle zero height', () => {
      const result = resolveOriginOffset('center', 'center', 100, 0);
      expect(result.x).toBe(-50);
      expect(result.y).toBe(-0);
    });
  });
});
