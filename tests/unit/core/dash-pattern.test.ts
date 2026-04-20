import { describe, it, expect } from 'vitest';
import {
  normalizeDashArray,
  scaleDashArray,
  dashArrayToPdf,
} from '../../../src/core/dash-pattern';

describe('normalizeDashArray', () => {
  it('should return null for null input', () => {
    expect(normalizeDashArray(null)).toBeNull();
  });

  it('should return null for empty array', () => {
    expect(normalizeDashArray([])).toBeNull();
  });

  it('should return array as-is for valid input', () => {
    expect(normalizeDashArray([5, 3])).toEqual([5, 3]);
    expect(normalizeDashArray([10, 5, 2, 5])).toEqual([10, 5, 2, 5]);
  });

  it('should convert single number to array', () => {
    expect(normalizeDashArray(5)).toEqual([5, 5]);
  });

  it('should filter out negative values', () => {
    expect(normalizeDashArray([5, -3, 2])).toEqual([5, 2]);
  });

  it('should filter out zero values', () => {
    expect(normalizeDashArray([5, 0, 3])).toEqual([5, 3]);
  });

  it('should return null if all values filtered out', () => {
    expect(normalizeDashArray([0, 0])).toBeNull();
    expect(normalizeDashArray([-1, -2])).toBeNull();
  });
});

describe('scaleDashArray', () => {
  it('should return null for null input', () => {
    expect(scaleDashArray(null, 2)).toBeNull();
  });

  it('should scale all values by factor', () => {
    expect(scaleDashArray([5, 3], 2)).toEqual([10, 6]);
  });

  it('should handle scale of 1', () => {
    expect(scaleDashArray([5, 3], 1)).toEqual([5, 3]);
  });

  it('should handle fractional scale', () => {
    expect(scaleDashArray([10, 6], 0.5)).toEqual([5, 3]);
  });
});

describe('dashArrayToPdf', () => {
  it('should convert dash array to PDF format', () => {
    const result = dashArrayToPdf([5, 3], 2);
    // PDF dash: [dashLength, gapLength, ...] in points
    expect(result.dashArray).toEqual([10, 6]);
    expect(result.dashPhase).toBe(0);
  });

  it('should handle odd-length arrays by duplicating', () => {
    // PDF requires even-length dash arrays
    const result = dashArrayToPdf([5], 1);
    expect(result.dashArray).toEqual([5, 5]);
  });

  it('should return null dashArray for null input', () => {
    const result = dashArrayToPdf(null, 1);
    expect(result.dashArray).toBeNull();
    expect(result.dashPhase).toBe(0);
  });

  it('should apply scale factor', () => {
    const result = dashArrayToPdf([5, 3], 2);
    expect(result.dashArray).toEqual([10, 6]);
  });
});
