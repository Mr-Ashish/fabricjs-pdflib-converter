import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createDefaultRegistry } from '../../src/renderers/registry';
import { ImageLoader } from '../../src/images/image-loader';
import type { FabricCanvasJSON, RenderContext, FabricImageObject } from '../../src/types';
import imagesFixture from '../fixtures/images.json';

describe('Images Integration', () => {
  it('should convert canvas with images to valid PDF', async () => {
    const registry = createDefaultRegistry();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const imageLoader = new ImageLoader(undefined, pdfDoc);

    const context: RenderContext = {
      pdfDoc,
      page,
      fontManager: {} as RenderContext['fontManager'],
      imageLoader,
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

    const canvasJSON = imagesFixture as FabricCanvasJSON;

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

  it('should render image from data URL', async () => {
    const registry = createDefaultRegistry();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const imageLoader = new ImageLoader(undefined, pdfDoc);

    const image: FabricImageObject = {
      type: 'image',
      left: 50,
      top: 50,
      width: 100,
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
      stroke: null,
      strokeWidth: 0,
      opacity: 1,
      visible: true,
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      cropX: 0,
      cropY: 0,
      filters: [],
      alignX: 'none',
      alignY: 'none',
      meetOrSlice: 'meet',
    };

    const context: RenderContext = {
      pdfDoc,
      page,
      fontManager: {} as RenderContext['fontManager'],
      imageLoader,
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

    const renderer = registry.get('image');
    expect(renderer).toBeDefined();

    await renderer!.render(image, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('should render image with opacity', async () => {
    const registry = createDefaultRegistry();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const imageLoader = new ImageLoader(undefined, pdfDoc);

    const image: FabricImageObject = {
      type: 'image',
      left: 100,
      top: 100,
      width: 100,
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
      stroke: null,
      strokeWidth: 0,
      opacity: 0.5,
      visible: true,
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      cropX: 0,
      cropY: 0,
      filters: [],
      alignX: 'none',
      alignY: 'none',
      meetOrSlice: 'meet',
    };

    const context: RenderContext = {
      pdfDoc,
      page,
      fontManager: {} as RenderContext['fontManager'],
      imageLoader,
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

    const renderer = registry.get('image');
    expect(renderer).toBeDefined();

    await renderer!.render(image, page, context);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(0);
  });
});
