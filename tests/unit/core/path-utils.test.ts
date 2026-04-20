import { describe, it, expect } from 'vitest';
import {
  pathCommandsToSvg,
  svgPathToPdfOps,
  scalePath,
} from '../../../src/core/path-utils';
import type { PathCommand } from '../../../src/types';

describe('pathCommandsToSvg', () => {
  it('should convert move command', () => {
    const commands: PathCommand[] = [['M', 10, 20]];
    expect(pathCommandsToSvg(commands)).toBe('M 10 20');
  });

  it('should convert line command', () => {
    const commands: PathCommand[] = [['L', 30, 40]];
    expect(pathCommandsToSvg(commands)).toBe('L 30 40');
  });

  it('should convert cubic bezier', () => {
    const commands: PathCommand[] = [['C', 10, 20, 30, 40, 50, 60]];
    expect(pathCommandsToSvg(commands)).toBe('C 10 20 30 40 50 60');
  });

  it('should convert quadratic bezier', () => {
    const commands: PathCommand[] = [['Q', 10, 20, 30, 40]];
    expect(pathCommandsToSvg(commands)).toBe('Q 10 20 30 40');
  });

  it('should convert arc command', () => {
    const commands: PathCommand[] = [['A', 50, 50, 0, 0, 1, 100, 100]];
    expect(pathCommandsToSvg(commands)).toBe('A 50 50 0 0 1 100 100');
  });

  it('should convert close path', () => {
    const commands: PathCommand[] = [['Z']];
    expect(pathCommandsToSvg(commands)).toBe('Z');
  });

  it('should convert multiple commands', () => {
    const commands: PathCommand[] = [
      ['M', 0, 0],
      ['L', 100, 0],
      ['L', 100, 100],
      ['L', 0, 100],
      ['Z'],
    ];
    expect(pathCommandsToSvg(commands)).toBe('M 0 0 L 100 0 L 100 100 L 0 100 Z');
  });

  it('should handle empty array', () => {
    expect(pathCommandsToSvg([])).toBe('');
  });
});

describe('svgPathToPdfOps', () => {
  it('should convert simple path to PDF operations', () => {
    const svgPath = 'M 10 20 L 30 40';
    const ops = svgPathToPdfOps(svgPath);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toEqual({ type: 'moveTo', x: 10, y: 20 });
    expect(ops[1]).toEqual({ type: 'lineTo', x: 30, y: 40 });
  });

  it('should convert close path to close op', () => {
    const svgPath = 'M 0 0 L 100 0 Z';
    const ops = svgPathToPdfOps(svgPath);
    expect(ops[ops.length - 1]).toEqual({ type: 'closePath' });
  });

  it('should handle cubic bezier', () => {
    const svgPath = 'M 0 0 C 10 20 30 40 50 60';
    const ops = svgPathToPdfOps(svgPath);
    expect(ops[1]).toEqual({
      type: 'curveTo',
      cp1x: 10,
      cp1y: 20,
      cp2x: 30,
      cp2y: 40,
      x: 50,
      y: 60,
    });
  });
});

describe('scalePath', () => {
  it('should scale all coordinates', () => {
    const commands: PathCommand[] = [
      ['M', 10, 20],
      ['L', 30, 40],
    ];
    const scaled = scalePath(commands, 2);
    expect(scaled).toEqual([
      ['M', 20, 40],
      ['L', 60, 80],
    ]);
  });

  it('should not mutate original', () => {
    const commands: PathCommand[] = [['M', 10, 20]];
    const original = [...commands];
    scalePath(commands, 2);
    expect(commands).toEqual(original);
  });

  it('should handle scale of 1', () => {
    const commands: PathCommand[] = [['M', 10, 20]];
    expect(scalePath(commands, 1)).toEqual([['M', 10, 20]]);
  });

  it('should handle arc commands with rx, ry', () => {
    const commands: PathCommand[] = [['A', 50, 50, 0, 0, 1, 100, 100]];
    const scaled = scalePath(commands, 2);
    expect(scaled).toEqual([['A', 100, 100, 0, 0, 1, 200, 200]]);
  });
});
