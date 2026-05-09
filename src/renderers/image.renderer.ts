import type { PDFPage } from 'pdf-lib';
import { pushGraphicsState, popGraphicsState } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import { drawImageInCanvas } from './draw-helpers';
import { traceClipPath } from './clip-path';
import type { FabricImageObject, FabricRectObject, RenderContext } from '../types';

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

      const hasCrop = (obj.cropX ?? 0) > 0 || (obj.cropY ?? 0) > 0;

      if (hasCrop) {
        page.pushOperators(pushGraphicsState());
        // Clip to the display rectangle in local space
        traceClipPath(
          {
            type: 'rect',
            left: 0,
            top: 0,
            width,
            height,
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
            shadow: null,
            globalCompositeOperation: 'source-over',
            rx: 0,
            ry: 0,
          } as FabricRectObject,
          page,
        );
        // Draw image offset by -cropX, -cropY so the crop region maps to (0,0)
        drawImageInCanvas(page, image, {
          x: -(obj.cropX ?? 0),
          y: -(obj.cropY ?? 0),
          width: image.width,
          height: image.height,
        });
        page.pushOperators(popGraphicsState());
      } else {
        // Draw the image
        // Position is handled by the transformation matrix
        drawImageInCanvas(page, image, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }
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
