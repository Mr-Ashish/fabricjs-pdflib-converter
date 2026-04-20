import { describe, it, expect, vi } from 'vitest';
import { ImageLoader } from '../../../src/images/image-loader';
import { ImageLoadError } from '../../../src/errors';
import type { PDFDocument, PDFImage } from 'pdf-lib';
import type { ImageResolver } from '../../../src/types';

// Mock PDFDocument
function createMockPDFDocument() {
  return {
    embedPng: vi.fn().mockResolvedValue({ width: 100, height: 100 } as PDFImage),
    embedJpg: vi.fn().mockResolvedValue({ width: 100, height: 100 } as PDFImage),
  } as unknown as PDFDocument;
}

// Sample base64 PNG (1x1 pixel red PNG)
const samplePngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// Sample base64 JPG (minimal valid JPG header)
const sampleJpgBase64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=';

describe('ImageLoader', () => {
  describe('constructor', () => {
    it('should create with imageResolver and PDFDocument', () => {
      const pdfDoc = createMockPDFDocument();
      const resolver: ImageResolver = async (src) => new Uint8Array();

      const loader = new ImageLoader(resolver, pdfDoc);
      expect(loader).toBeDefined();
    });

    it('should create without imageResolver', () => {
      const pdfDoc = createMockPDFDocument();

      const loader = new ImageLoader(undefined, pdfDoc);
      expect(loader).toBeDefined();
    });
  });

  describe('load from data URL (PNG)', () => {
    it('should load PNG from base64 data URL', async () => {
      const pdfDoc = createMockPDFDocument();
      const loader = new ImageLoader(undefined, pdfDoc);

      const dataUrl = `data:image/png;base64,${samplePngBase64}`;
      const image = await loader.load(dataUrl);

      expect(image).toBeDefined();
      expect(pdfDoc.embedPng).toHaveBeenCalled();
    });

    it('should cache PNG images by src', async () => {
      const pdfDoc = createMockPDFDocument();
      const loader = new ImageLoader(undefined, pdfDoc);

      const dataUrl = `data:image/png;base64,${samplePngBase64}`;

      // Load same image twice
      const image1 = await loader.load(dataUrl);
      const image2 = await loader.load(dataUrl);

      // Should return same cached instance
      expect(image1).toBe(image2);
      // Should only embed once
      expect(pdfDoc.embedPng).toHaveBeenCalledTimes(1);
    });
  });

  describe('load from data URL (JPG)', () => {
    it('should load JPG from base64 data URL', async () => {
      const pdfDoc = createMockPDFDocument();
      const loader = new ImageLoader(undefined, pdfDoc);

      const dataUrl = `data:image/jpeg;base64,${sampleJpgBase64}`;
      const image = await loader.load(dataUrl);

      expect(image).toBeDefined();
      expect(pdfDoc.embedJpg).toHaveBeenCalled();
    });

    it('should cache JPG images by src', async () => {
      const pdfDoc = createMockPDFDocument();
      const loader = new ImageLoader(undefined, pdfDoc);

      const dataUrl = `data:image/jpeg;base64,${sampleJpgBase64}`;

      // Load same image twice
      const image1 = await loader.load(dataUrl);
      const image2 = await loader.load(dataUrl);

      // Should return same cached instance
      expect(image1).toBe(image2);
      // Should only embed once
      expect(pdfDoc.embedJpg).toHaveBeenCalledTimes(1);
    });
  });

  describe('load from URL via resolver', () => {
    it('should use imageResolver for non-data URLs', async () => {
      const pdfDoc = createMockPDFDocument();
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const resolver: ImageResolver = vi.fn().mockResolvedValue(pngBytes);

      const loader = new ImageLoader(resolver, pdfDoc);
      const image = await loader.load('https://example.com/image.png');

      expect(resolver).toHaveBeenCalledWith('https://example.com/image.png');
      expect(pdfDoc.embedPng).toHaveBeenCalled();
      expect(image).toBeDefined();
    });

    it('should throw ImageLoadError if no resolver for external URL', async () => {
      const pdfDoc = createMockPDFDocument();
      const loader = new ImageLoader(undefined, pdfDoc);

      await expect(
        loader.load('https://example.com/image.png')
      ).rejects.toThrow(ImageLoadError);
    });

    it('should throw ImageLoadError if resolver fails', async () => {
      const pdfDoc = createMockPDFDocument();
      const resolver: ImageResolver = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));

      const loader = new ImageLoader(resolver, pdfDoc);

      await expect(
        loader.load('https://example.com/image.png')
      ).rejects.toThrow(ImageLoadError);
    });
  });

  describe('unsupported formats', () => {
    it('should throw ImageLoadError for unsupported format in data URL', async () => {
      const pdfDoc = createMockPDFDocument();
      const loader = new ImageLoader(undefined, pdfDoc);

      const webpDataUrl =
        'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

      await expect(loader.load(webpDataUrl)).rejects.toThrow(ImageLoadError);
    });

    it('should throw ImageLoadError for unknown magic bytes', async () => {
      const pdfDoc = createMockPDFDocument();
      const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const resolver: ImageResolver = vi.fn().mockResolvedValue(unknownBytes);

      const loader = new ImageLoader(resolver, pdfDoc);

      await expect(
        loader.load('https://example.com/image.bmp')
      ).rejects.toThrow(ImageLoadError);
    });
  });

  describe('caching', () => {
    it('should cache different images separately', async () => {
      const pdfDoc = createMockPDFDocument();
      const loader = new ImageLoader(undefined, pdfDoc);

      const pngDataUrl = `data:image/png;base64,${samplePngBase64}`;
      const jpgDataUrl = `data:image/jpeg;base64,${sampleJpgBase64}`;

      const pngImage = await loader.load(pngDataUrl);
      const jpgImage = await loader.load(jpgDataUrl);

      // Should be different objects
      expect(pngImage).not.toBe(jpgImage);
      // Each should be embedded once
      expect(pdfDoc.embedPng).toHaveBeenCalledTimes(1);
      expect(pdfDoc.embedJpg).toHaveBeenCalledTimes(1);
    });
  });
});
