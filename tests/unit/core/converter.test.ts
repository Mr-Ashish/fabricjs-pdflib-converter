import { describe, it, expect, vi } from 'vitest';
import {
  parseCanvasJSON,
  resolveOptions,
  convertCanvasToPdf,
} from '../../../src/core/converter';
import { InvalidInputError } from '../../../src/errors';
import type { FabricCanvasJSON, ConverterOptions } from '../../../src/types';

describe('parseCanvasJSON', () => {
  it('should parse valid canvas JSON', () => {
    const input = {
      version: '5.3.0',
      objects: [{ type: 'rect', left: 10, top: 10, width: 100, height: 50 }],
    };

    const result = parseCanvasJSON(input);
    expect(result.version).toBe('5.3.0');
    expect(result.objects).toHaveLength(1);
  });

  it('should parse JSON string', () => {
    const input = JSON.stringify({
      version: '5.3.0',
      objects: [],
    });

    const result = parseCanvasJSON(input);
    expect(result.version).toBe('5.3.0');
  });

  it('should throw InvalidInputError for null input', () => {
    expect(() => parseCanvasJSON(null)).toThrow(InvalidInputError);
  });

  it('should throw InvalidInputError for missing objects array', () => {
    expect(() => parseCanvasJSON({ version: '5.3.0' })).toThrow(InvalidInputError);
  });

  it('should throw InvalidInputError for non-array objects', () => {
    expect(() => parseCanvasJSON({ version: '5.3.0', objects: 'not-an-array' })).toThrow(InvalidInputError);
  });

  it('should throw InvalidInputError for object without type', () => {
    expect(() => parseCanvasJSON({
      version: '5.3.0',
      objects: [{ left: 10, top: 10 }],
    })).toThrow(InvalidInputError);
  });
});

describe('resolveOptions', () => {
  it('should apply defaults when no options provided', () => {
    const result = resolveOptions();
    expect(result.scale).toBe(1);
    expect(result.defaultFont).toBe('Helvetica');
    expect(result.maxGroupDepth).toBe(20);
  });

  it('should use canvas dimensions when available', () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      objects: [],
      width: 800,
      height: 600,
    };

    const result = resolveOptions({}, canvasJSON);
    expect(result.pageWidth).toBe(800);
    expect(result.pageHeight).toBe(600);
  });

  it('should use A4 defaults when canvas dimensions not available', () => {
    const result = resolveOptions();
    expect(result.pageWidth).toBe(595.28);
    expect(result.pageHeight).toBe(841.89);
  });

  it('should override defaults with provided options', () => {
    const options: ConverterOptions = {
      scale: 2,
      defaultFont: 'Times-Roman',
      pageWidth: 400,
    };

    const result = resolveOptions(options);
    expect(result.scale).toBe(2);
    expect(result.defaultFont).toBe('Times-Roman');
    expect(result.pageWidth).toBe(400);
  });

  it('should resolve margins with defaults', () => {
    const result = resolveOptions({ margin: { top: 10 } });
    expect(result.margin).toEqual({ top: 10, right: 0, bottom: 0, left: 0 });
  });
});

describe('convertCanvasToPdf', () => {
  it('should convert canvas to PDF bytes', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      objects: [], // Empty canvas for simpler test
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);

    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.pdfBytes.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  });

  it('should return warnings for unsupported objects', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      objects: [
        { type: 'unknown-type', left: 10, top: 10 },
      ],
    };

    const options = resolveOptions({ onUnsupported: 'warn' }, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);

    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should handle empty canvas', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      objects: [],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);

    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
  });
});
