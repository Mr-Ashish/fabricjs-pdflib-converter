import type { PDFPage } from 'pdf-lib';
import type { FabricObject, RenderContext, ObjectRenderer } from '../types';
import { fabricToMatrix, fabricToPdfMatrix } from '../transform/coordinate';

/**
 * Abstract base class for all object renderers.
 * Implements the template method pattern for consistent rendering behavior.
 *
 * Subclasses must:
 * 1. Define `readonly type` matching the Fabric object type
 * 2. Implement `renderObject()` for type-specific drawing
 */
export abstract class BaseRenderer implements ObjectRenderer {
  /**
   * The Fabric.js object type this renderer handles.
   * Must match the `type` property on Fabric objects.
   */
  abstract readonly type: string;

  /**
   * Check if this renderer can handle the given object.
   * @param obj - The Fabric object to check
   * @returns True if this renderer can render the object
   */
  canRender(obj: FabricObject): boolean {
    return obj.type === this.type;
  }

  /**
   * Template method that orchestrates the rendering process.
   * Handles visibility, graphics state, transforms, and delegates to renderObject.
   *
   * @param obj - The Fabric object to render
   * @param page - The PDF page to render to
   * @param context - Shared rendering context
   */
  render(obj: FabricObject, page: PDFPage, context: RenderContext): void {
    // Skip invisible objects
    if (obj.visible === false) {
      return;
    }

    // Save graphics state
    page.pushGraphicsState();

    try {
      // Apply object transformation matrix
      this.applyTransform(obj, page, context);

      // Apply opacity if needed
      if (obj.opacity < 1) {
        // Note: pdf-lib doesn't have direct setGraphicsState for opacity
        // This would require creating an extended graphics state
        // For now, we track it but don't apply it via operators
      }

      // Delegate to subclass for actual drawing
      this.renderObject(obj, page, context);
    } finally {
      // Always restore graphics state
      page.popGraphicsState();
    }
  }

  /**
   * Apply the object's transformation matrix to the PDF page.
   *
   * @param obj - The Fabric object
   * @param page - The PDF page
   * @param context - Rendering context with scale
   */
  protected applyTransform(
    obj: FabricObject,
    page: PDFPage,
    context: RenderContext,
  ): void {
    const fabricMatrix = fabricToMatrix(obj);
    const pdfMatrix = fabricToPdfMatrix(
      fabricMatrix,
      context.options.pageHeight,
      context.options.scale,
    );

    page.concatTransformationMatrix(
      pdfMatrix[0],
      pdfMatrix[1],
      pdfMatrix[2],
      pdfMatrix[3],
      pdfMatrix[4],
      pdfMatrix[5],
    );
  }

  /**
   * Abstract method that subclasses implement for type-specific rendering.
   * Called within the graphics state save/restore and transform context.
   *
   * @param obj - The Fabric object to render
   * @param page - The PDF page to render to
   * @param context - Shared rendering context
   */
  abstract renderObject(
    obj: FabricObject,
    page: PDFPage,
    context: RenderContext,
  ): void | Promise<void>;
}
