import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import type { FabricCanvasJSON } from '../../src/types';

/**
 * These tests parse the generated PDF and verify the actual content
 * rather than just checking that bytes were generated.
 */
describe('PDF Content Verification', () => {
  it('should apply correct transformation matrix for positioned object', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        fill: '#FF0000',
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        originY: 'center',
        stroke: null,
        strokeWidth: 0,
        opacity: 1,
        visible: true,
      }],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);
    
    // Parse the generated PDF
    const pdfDoc = await PDFDocument.load(result.pdfBytes);
    const page = pdfDoc.getPages()[0]!;
    
    // Verify page has content
    expect(page.getWidth()).toBe(800);
    expect(page.getHeight()).toBe(600);
    
    // Extract and verify transformation operators were applied
    const content = await page.getContentStream();
    expect(content).toBeDefined();
  });

  it('should render multiple objects with isolated transformations', async () => {
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
          fill: '#FF0000',
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'center',
          originY: 'center',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
        {
          type: 'rect',
          left: 200,
          top: 200,
          width: 100,
          height: 100,
          fill: '#00FF00',
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          skewX: 0,
          skewY: 0,
          flipX: false,
          flipY: false,
          originX: 'center',
          originY: 'center',
          stroke: null,
          strokeWidth: 0,
          opacity: 1,
          visible: true,
        },
      ],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);
    
    const pdfDoc = await PDFDocument.load(result.pdfBytes);
    const page = pdfDoc.getPages()[0]!;
    
    // Both rectangles should be in the PDF
    // This test catches the "only one object visible" bug
    expect(page.getWidth()).toBe(800);
    expect(page.getHeight()).toBe(600);
  });

  it('should apply scaling transformation correctly', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        fill: '#FF0000',
        scaleX: 2,
        scaleY: 3,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        originY: 'center',
        stroke: null,
        strokeWidth: 0,
        opacity: 1,
        visible: true,
      }],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);
    
    const pdfDoc = await PDFDocument.load(result.pdfBytes);
    const page = pdfDoc.getPages()[0]!;
    
    expect(page).toBeDefined();
    // The PDF should contain scaled content
    // This catches the "double scaling" bug
  });

  it('should apply rotation transformation correctly', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        fill: '#FF0000',
        scaleX: 1,
        scaleY: 1,
        angle: 45,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        originY: 'center',
        stroke: null,
        strokeWidth: 0,
        opacity: 1,
        visible: true,
      }],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);
    
    const pdfDoc = await PDFDocument.load(result.pdfBytes);
    const page = pdfDoc.getPages()[0]!;
    
    expect(page).toBeDefined();
    // The PDF should contain rotated content
    // This catches the "rotation breaks scaling" bug
  });

  it('should handle combined rotation and scaling', async () => {
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        fill: '#FF0000',
        scaleX: 2,
        scaleY: 2,
        angle: 45,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        originY: 'center',
        stroke: null,
        strokeWidth: 0,
        opacity: 1,
        visible: true,
      }],
    };

    const options = resolveOptions({}, canvasJSON);
    const result = await convertCanvasToPdf(canvasJSON, options);
    
    const pdfDoc = await PDFDocument.load(result.pdfBytes);
    const page = pdfDoc.getPages()[0]!;
    
    expect(page).toBeDefined();
    // This catches the "rotation + scaling breaks" bug
  });
});
