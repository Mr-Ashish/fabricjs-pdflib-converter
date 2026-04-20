import { describe, it, expect, vi } from 'vitest';
import { BaseRenderer } from '../../../src/renderers/base-renderer';
import type { FabricObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Mock concrete renderer for testing
class MockRenderer extends BaseRenderer {
  readonly type = 'mock';
  renderObjectCalls: Array<{ obj: FabricObject; page: PDFPage; context: RenderContext }> = [];

  renderObject(obj: FabricObject, page: PDFPage, context: RenderContext): void {
    this.renderObjectCalls.push({ obj, page, context });
  }
}

// Factory for creating mock objects
function createMockObject(overrides: Partial<FabricObject> = {}): FabricObject {
  return {
    type: 'mock',
    left: 0,
    top: 0,
    width: 100,
    height: 50,
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
    opacity: 1,
    visible: true,
    ...overrides,
  } as FabricObject;
}

// Factory for creating mock context
function createMockContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      pushGraphicsState: vi.fn(),
      popGraphicsState: vi.fn(),
      concatTransformationMatrix: vi.fn(),
    } as unknown as PDFPage,
    fontManager: {} as RenderContext['fontManager'],
    imageLoader: {} as RenderContext['imageLoader'],
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
    ...overrides,
  };
}

describe('BaseRenderer', () => {
  describe('canRender', () => {
    it('should return true for matching type', () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ type: 'mock' });
      expect(renderer.canRender(obj)).toBe(true);
    });

    it('should return false for non-matching type', () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ type: 'other' });
      expect(renderer.canRender(obj)).toBe(false);
    });
  });

  describe('render', () => {
    it('should skip invisible objects', () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ visible: false });
      const page = createMockContext().page;
      const context = createMockContext();

      renderer.render(obj, page, context);

      expect(renderer.renderObjectCalls).toHaveLength(0);
    });

    it('should call pushGraphicsState and popGraphicsState for visible objects', () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ visible: true });
      const context = createMockContext();

      renderer.render(obj, context.page, context);

      expect(context.page.pushGraphicsState).toHaveBeenCalledTimes(1);
      expect(context.page.popGraphicsState).toHaveBeenCalledTimes(1);
    });

    it('should apply transform matrix via concatTransformationMatrix', () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({
        left: 10,
        top: 20,
        scaleX: 2,
        scaleY: 3,
      });
      const context = createMockContext();

      renderer.render(obj, context.page, context);

      expect(context.page.concatTransformationMatrix).toHaveBeenCalled();
    });

    it('should call renderObject for visible objects', () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ visible: true });
      const context = createMockContext();

      renderer.render(obj, context.page, context);

      expect(renderer.renderObjectCalls).toHaveLength(1);
      expect(renderer.renderObjectCalls[0]!.obj).toBe(obj);
      expect(renderer.renderObjectCalls[0]!.page).toBe(context.page);
      expect(renderer.renderObjectCalls[0]!.context).toBe(context);
    });

    it('should call renderObject with correct arguments', () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ type: 'mock', left: 50, top: 100 });
      const context = createMockContext();

      renderer.render(obj, context.page, context);

      expect(renderer.renderObjectCalls[0]!.obj).toEqual(obj);
    });

    it('should call popGraphicsState even if renderObject throws', () => {
      const renderer = new MockRenderer();
      renderer.renderObject = () => {
        throw new Error('Render error');
      };
      const obj = createMockObject({ visible: true });
      const context = createMockContext();

      expect(() => renderer.render(obj, context.page, context)).toThrow('Render error');
      expect(context.page.popGraphicsState).toHaveBeenCalledTimes(1);
    });
  });
});
