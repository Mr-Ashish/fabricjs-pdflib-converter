/**
 * PDF.js Position Verification Tests
 * 
 * These tests parse generated PDFs and verify actual element positions,
 * catching positioning bugs that mock-based tests miss.
 */

import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { extractElements, extractOperators } from '../helpers/pdfjs-helpers';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

describe('PDF.js Position Verification', () => {
  describe('Single Object Positioning', () => {
    it('should position rect at correct PDF coordinates with center origin', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [{
          type: 'rect',
          left: 100,
          top: 100,
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
          rx: 0,
          ry: 0,
        } as FabricRectObject],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(1);
      expect(elements[0].type).toBe('rect');
      
      // With center origin:
      // - Fabric left=100, top=100 means center is at (100, 100)
      // - PDF Y is flipped: y = pageHeight - top = 600 - 100 = 500
      // - Rect extends from center - half size to center + half size
      // - In PDF: x = 100 - 50 = 50, y = 500 - 50 = 450
      expect(elements[0].bounds.x).toBeCloseTo(50, 1);
      expect(elements[0].bounds.y).toBeCloseTo(450, 1);
      expect(elements[0].bounds.width).toBeCloseTo(100, 1);
      expect(elements[0].bounds.height).toBeCloseTo(100, 1);
    });

    it('should flip Y coordinates from Fabric to PDF', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          {
            type: 'rect',
            left: 100,
            top: 100, // Near top of canvas
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
            rx: 0,
            ry: 0,
          } as FabricRectObject,
          {
            type: 'rect',
            left: 100,
            top: 500, // Near bottom of canvas
            width: 50,
            height: 50,
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
            rx: 0,
            ry: 0,
          } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(2);
      
      // Object at Fabric top=100 (near top) should be at higher PDF Y
      // Object at Fabric top=500 (near bottom) should be at lower PDF Y
      // In PDF coordinates, Y increases upward
      expect(elements[0].bounds.y).toBeGreaterThan(elements[1].bounds.y);
      
      // First rect (top=100) should be at y ≈ 600 - 100 - 25 = 475
      expect(elements[0].bounds.y).toBeCloseTo(475, 10);
      
      // Second rect (top=500) should be at y ≈ 600 - 500 - 25 = 75
      expect(elements[1].bounds.y).toBeCloseTo(75, 10);
    });

    it('should maintain relative X positions', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          {
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
            rx: 0,
            ry: 0,
          } as FabricRectObject,
          {
            type: 'rect',
            left: 300, // 200px to the right
            top: 100,
            width: 50,
            height: 50,
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
            rx: 0,
            ry: 0,
          } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(2);
      
      // X spacing should be maintained (200px difference in Fabric)
      // With center origin: left positions are centers, so x difference is still 200
      const xDiff = elements[1].bounds.x - elements[0].bounds.x;
      expect(xDiff).toBeCloseTo(200, 1);
    });

    it('should maintain relative Y positions with flipped coordinates', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          {
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
            rx: 0,
            ry: 0,
          } as FabricRectObject,
          {
            type: 'rect',
            left: 100,
            top: 300, // 200px below in Fabric (Y-down)
            width: 50,
            height: 50,
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
            rx: 0,
            ry: 0,
          } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(2);
      
      // In PDF coordinates (Y-up), second rect should be BELOW first rect
      // which means it has a LOWER Y value
      expect(elements[1].bounds.y).toBeLessThan(elements[0].bounds.y);
      
      // Y difference should be 200px (maintained from Fabric)
      const yDiff = elements[0].bounds.y - elements[1].bounds.y;
      expect(yDiff).toBeCloseTo(200, 1);
    });
  });

  describe('Multiple Objects Grid', () => {
    it('should position 2x2 grid correctly', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          // Row 1
          { type: 'rect', left: 100, top: 100, width: 50, height: 50, fill: '#FF0000', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'rect', left: 300, top: 100, width: 50, height: 50, fill: '#00FF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          // Row 2
          { type: 'rect', left: 100, top: 300, width: 50, height: 50, fill: '#0000FF', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
          { type: 'rect', left: 300, top: 300, width: 50, height: 50, fill: '#FFFF00', originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, stroke: null, strokeWidth: 0, opacity: 1, visible: true, rx: 0, ry: 0 } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(4);
      
      // Verify all elements are rectangles
      elements.forEach(el => expect(el.type).toBe('rect'));
      
      // Check horizontal spacing (200px between columns)
      const col1X = elements[0].bounds.x;
      const col2X = elements[1].bounds.x;
      expect(col2X - col1X).toBeCloseTo(200, 1);
      
      // Check vertical spacing (200px between rows, but negative in PDF Y)
      const row1Y = elements[0].bounds.y;
      const row2Y = elements[2].bounds.y;
      expect(row1Y - row2Y).toBeCloseTo(200, 1);
    });
  });

  describe('Page Boundaries', () => {
    it('should handle objects at page edges', async () => {
      const canvasJSON: FabricCanvasJSON = {
        version: '5.3.0',
        width: 800,
        height: 600,
        objects: [
          {
            type: 'rect',
            left: 0,
            top: 0,
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
            rx: 0,
            ry: 0,
          } as FabricRectObject,
        ],
      };

      const options = resolveOptions({}, canvasJSON);
      const result = await convertCanvasToPdf(canvasJSON, options);

      const elements = await extractElements(result.pdfBytes);

      expect(elements).toHaveLength(1);
      
      // Object at (0, 0) with center origin extends from (-25, -25) to (25, 25)
      // In PDF Y: 600 - 0 = 600, so extends from 600 - 25 = 575 to 600 + 25 = 625
      // But page height is 600, so part is off-page (expected behavior)
      expect(elements[0].bounds.x).toBeCloseTo(-25, 1);
    });
  });
});
