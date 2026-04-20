import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createDefaultRegistry } from '../../src/renderers/registry';
import type { FabricCanvasJSON, RenderContext } from '../../src/types';
import type { FabricPathObject, FabricPolylineObject, FabricPolygonObject } from '../../src/types';
import vectorPathsFixture from '../fixtures/vector-paths.json';

describe('Vector Paths Integration', () => {
  it('should convert vector paths canvas to valid PDF', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const context: RenderContext = {
      pdfDoc,
      page,
      fontManager: {} as RenderContext['fontManager'],
      imageLoader: {} as RenderContext['imageLoader'],
      options: {
        scale: 1,
        pageWidth: 595,
        pageHeight: 842,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        fonts: {},
        defaultFont: 'Helvetica',
        onUnsupported: 'warn',
        maxGroupDepth: 20,
      },
      warnings: {
        add: () => {},
        getAll: () => [],
        hasWarnings: () => false,
      },
      renderObject: async () => {},
      currentDepth: 0,
    };

    const canvasJSON = vectorPathsFixture as FabricCanvasJSON;

    // Render each object
    for (const obj of canvasJSON.objects) {
      const renderer = registry.get(obj.type);
      if (renderer) {
        await renderer.render(obj, page, context);
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Verify PDF is valid
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 4));
    expect(pdfHeader).toBe('%PDF');
    expect(pdfBytes.length).toBeGreaterThan(100);
  });

  it('should render path with cubic bezier curves', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const path: FabricPathObject = {
      type: 'path',
      left: 50,
      top: 50,
      width: 200,
      height: 100,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'left',
      originY: 'top',
      fill: '#FF6B6B',
      stroke: '#4ECDC4',
      strokeWidth: 3,
      opacity: 1,
      visible: true,
      path: [
        ['M', 0, 50],
        ['C', 50, 0, 150, 0, 200, 50],
        ['C', 150, 100, 50, 100, 0, 50],
        ['Z'],
      ],
    };

    const context: RenderContext = {
      pdfDoc,
      page,
      fontManager: {} as RenderContext['fontManager'],
      imageLoader: {} as RenderContext['imageLoader'],
      options: {
        scale: 1,
        pageWidth: 595,
        pageHeight: 842,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        fonts: {},
        defaultFont: 'Helvetica',
        onUnsupported: 'warn',
        maxGroupDepth: 20,
      },
      warnings: {
        add: () => {},
        getAll: () => [],
        hasWarnings: () => false,
      },
      renderObject: async () => {},
      currentDepth: 0,
    };

    const renderer = registry.get('path');
    expect(renderer).toBeDefined();

    await renderer!.render(path, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should render polyline with multiple points', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const polyline: FabricPolylineObject = {
      type: 'polyline',
      left: 50,
      top: 200,
      width: 200,
      height: 100,
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
      stroke: '#96CEB4',
      strokeWidth: 5,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      opacity: 1,
      visible: true,
      points: [
        { x: 0, y: 100 },
        { x: 50, y: 0 },
        { x: 100, y: 100 },
        { x: 150, y: 0 },
        { x: 200, y: 100 },
      ],
    };

    const context: RenderContext = {
      pdfDoc,
      page,
      fontManager: {} as RenderContext['fontManager'],
      imageLoader: {} as RenderContext['imageLoader'],
      options: {
        scale: 1,
        pageWidth: 595,
        pageHeight: 842,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        fonts: {},
        defaultFont: 'Helvetica',
        onUnsupported: 'warn',
        maxGroupDepth: 20,
      },
      warnings: {
        add: () => {},
        getAll: () => [],
        hasWarnings: () => false,
      },
      renderObject: async () => {},
      currentDepth: 0,
    };

    const renderer = registry.get('polyline');
    expect(renderer).toBeDefined();

    await renderer!.render(polyline, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should render polygon (hexagon) with fill', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const polygon: FabricPolygonObject = {
      type: 'polygon',
      left: 300,
      top: 250,
      width: 120,
      height: 120,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'left',
      originY: 'top',
      fill: '#FFEAA7',
      stroke: '#DDA0DD',
      strokeWidth: 3,
      opacity: 1,
      visible: true,
      points: [
        { x: 60, y: 0 },
        { x: 120, y: 30 },
        { x: 120, y: 90 },
        { x: 60, y: 120 },
        { x: 0, y: 90 },
        { x: 0, y: 30 },
      ],
    };

    const context: RenderContext = {
      pdfDoc,
      page,
      fontManager: {} as RenderContext['fontManager'],
      imageLoader: {} as RenderContext['imageLoader'],
      options: {
        scale: 1,
        pageWidth: 595,
        pageHeight: 842,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        fonts: {},
        defaultFont: 'Helvetica',
        onUnsupported: 'warn',
        maxGroupDepth: 20,
      },
      warnings: {
        add: () => {},
        getAll: () => [],
        hasWarnings: () => false,
      },
      renderObject: async () => {},
      currentDepth: 0,
    };

    const renderer = registry.get('polygon');
    expect(renderer).toBeDefined();

    await renderer!.render(polygon, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should render path with dash array pattern', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const path: FabricPathObject = {
      type: 'path',
      left: 300,
      top: 50,
      width: 150,
      height: 150,
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
      stroke: '#45B7D1',
      strokeWidth: 4,
      strokeDashArray: [10, 5],
      opacity: 1,
      visible: true,
      path: [
        ['M', 0, 75],
        ['L', 75, 0],
        ['L', 150, 75],
        ['L', 75, 150],
        ['Z'],
      ],
    };

    const context: RenderContext = {
      pdfDoc,
      page,
      fontManager: {} as RenderContext['fontManager'],
      imageLoader: {} as RenderContext['imageLoader'],
      options: {
        scale: 1,
        pageWidth: 595,
        pageHeight: 842,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        fonts: {},
        defaultFont: 'Helvetica',
        onUnsupported: 'warn',
        maxGroupDepth: 20,
      },
      warnings: {
        add: () => {},
        getAll: () => [],
        hasWarnings: () => false,
      },
      renderObject: async () => {},
      currentDepth: 0,
    };

    const renderer = registry.get('path');
    expect(renderer).toBeDefined();

    await renderer!.render(path, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });
});
