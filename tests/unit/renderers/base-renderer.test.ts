import { describe, it, expect, vi } from 'vitest';
import { BaseRenderer } from '../../../src/renderers/base-renderer';
import type { FabricObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';
import { PDFName } from 'pdf-lib';

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
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    opacity: 1,
    visible: true,
    ...overrides,
  } as FabricObject;
}

// Factory for creating a mock PDFPage with node.newExtGState support
function createMockPage(): PDFPage {
  return {
    pushOperators: vi.fn(),
    node: {
      newExtGState: vi.fn().mockReturnValue(PDFName.of('GS_0000')),
    },
  } as unknown as PDFPage;
}

// Factory for creating mock context
function createMockContext(page?: PDFPage, overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    pdfDoc: {
      context: {
        obj: vi.fn().mockReturnValue({}),
      },
    } as unknown as RenderContext['pdfDoc'],
    page: page ?? {
      pushOperators: vi.fn(),
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
    it('should skip invisible objects', async () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ visible: false });
      const page = createMockContext().page;
      const context = createMockContext();

      await renderer.render(obj, page, context);

      expect(renderer.renderObjectCalls).toHaveLength(0);
    });

    it('should call renderObject for visible objects', async () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ visible: true });
      const context = createMockContext();

      await renderer.render(obj, context.page, context);

      expect(renderer.renderObjectCalls).toHaveLength(1);
      expect(renderer.renderObjectCalls[0]!.obj).toBe(obj);
      expect(renderer.renderObjectCalls[0]!.page).toBe(context.page);
      expect(renderer.renderObjectCalls[0]!.context).toBe(context);
    });

    it('should call renderObject with correct arguments', async () => {
      const renderer = new MockRenderer();
      const obj = createMockObject({ type: 'mock', left: 50, top: 100 });
      const context = createMockContext();

      await renderer.render(obj, context.page, context);

      expect(renderer.renderObjectCalls[0]!.obj).toEqual(obj);
    });

    it('should propagate errors from renderObject', async () => {
      const renderer = new MockRenderer();
      renderer.renderObject = () => {
        throw new Error('Render error');
      };
      const obj = createMockObject({ visible: true });
      const context = createMockContext();

      await expect(renderer.render(obj, context.page, context)).rejects.toThrow('Render error');
    });
  });

  describe('applyStrokeProperties', () => {
    it('should apply dash array when provided', () => {
      const renderer = new MockRenderer();
      const page = {
        pushOperators: vi.fn(),
      } as unknown as PDFPage;

      renderer.applyStrokeProperties(page, [5, 5], 'butt', 'miter', 1);

      expect(page.pushOperators).toHaveBeenCalled();
    });

    it('should not apply dash array when null', () => {
      const renderer = new MockRenderer();
      const page = {
        pushOperators: vi.fn(),
      } as unknown as PDFPage;

      renderer.applyStrokeProperties(page, null, 'butt', 'miter', 1);

      // Line cap and line join should still be applied even without dash
      expect(page.pushOperators).toHaveBeenCalled();
      const operators = vi.mocked(page.pushOperators).mock.calls[0]!;
      // Should have 2 operators: setLineCap and setLineJoin (no setDashPattern)
      expect(operators).toHaveLength(2);
    });

    it('should map line cap values correctly', () => {
      const renderer = new MockRenderer();
      const page = {
        pushOperators: vi.fn(),
      } as unknown as PDFPage;

      // Test that it doesn't throw for valid values
      expect(() => renderer.applyStrokeProperties(page, null, 'butt', 'miter', 1)).not.toThrow();
      expect(() => renderer.applyStrokeProperties(page, null, 'round', 'miter', 1)).not.toThrow();
      expect(() => renderer.applyStrokeProperties(page, null, 'square', 'miter', 1)).not.toThrow();
    });

    it('should map line join values correctly', () => {
      const renderer = new MockRenderer();
      const page = {
        pushOperators: vi.fn(),
      } as unknown as PDFPage;

      // Test that it doesn't throw for valid values
      expect(() => renderer.applyStrokeProperties(page, null, 'butt', 'miter', 1)).not.toThrow();
      expect(() => renderer.applyStrokeProperties(page, null, 'butt', 'round', 1)).not.toThrow();
      expect(() => renderer.applyStrokeProperties(page, null, 'butt', 'bevel', 1)).not.toThrow();
    });

    it('should apply all stroke properties together', () => {
      const renderer = new MockRenderer();
      const page = {
        pushOperators: vi.fn(),
      } as unknown as PDFPage;

      renderer.applyStrokeProperties(page, [10, 5], 'round', 'bevel', 1);

      expect(page.pushOperators).toHaveBeenCalled();
    });
  });

  describe('opacity and blend mode', () => {
    it('calls applyGraphicsState (emits gs op) when opacity < 1', async () => {
      class TestRenderer extends BaseRenderer {
        readonly type = 'rect';
        renderObject = vi.fn();
      }
      const renderer = new TestRenderer();
      const obj = createMockObject({ opacity: 0.5 });
      const page = createMockPage();
      const context = createMockContext(page);

      await renderer.render(obj as unknown as FabricObject, page, context);

      const allOpCalls = vi.mocked(page.pushOperators).mock.calls.flat();
      const hasGsOp = allOpCalls.some(
        (op) => typeof op === 'object' && op !== null && (op as unknown as { name?: string }).name === 'gs',
      );
      expect(hasGsOp).toBe(true);
    });

    it('does not emit gs operator when opacity is 1 and blendMode is source-over', async () => {
      class TestRenderer extends BaseRenderer {
        readonly type = 'rect';
        renderObject = vi.fn();
      }
      const renderer = new TestRenderer();
      const obj = createMockObject({ opacity: 1, globalCompositeOperation: 'source-over' });
      const page = createMockPage();
      const context = createMockContext(page);

      await renderer.render(obj as unknown as FabricObject, page, context);

      const allOpCalls = vi.mocked(page.pushOperators).mock.calls.flat();
      const hasGsOp = allOpCalls.some(
        (op) => typeof op === 'object' && op !== null && (op as unknown as { name?: string }).name === 'gs',
      );
      expect(hasGsOp).toBe(false);
    });
  });
});
