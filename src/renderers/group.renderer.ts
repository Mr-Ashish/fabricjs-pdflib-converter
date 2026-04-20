import type { PDFPage } from 'pdf-lib';
import { BaseRenderer } from './base-renderer';
import type { FabricGroupObject, RenderContext } from '../types';

/**
 * Renderer for Fabric.js group objects.
 * Recursively renders child objects with composed transformation matrices.
 */
export class GroupRenderer extends BaseRenderer {
  readonly type = 'group';

  async renderObject(
    obj: FabricGroupObject,
    page: PDFPage,
    context: RenderContext,
  ): Promise<void> {
    // Check depth limit to prevent stack overflow
    if (context.currentDepth >= context.options.maxGroupDepth) {
      context.warnings.add({
        type: 'unsupported_feature',
        objectType: 'group',
        objectIndex: -1,
        feature: 'nested_group_depth',
        message: `Maximum group nesting depth (${context.options.maxGroupDepth}) exceeded. Skipping group content.`,
      });
      return;
    }

    // Push graphics state for the group's transform
    page.pushGraphicsState();

    try {
      // Increment depth for children
      const childContext: RenderContext = {
        ...context,
        currentDepth: context.currentDepth + 1,
      };

      // Render each child object
      for (const child of obj.objects) {
        await childContext.renderObject(child);
      }
    } finally {
      // Always pop graphics state
      page.popGraphicsState();
    }
  }
}
