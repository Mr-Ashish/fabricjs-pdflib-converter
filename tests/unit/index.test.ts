import { describe, it, expect } from 'vitest';
import {
  parseCanvasJSON,
  resolveOptions,
  convertCanvasToPdf,
  parseColor,
  ptToPx,
  pxToPt,
  createDefaultRegistry,
  BaseRenderer,
  ConversionError,
} from '../../src/index';
import type { FabricCanvasJSON, ConverterOptions } from '../../src/index';

describe('Public API', () => {
  describe('parseCanvasJSON', () => {
    it('should be exported and functional', () => {
      const input = { version: '5.3.0', objects: [] };
      const result = parseCanvasJSON(input);
      expect(result.version).toBe('5.3.0');
    });
  });

  describe('resolveOptions', () => {
    it('should be exported and functional', () => {
      const options: ConverterOptions = { scale: 2 };
      const result = resolveOptions(options);
      expect(result.scale).toBe(2);
    });
  });

  describe('convertCanvasToPdf', () => {
    it('should be exported and functional', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        objects: [],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('parseColor', () => {
    it('should be exported and functional', () => {
      const result = parseColor('#FF0000');
      expect(result).toBeDefined(); expect(result?.r).toBe(1); expect(result?.g).toBe(0); expect(result?.b).toBe(0);
    });
  });

  describe('unit conversion', () => {
    it('should export ptToPx', () => {
      expect(ptToPx(72)).toBeGreaterThan(0);
    });

    it('should export pxToPt', () => {
      expect(pxToPt(96)).toBeGreaterThan(0);
    });
  });

  describe('createDefaultRegistry', () => {
    it('should be exported and return a registry', () => {
      const registry = createDefaultRegistry();
      expect(registry.has('rect')).toBe(true);
      expect(registry.has('circle')).toBe(true);
      expect(registry.has('text')).toBe(true);
    });
  });

  describe('BaseRenderer', () => {
    it('should be exported as a class', () => {
      expect(typeof BaseRenderer).toBe('function');
    });
  });

  describe('ConversionError', () => {
    it('should be exported as a class', () => {
      expect(typeof ConversionError).toBe('function');
    });

    it('should be throwable', () => {
      expect(() => {
        throw new ConversionError('test error');
      }).toThrow('test error');
    });
  });
});
