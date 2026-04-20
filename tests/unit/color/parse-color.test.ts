import { describe, it, expect } from 'vitest';
import { parseColor } from '../../../src/color';
import type { ColorResult } from '../../../src/types';

describe('parseColor', () => {
  describe('hex colors', () => {
    it('should parse 6-digit hex', () => {
      const result = parseColor('#FF5733');
      expect(result).toEqual({ r: 1, g: 0.337, b: 0.2 });
    });

    it('should parse 3-digit hex', () => {
      const result = parseColor('#F53');
      expect(result).toEqual({ r: 1, g: 0.333, b: 0.2 });
    });

    it('should parse 8-digit hex with alpha', () => {
      const result = parseColor('#FF573380');
      expect(result).toEqual({ r: 1, g: 0.337, b: 0.2, alpha: 0.502 });
    });

    it('should parse 4-digit hex with alpha', () => {
      const result = parseColor('#F538');
      expect(result).toEqual({ r: 1, g: 0.333, b: 0.2, alpha: 0.533 });
    });

    it('should handle lowercase hex', () => {
      const result = parseColor('#ff5733');
      expect(result).toEqual({ r: 1, g: 0.337, b: 0.2 });
    });

    it('should handle hex without hash', () => {
      const result = parseColor('FF5733');
      expect(result).toEqual({ r: 1, g: 0.337, b: 0.2 });
    });
  });

  describe('rgb colors', () => {
    it('should parse rgb() format', () => {
      const result = parseColor('rgb(255, 87, 51)');
      expect(result).toEqual({ r: 1, g: 0.341, b: 0.2 });
    });

    it('should parse rgb() without spaces', () => {
      const result = parseColor('rgb(255,87,51)');
      expect(result).toEqual({ r: 1, g: 0.341, b: 0.2 });
    });

    it('should parse rgba() with alpha', () => {
      const result = parseColor('rgba(255, 87, 51, 0.5)');
      expect(result).toEqual({ r: 1, g: 0.341, b: 0.2, alpha: 0.5 });
    });

    it('should handle percentage values', () => {
      const result = parseColor('rgb(100%, 50%, 25%)');
      expect(result.r).toBeCloseTo(1, 2);
      expect(result.g).toBeCloseTo(0.5, 2);
      expect(result.b).toBeCloseTo(0.25, 2);
    });
  });

  describe('named colors', () => {
    it('should parse common named colors', () => {
      expect(parseColor('red')).toEqual({ r: 1, g: 0, b: 0 });
      expect(parseColor('green')).toEqual({ r: 0, g: 0.502, b: 0 });
      expect(parseColor('blue')).toEqual({ r: 0, g: 0, b: 1 });
      expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseColor('white')).toEqual({ r: 1, g: 1, b: 1 });
    });

    it('should be case insensitive', () => {
      expect(parseColor('RED')).toEqual({ r: 1, g: 0, b: 0 });
      expect(parseColor('Red')).toEqual({ r: 1, g: 0, b: 0 });
    });
  });

  describe('null and transparent', () => {
    it('should return null for null input', () => {
      expect(parseColor(null)).toBeNull();
    });

    it('should return null for transparent', () => {
      expect(parseColor('transparent')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseColor('')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace', () => {
      expect(parseColor('  #FF5733  ')).toEqual({ r: 1, g: 0.337, b: 0.2 });
      expect(parseColor('  red  ')).toEqual({ r: 1, g: 0, b: 0 });
    });

    it('should clamp values to valid range', () => {
      const result = parseColor('rgb(300, -10, 128)');
      expect(result.r).toBe(1);
      expect(result.g).toBe(0);
      expect(result.b).toBeCloseTo(0.502, 2);
    });
  });
});
