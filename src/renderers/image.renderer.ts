import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricImageObject, RenderContext } from '../types';

/**
 * Renderer for Fabric.js image objects.
 * Embeds and draws images onto the PDF.
 * 
 * Note: Scaling is applied via the transformation matrix in applyTransformations,
 * so we use the original width/height without multiplying by scaleX/scaleY.
 */
export class ImageRenderer extends BaseRenderer {
  readonly type = 'image';

  async renderObject(
    obj: FabricImageObject,
    page: PDFPage,
    context: RenderContext,
  ): Promise<void> {
    try {
      // Load the image via the image loader
      const image = await context.imageLoader.load(obj.src);

      // Calculate dimensions
      // Use specified width/height or fall back to image natural size
      const width = obj.width || image.width;
      const height = obj.height || image.height;

      // Draw the image
      // Position is handled by the transformation matrix
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
    } catch (error) {
      // Add warning and skip this image
      context.warnings.add({
        type: 'image_failed',
        objectType: obj.type,
        objectIndex: -1,
        feature: 'image_rendering',
        message: `Failed to render image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
