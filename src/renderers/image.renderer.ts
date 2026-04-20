import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricImageObject, RenderContext } from '../types';

/**
 * Renderer for Fabric.js image objects.
 * Loads images via the imageLoader and renders them to the PDF page.
 */
export class ImageRenderer extends BaseRenderer {
  readonly type = 'image';

  async renderObject(
    obj: FabricImageObject,
    page: PDFPage,
    context: RenderContext,
  ): Promise<void> {
    // Skip if dimensions are zero
    if (obj.width === 0 || obj.height === 0) {
      return;
    }

    try {
      // Load the image via the image loader
      const pdfImage = await context.imageLoader.load(obj.src);

      // Calculate dimensions with scale
      const width = obj.width * obj.scaleX;
      const height = obj.height * obj.scaleY;

      // Build draw options
      const drawOptions: Parameters<typeof page.drawImage>[1] = {
        width,
        height,
      };

      // Apply opacity if less than 1
      if (obj.opacity < 1) {
        drawOptions.opacity = obj.opacity;
      }

      // Handle cropping if cropX or cropY are set
      if (obj.cropX !== 0 || obj.cropY !== 0) {
        // For now, we draw the full image
        // TODO: Implement clipping via pushOperators when needed
        drawOptions.xScale = width / pdfImage.width;
        drawOptions.yScale = height / pdfImage.height;
      }

      page.drawImage(pdfImage, drawOptions);
    } catch (error) {
      // Add warning and skip this image
      context.warnings.add({
        type: 'image_failed',
        objectType: 'image',
        objectIndex: -1, // Will be set by the caller
        feature: 'image_load',
        message: `Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
