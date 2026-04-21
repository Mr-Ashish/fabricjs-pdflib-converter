import { describe, it, expect, vi } from 'vitest';
import { BaseRenderer } from '../../../src/renderers/base-renderer';
import type { FabricObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

/**
 * Tests for transformation isolation between objects.
 * These catch the "only one object visible" bug.
 */
describe('Transformation Isolation', () => {
  function createMockPDFPage() {
    return {
      drawRectangle: vi.fn(),
      drawCircle: vi.fn(),
      drawSvgPath: vi.fn(),
      drawEllipse: vi.fn(),
      drawText: vi.fn(),
      pushGraphicsState: vi.fn(),
      popGraphicsState: vi.fn(),
      concatTransformationMatrix: vi.fn(),
      setFillingColor: vi.fn(),
      setStrokingColor: vi.fn(),
      setLineWidth: vi.fn(),
      pushOperators: vi.fn(),
    } as unknown as PDFPage;
  }

  function createMockContext(page: PDFPage): RenderContext {
    return {
      pdfDoc: {} as any,
      page,
      fontManager: {} as any,
      imageLoader: {} as any,
      options: {
        scale: 1,
        pageWidth: 800,
        pageHeight: 600,
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
    };
  }

  // Create a concrete renderer for testing
  class TestRenderer extends BaseRenderer {
    type = 'test';

    canRender(obj: FabricObject): boolean {
      return obj.type === 'test';
    }

    renderObject(obj: FabricObject, page: PDFPage, context: RenderContext): void {
      // Simple render that does nothing
    }
  }

  it('should call pushGraphicsState before rendering', () => {
    const page = createMockPDFPage();
    const context = createMockContext(page);
    const renderer = new TestRenderer();
    const obj: FabricObject = {
      type: 'test',
      left: 50,
      top: 50,
      width: 100,
      height: 100,
      fill: '#FF0000',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      stroke: null,
      strokeWidth: 0,
      opacity: 1,
      visible: true,
    };

    renderer.render(obj, page, context);

    // pushGraphicsState is called through pushOperators
    expect(page.pushOperators).toHaveBeenCalledTimes(2); // 1 for push, 1 for pop
  });

  it('should call popGraphicsState after rendering', () => {
    const page = createMockPDFPage();
    const context = createMockContext(page);
    const renderer = new TestRenderer();
    const obj: FabricObject = {
      type: 'test',
      left: 50,
      top: 50,
      width: 100,
      height: 100,
      fill: '#FF0000',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      stroke: null,
      strokeWidth: 0,
      opacity: 1,
      visible: true,
    };

    renderer.render(obj, page, context);

    // popGraphicsState is called through pushOperators
    expect(page.pushOperators).toHaveBeenCalledTimes(2); // 1 for push, 1 for pop
  });

  it('should balance push and pop calls', () => {
    const page = createMockPDFPage();
    const context = createMockContext(page);
    const renderer = new TestRenderer();
    const obj: FabricObject = {
      type: 'test',
      left: 50,
      top: 50,
      width: 100,
      height: 100,
      fill: '#FF0000',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      stroke: null,
      strokeWidth: 0,
      opacity: 1,
      visible: true,
    };

    renderer.render(obj, page, context);

    // Both push and pop go through pushOperators (2 calls total)
    expect(page.pushOperators).toHaveBeenCalledTimes(2);
  });

  it('should call popGraphicsState even if renderObject throws', () => {
    const page = createMockPDFPage();
    const context = createMockContext(page);
    
    class ThrowingRenderer extends BaseRenderer {
      type = 'throwing';
      
      canRender(obj: FabricObject): boolean {
        return obj.type === 'throwing';
      }
      
      renderObject(): void {
        throw new Error('Render error');
      }
    }
    
    const renderer = new ThrowingRenderer();
    const obj: FabricObject = {
      type: 'throwing',
      left: 50,
      top: 50,
      width: 100,
      height: 100,
      fill: '#FF0000',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      stroke: null,
      strokeWidth: 0,
      opacity: 1,
      visible: true,
    };

    // Should throw but pop should still be called (via pushOperators)
    expect(() => renderer.render(obj, page, context)).toThrow('Render error');
    // pushOperators called twice (push and pop)
    expect(page.pushOperators).toHaveBeenCalledTimes(2);
  });

  it('should isolate transformations between multiple render calls', () => {
    const page = createMockPDFPage();
    const context = createMockContext(page);
    const renderer = new TestRenderer();
    const obj: FabricObject = {
      type: 'test',
      left: 50,
      top: 50,
      width: 100,
      height: 100,
      fill: '#FF0000',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'center',
      originY: 'center',
      stroke: null,
      strokeWidth: 0,
      opacity: 1,
      visible: true,
    };

    // Render 3 objects
    renderer.render(obj, page, context);
    renderer.render(obj, page, context);
    renderer.render(obj, page, context);

    // Should have 3 push and 3 pop calls (6 total pushOperators calls)
    expect(page.pushOperators).toHaveBeenCalledTimes(6);
  });
});
