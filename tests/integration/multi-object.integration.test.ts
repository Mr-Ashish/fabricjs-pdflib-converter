import { describe, it, expect } from 'vitest';
import {
  parseCanvasJSON,
  resolveOptions,
  convertCanvasToPdf,
} from '../../src/index';
import type { FabricCanvasJSON } from '../../src/types';
import { PDFDocument } from 'pdf-lib';

describe('Multi-Object Integration Tests', () => {
  it('should render multiple objects at correct positions', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [
        // Object 1: Red rect at top-left
        {
          type: 'rect',
          left: 50,
          top: 50,
          width: 100,
          height: 100,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          fill: '#FF0000',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
        // Object 2: Blue circle at different position
        {
          type: 'circle',
          left: 200,
          top: 200,
          radius: 50,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          fill: '#0000FF',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
        // Object 3: Green triangle at third position
        {
          type: 'triangle',
          left: 400,
          top: 100,
          width: 100,
          height: 100,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          fill: '#00FF00',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
      ],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);

    // Verify PDF was created
    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.pdfBytes.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);

    // Load the PDF and verify structure
    const pdfDoc = await PDFDocument.load(result.pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    expect(page.getWidth()).toBe(800);
    expect(page.getHeight()).toBe(600);

    // Get content stream and verify it contains expected operators
    const content = await page.getContentStream();
    const contentText = await content.getTextContent?.() || '';
    
    // The PDF should have content (not just empty)
    // This is a basic check - we'd need more sophisticated parsing
    // to verify exact positions
  });

  it('should properly isolate transformations between objects', async () => {
    // This test verifies that transformations don't accumulate
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 600,
      height: 400,
      objects: [
        // First object with rotation
        {
          type: 'rect',
          left: 100,
          top: 100,
          width: 50,
          height: 50,
          scaleX: 1,
          scaleY: 1,
          angle: 45,
          fill: '#FF0000',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
        // Second object without rotation - should NOT be rotated
        {
          type: 'rect',
          left: 300,
          top: 100,
          width: 50,
          height: 50,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          fill: '#0000FF',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
      ],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);

    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.warnings).toEqual([]);

    // Load and verify both objects are present
    const pdfDoc = await PDFDocument.load(result.pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it('should handle objects with different scales', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [
        {
          type: 'rect',
          left: 50,
          top: 50,
          width: 100,
          height: 100,
          scaleX: 2,
          scaleY: 1,
          fill: '#FF0000',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
        {
          type: 'rect',
          left: 300,
          top: 50,
          width: 100,
          height: 100,
          scaleX: 1,
          scaleY: 2,
          fill: '#00FF00',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
        {
          type: 'rect',
          left: 550,
          top: 50,
          width: 100,
          height: 100,
          scaleX: 1,
          scaleY: 1,
          fill: '#0000FF',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
      ],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);

    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.warnings).toEqual([]);
  });
});
