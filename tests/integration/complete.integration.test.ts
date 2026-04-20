import { describe, it, expect } from 'vitest';
import {
  parseCanvasJSON,
  resolveOptions,
  convertCanvasToPdf,
} from '../../src/index';
import type { FabricCanvasJSON, FabricObject } from '../../src/types';

// Helper to create a complete Fabric object with all required properties
function createObject(type: string, props: Partial<FabricObject> = {}): FabricObject {
  return {
    type,
    left: 0,
    top: 0,
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
    opacity: 1,
    visible: true,
    ...props,
  } as FabricObject;
}

describe('End-to-End Integration Tests', () => {
  describe('Basic shapes canvas', () => {
    it('should convert a canvas with multiple shapes', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          createObject('rect', {
            left: 10,
            top: 10,
            width: 100,
            height: 50,
            fill: '#FF0000',
          }),
          createObject('circle', {
            left: 150,
            top: 10,
            radius: 30,
            fill: '#00FF00',
          }),
          createObject('triangle', {
            left: 250,
            top: 10,
            width: 60,
            height: 60,
            fill: '#0000FF',
          }),
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.pdfBytes.length).toBeGreaterThan(0);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('Text rendering', () => {
    it('should convert a canvas with text', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          {
            ...createObject('text', {
              left: 10,
              top: 10,
              width: 200,
              height: 50,
              fill: '#000000',
            }),
            text: 'Hello World',
            fontFamily: 'Helvetica',
            fontSize: 24,
            fontWeight: 'normal',
            fontStyle: 'normal',
            lineHeight: 1.16,
            textAlign: 'left',
          },
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.pdfBytes.length).toBeGreaterThan(0);
    });

    it('should convert a canvas with multi-line text', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          {
            ...createObject('text', {
              left: 10,
              top: 10,
              width: 200,
              height: 100,
              fill: '#000000',
            }),
            text: 'Line 1\nLine 2\nLine 3',
            fontFamily: 'Helvetica',
            fontSize: 16,
            fontWeight: 'normal',
            fontStyle: 'normal',
            lineHeight: 1.5,
            textAlign: 'left',
          },
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.pdfBytes.length).toBeGreaterThan(0);
    });
  });

  describe('Complex canvas', () => {
    it('should convert a canvas with mixed objects', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          // Background rect
          createObject('rect', {
            left: 0,
            top: 0,
            width: 800,
            height: 600,
            fill: '#F0F0F0',
          }),
          // Header text
          {
            ...createObject('text', {
              left: 20,
              top: 20,
              width: 300,
              height: 40,
              fill: '#333333',
            }),
            text: 'Test Document',
            fontFamily: 'Helvetica',
            fontSize: 32,
            fontWeight: 'bold',
            fontStyle: 'normal',
            lineHeight: 1.16,
            textAlign: 'left',
          },
          // Content area
          createObject('rect', {
            left: 20,
            top: 80,
            width: 760,
            height: 500,
            fill: '#FFFFFF',
            stroke: '#CCCCCC',
            strokeWidth: 1,
          }),
          // Circle decoration
          createObject('circle', {
            left: 700,
            top: 100,
            radius: 20,
            fill: '#FF6B6B',
          }),
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.pdfBytes.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle unsupported object types gracefully', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          createObject('rect', {
            left: 10,
            top: 10,
            width: 100,
            height: 50,
            fill: '#FF0000',
          }),
          createObject('unsupported-type', {
            left: 200,
            top: 10,
          }),
        ],
      };

      const options = resolveOptions({ onUnsupported: 'warn' }, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]!.type).toBe('unsupported_feature');
    });

    it('should handle empty canvas', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.pdfBytes.length).toBeGreaterThan(0);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('JSON parsing', () => {
    it('should parse and convert JSON string input', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          createObject('rect', {
            left: 10,
            top: 10,
            width: 100,
            height: 50,
            fill: '#FF0000',
          }),
        ],
      };

      const jsonString = JSON.stringify(canvasJSON);
      const parsed = parseCanvasJSON(jsonString);
      const options = resolveOptions({}, parsed);
      const result = await convertCanvasToPdf(parsed, options);

      expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
      expect(result.pdfBytes.length).toBeGreaterThan(0);
    });
  });
});
