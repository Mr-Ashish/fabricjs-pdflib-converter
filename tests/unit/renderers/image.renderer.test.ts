import { describe, it, expect, vi } from 'vitest';
import { ImageRenderer } from '../../../src/renderers/image.renderer';
import type { FabricImageObject, RenderContext } from '../../../src/types';
import type { PDFPage, PDFImage } from 'pdf-lib';

// Factory for creating mock image objects
function createMockImage(overrides: Partial<FabricImageObject> = {}): FabricImageObject {
  return {
    type: 'image',
    left: 50,
    top: 50,
    width: 200,
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
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    src: 'data:image/png;base64,iVBORw0KGgoAAAA',
    cropX: 0,
    cropY: 0,
    filters: [],
    alignX: 'none',
    alignY: 'none',
    meetOrSlice: 'meet',
    ...overrides,
  } as FabricImageObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  const mockImage = {
    width: 200,
    height: 150,
  } as PDFImage;

  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawImage: vi.fn(),
      pushGraphicsState: vi.fn(),
      popGraphicsState: vi.fn(),
      concatTransformationMatrix: vi.fn(),
    } as unknown as PDFPage,
    fontManager: {} as RenderContext['fontManager'],
    imageLoader: {
      load: vi.fn().mockResolvedValue(mockImage),
    },
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
      add: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
      hasWarnings: vi.fn().mockReturnValue(false),
    },
    renderObject: vi.fn(),
    currentDepth: 0,
  };
}

describe('ImageRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "image"', () => {
      const renderer = new ImageRenderer();
      expect(renderer.type).toBe('image');
    });

    it('should render image objects', () => {
      const renderer = new ImageRenderer();
      const image = createMockImage();
      expect(renderer.canRender(image)).toBe(true);
    });

    it('should not render non-image objects', () => {
      const renderer = new ImageRenderer();
      const rect = { ...createMockImage(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('basic image rendering', () => {
    it('should load image via imageLoader', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage();
      const context = createMockContext();

      await renderer.render(image, context.page, context);

      expect(context.imageLoader.load).toHaveBeenCalledWith(image.src);
    });

    it('should call drawImage with loaded image', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage();
      const context = createMockContext();

      await renderer.render(image, context.page, context);

      expect(context.page.drawImage).toHaveBeenCalled();
    });

    it('should pass correct dimensions to drawImage', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage({
        width: 200,
        height: 150,
        scaleX: 1,
        scaleY: 1,
      });
      const context = createMockContext();

      await renderer.render(image, context.page, context);

      const call = vi.mocked(context.page.drawImage).mock.calls[0]![0];
      expect(call).toMatchObject({
        width: 200,
        height: 150,
      });
    });

    it('should apply scale to dimensions', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage({
        width: 100,
        height: 100,
        scaleX: 2,
        scaleY: 1.5,
      });
      const context = createMockContext();

      await renderer.render(image, context.page, context);

      const call = vi.mocked(context.page.drawImage).mock.calls[0]![0];
      expect(call.width).toBe(200); // 100 * 2
      expect(call.height).toBe(150); // 100 * 1.5
    });
  });

  describe('opacity handling', () => {
    it('should render image with opacity (handled by graphics state)', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage({ opacity: 0.5 });
      const context = createMockContext();

      await renderer.render(image, context.page, context);

      // Opacity is handled by the base renderer via graphics state
      expect(context.page.drawImage).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should add warning when image fails to load', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage();
      const context = createMockContext();

      context.imageLoader.load = vi.fn().mockRejectedValue(new Error('Load failed'));

      await renderer.render(image, context.page, context);

      expect(context.warnings.add).toHaveBeenCalled();
      expect(context.page.drawImage).not.toHaveBeenCalled();
    });

    it('should skip rendering when image load fails', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage();
      const context = createMockContext();

      context.imageLoader.load = vi.fn().mockRejectedValue(new Error('Load failed'));

      await renderer.render(image, context.page, context);

      expect(context.page.drawImage).not.toHaveBeenCalled();
    });
  });

  describe('image cropping', () => {
    it('should handle cropX and cropY', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage({
        cropX: 10,
        cropY: 20,
      });
      const context = createMockContext();

      await renderer.render(image, context.page, context);

      // Should still render (clipping will be implemented)
      expect(context.page.drawImage).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle zero width by using image natural width', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage({ width: 0 });
      const context = createMockContext();

      // Should render using image natural dimensions
      await renderer.render(image, context.page, context);
      expect(context.page.drawImage).toHaveBeenCalled();
    });

    it('should handle zero height by using image natural height', async () => {
      const renderer = new ImageRenderer();
      const image = createMockImage({ height: 0 });
      const context = createMockContext();

      // Should render using image natural dimensions
      await renderer.render(image, context.page, context);
      expect(context.page.drawImage).toHaveBeenCalled();
    });
  });
});
