import { describe, it, expect, vi } from 'vitest';
import { FontManager } from '../../../src/fonts/font-manager';
import { FontNotFoundError } from '../../../src/errors';
import type { PDFDocument, PDFFont } from 'pdf-lib';
import type { FontRegistry } from '../../../src/types';

// Mock PDFDocument
function createMockPDFDocument() {
  let callCount = 0;

  return {
    embedFont: vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        widthOfTextAtSize: vi.fn().mockReturnValue(100),
        heightAtSize: vi.fn().mockReturnValue(12),
        _id: callCount, // Unique ID for each call
      } as unknown as PDFFont);
    }),
  } as unknown as PDFDocument;
}

describe('FontManager', () => {
  describe('constructor', () => {
    it('should create with font registry and default font', () => {
      const pdfDoc = createMockPDFDocument();
      const registry: FontRegistry = {};

      const manager = new FontManager(registry, 'Helvetica', pdfDoc);
      expect(manager).toBeDefined();
    });
  });

  describe('resolve standard fonts', () => {
    it('should resolve Helvetica', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      const font = await manager.resolve('Helvetica', 'normal', 'normal');
      expect(font).toBeDefined();
      expect(pdfDoc.embedFont).toHaveBeenCalled();
    });

    it('should resolve Times-Roman', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Times-Roman', pdfDoc);

      const font = await manager.resolve('Times-Roman', 'normal', 'normal');
      expect(font).toBeDefined();
    });

    it('should resolve Courier', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Courier', pdfDoc);

      const font = await manager.resolve('Courier', 'normal', 'normal');
      expect(font).toBeDefined();
    });

    it('should resolve bold variant', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      const font = await manager.resolve('Helvetica', 'bold', 'normal');
      expect(font).toBeDefined();
    });

    it('should resolve italic variant', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      const font = await manager.resolve('Helvetica', 'normal', 'italic');
      expect(font).toBeDefined();
    });

    it('should resolve bold italic variant', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      const font = await manager.resolve('Helvetica', 'bold', 'italic');
      expect(font).toBeDefined();
    });
  });

  describe('resolve from registry', () => {
    it('should resolve custom font from registry', async () => {
      const pdfDoc = createMockPDFDocument();
      const customFontBytes = new Uint8Array([0x00, 0x01, 0x02]);
      const registry: FontRegistry = {
        'CustomFont': { regular: customFontBytes },
      };

      const manager = new FontManager(registry, 'Helvetica', pdfDoc);
      const font = await manager.resolve('CustomFont', 'normal', 'normal');

      expect(font).toBeDefined();
      expect(pdfDoc.embedFont).toHaveBeenCalledWith(customFontBytes);
    });

    it('should resolve bold variant from registry', async () => {
      const pdfDoc = createMockPDFDocument();
      const boldBytes = new Uint8Array([0x00, 0x01, 0x02]);
      const registry: FontRegistry = {
        'CustomFont': { bold: boldBytes },
      };

      const manager = new FontManager(registry, 'Helvetica', pdfDoc);
      const font = await manager.resolve('CustomFont', 'bold', 'normal');

      expect(font).toBeDefined();
      expect(pdfDoc.embedFont).toHaveBeenCalledWith(boldBytes);
    });
  });

  describe('fallback behavior', () => {
    it('should fall back to default font when font not found', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      // Unknown font should fall back to Helvetica
      const font = await manager.resolve('UnknownFont', 'normal', 'normal');
      expect(font).toBeDefined();
    });

    it('should fall back to regular variant when bold not available', async () => {
      const pdfDoc = createMockPDFDocument();
      const regularBytes = new Uint8Array([0x00, 0x01, 0x02]);
      const registry: FontRegistry = {
        'CustomFont': { regular: regularBytes },
      };

      const manager = new FontManager(registry, 'Helvetica', pdfDoc);
      const font = await manager.resolve('CustomFont', 'bold', 'normal');

      // Should fall back to regular
      expect(font).toBeDefined();
    });
  });

  describe('caching', () => {
    it('should cache resolved fonts', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      // Resolve same font twice
      const font1 = await manager.resolve('Helvetica', 'normal', 'normal');
      const font2 = await manager.resolve('Helvetica', 'normal', 'normal');

      // Should return same cached instance
      expect(font1).toBe(font2);
      // Should only embed once
      expect(pdfDoc.embedFont).toHaveBeenCalledTimes(1);
    });

    it('should cache different variants separately', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      // Resolve different variants
      const regular = await manager.resolve('Helvetica', 'normal', 'normal');
      const bold = await manager.resolve('Helvetica', 'bold', 'normal');

      // Should be different objects
      expect(regular).not.toBe(bold);
      // Should embed twice (once per variant)
      expect(pdfDoc.embedFont).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEmbeddedFont', () => {
    it('should return cached font by key', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      await manager.resolve('Helvetica', 'normal', 'normal');
      const cached = manager.getEmbeddedFont('Helvetica');

      expect(cached).toBeDefined();
    });

    it('should return undefined for uncached font', () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      const cached = manager.getEmbeddedFont('Unknown');
      expect(cached).toBeUndefined();
    });
  });

  describe('CSS font name resolution', () => {
    it('should resolve Arial to Helvetica', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      const font = await manager.resolve('Arial', 'normal', 'normal');
      expect(font).toBeDefined();
    });

    it('should resolve Times New Roman to Times', async () => {
      const pdfDoc = createMockPDFDocument();
      const manager = new FontManager({}, 'Helvetica', pdfDoc);

      const font = await manager.resolve('Times New Roman', 'normal', 'normal');
      expect(font).toBeDefined();
    });
  });
});
