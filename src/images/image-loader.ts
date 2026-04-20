import type { PDFDocument, PDFImage } from 'pdf-lib';
import { ImageLoadError } from '../errors';
import { detectImageFormat, detectFormatFromDataUrl } from './format-detector';
import type { ImageResolver } from '../types';

/**
 * Loads and caches images for embedding into PDF documents.
 * Handles both data URLs and external URLs via imageResolver.
 */
export class ImageLoader {
  private cache = new Map<string, PDFImage>();

  /**
   * Creates an ImageLoader instance.
   *
   * @param imageResolver - Optional function to resolve external image URLs to bytes
   * @param pdfDoc - The PDF document to embed images into
   */
  constructor(
    private imageResolver: ImageResolver | undefined,
    private pdfDoc: PDFDocument,
  ) {}

  /**
   * Load an image from a source URL or data URL.
   * Caches loaded images to avoid duplicate embedding.
   *
   * @param src - Image source (URL or data URL)
   * @returns The embedded PDFImage
   * @throws ImageLoadError if the image cannot be loaded or format is unsupported
   */
  async load(src: string): Promise<PDFImage> {
    // Check cache first
    const cached = this.cache.get(src);
    if (cached) {
      return cached;
    }

    // Resolve image bytes
    const bytes = await this.resolveBytes(src);

    // Detect format and embed
    const format = detectImageFormat(bytes);
    let image: PDFImage;

    switch (format) {
      case 'png':
        image = await this.pdfDoc.embedPng(bytes);
        break;
      case 'jpg':
        image = await this.pdfDoc.embedJpg(bytes);
        break;
      default:
        throw new ImageLoadError(
          `Unsupported image format. Only PNG and JPG are supported.`,
          -1,
          'image',
        );
    }

    // Cache and return
    this.cache.set(src, image);
    return image;
  }

  /**
   * Resolve image bytes from source.
   * Handles data URLs directly, uses imageResolver for external URLs.
   *
   * @param src - Image source
   * @returns Image bytes as Uint8Array
   * @throws ImageLoadError if resolution fails
   */
  private async resolveBytes(src: string): Promise<Uint8Array> {
    // Handle data URLs
    if (src.startsWith('data:')) {
      return this.parseDataUrl(src);
    }

    // Handle external URLs
    if (!this.imageResolver) {
      throw new ImageLoadError(
        'No imageResolver provided for external image URL',
        -1,
        'image',
      );
    }

    try {
      const result = await this.imageResolver(src);
      return result instanceof Uint8Array ? result : new Uint8Array(result);
    } catch (cause) {
      throw new ImageLoadError(
        `Failed to load image from ${src}: ${cause instanceof Error ? cause.message : 'Unknown error'}`,
        -1,
        'image',
      );
    }
  }

  /**
   * Parse a data URL and extract the byte data.
   *
   * @param dataUrl - Data URL string
   * @returns Decoded bytes
   * @throws ImageLoadError if the data URL is invalid or format is unsupported
   */
  private parseDataUrl(dataUrl: string): Uint8Array {
    // Validate format first
    const format = detectFormatFromDataUrl(dataUrl);
    if (format === 'unknown') {
      throw new ImageLoadError(
        'Unsupported image format in data URL. Only PNG and JPG are supported.',
        -1,
        'image',
      );
    }

    // Extract base64 data
    const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) {
      throw new ImageLoadError('Invalid data URL format', -1, 'image');
    }

    const base64Data = base64Match[1];
    if (!base64Data) {
      throw new ImageLoadError('Empty data URL', -1, 'image');
    }

    try {
      // Decode base64
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch {
      throw new ImageLoadError('Failed to decode base64 data', -1, 'image');
    }
  }
}
