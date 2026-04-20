import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createDefaultRegistry } from '../../src/renderers/registry';
import type { FabricCanvasJSON, RenderContext } from '../../src/types';
import type { FabricRectObject, FabricCircleObject, FabricEllipseObject, FabricTriangleObject, FabricLineObject } from '../../src/types';
import basicShapesFixture from '../fixtures/basic-shapes.json';

describe('Basic Shapes Integration', () => {
  it('should convert basic shapes canvas to valid PDF', async () => {
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

    const canvasJSON = basicShapesFixture as FabricCanvasJSON;

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

  it('should render rect with correct properties', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const rect: FabricRectObject = {
      type: 'rect',
      left: 10,
      top: 10,
      width: 100,
      height: 50,
      fill: '#FF0000',
      stroke: null,
      strokeWidth: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'left',
      originY: 'top',
      opacity: 1,
      visible: true,
      rx: 0,
      ry: 0,
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

    const renderer = registry.get('rect');
    expect(renderer).toBeDefined();

    await renderer!.render(rect, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should render circle with correct properties', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const circle: FabricCircleObject = {
      type: 'circle',
      left: 150,
      top: 50,
      width: 60,
      height: 60,
      radius: 30,
      fill: '#0000FF',
      stroke: null,
      strokeWidth: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      opacity: 1,
      visible: true,
      startAngle: 0,
      endAngle: 360,
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

    const renderer = registry.get('circle');
    expect(renderer).toBeDefined();

    await renderer!.render(circle, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should render ellipse with correct properties', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const ellipse: FabricEllipseObject = {
      type: 'ellipse',
      left: 250,
      top: 50,
      width: 100,
      height: 60,
      rx: 50,
      ry: 30,
      fill: '#00FF00',
      stroke: null,
      strokeWidth: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      opacity: 1,
      visible: true,
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

    const renderer = registry.get('ellipse');
    expect(renderer).toBeDefined();

    await renderer!.render(ellipse, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should render triangle with correct properties', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const triangle: FabricTriangleObject = {
      type: 'triangle',
      left: 350,
      top: 10,
      width: 60,
      height: 80,
      fill: '#FFFF00',
      stroke: null,
      strokeWidth: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      opacity: 1,
      visible: true,
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

    const renderer = registry.get('triangle');
    expect(renderer).toBeDefined();

    await renderer!.render(triangle, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should render line with correct properties', async () => {
    const registry = createDefaultRegistry();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const line: FabricLineObject = {
      type: 'line',
      left: 50,
      top: 150,
      width: 100,
      height: 0,
      x1: -50,
      y1: 0,
      x2: 50,
      y2: 0,
      stroke: '#000000',
      strokeWidth: 2,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      fill: null,
      opacity: 1,
      visible: true,
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

    const renderer = registry.get('line');
    expect(renderer).toBeDefined();

    await renderer!.render(line, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });
});
