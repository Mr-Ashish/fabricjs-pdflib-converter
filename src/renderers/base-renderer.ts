import type { PDFPage } from 'pdf-lib';
import type { FabricObject, RenderContext, ObjectRenderer } from '../types';

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
   * Handles visibility and delegates to renderObject.
   *
   * Note: pdf-lib handles graphics state internally through drawing methods.
   * Transformations are applied by individual renderers via drawing method options.
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

    // Delegate to subclass for actual drawing
    this.renderObject(obj, page, context);
  }

  /**
   * Abstract method that subclasses implement for type-specific rendering.
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
