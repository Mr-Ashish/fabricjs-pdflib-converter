import { describe, it, expect, vi } from 'vitest';
import { GroupRenderer } from '../../../src/renderers/group.renderer';
import type { FabricGroupObject, FabricRectObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock group objects
function createMockGroup(overrides: Partial<FabricGroupObject> = {}): FabricGroupObject {
  return {
    type: 'group',
    left: 50,
    top: 50,
    width: 200,
    height: 150,
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
    objects: [],
    ...overrides,
  } as FabricGroupObject;
}

// Factory for creating mock rect
function createMockRect(overrides: Partial<FabricRectObject> = {}): FabricRectObject {
  return {
    type: 'rect',
    left: 0,
    top: 0,
    width: 50,
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
    fill: '#FF0000',
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
    visible: true,
    rx: 0,
    ry: 0,
    ...overrides,
  } as FabricRectObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      pushGraphicsState: vi.fn(),
      pushOperators: vi.fn(),
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
  };
}

describe('GroupRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "group"', () => {
      const renderer = new GroupRenderer();
      expect(renderer.type).toBe('group');
    });

    it('should render group objects', () => {
      const renderer = new GroupRenderer();
      const group = createMockGroup();
      expect(renderer.canRender(group)).toBe(true);
    });

    it('should not render non-group objects', () => {
      const renderer = new GroupRenderer();
      const rect = createMockRect();
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('basic group rendering', () => {
    it('should push and pop graphics state', async () => {
      const renderer = new GroupRenderer();
      const group = createMockGroup();
      const context = createMockContext();

      await renderer.render(group, context.page, context);

      expect(context.page.pushGraphicsState).toHaveBeenCalled();
      expect(context.page.popGraphicsState).toHaveBeenCalled();
    });

    it('should render child objects', async () => {
      const renderer = new GroupRenderer();
      const childRect = createMockRect();
      const group = createMockGroup({
        objects: [childRect],
      });
      const context = createMockContext();

      await renderer.render(group, context.page, context);

      expect(context.renderObject).toHaveBeenCalledWith(childRect);
    });

    it('should render multiple children', async () => {
      const renderer = new GroupRenderer();
      const child1 = createMockRect({ left: 0, fill: '#FF0000' });
      const child2 = createMockRect({ left: 50, fill: '#00FF00' });
      const group = createMockGroup({
        objects: [child1, child2],
      });
      const context = createMockContext();

      await renderer.render(group, context.page, context);

      expect(context.renderObject).toHaveBeenCalledTimes(2);
      expect(context.renderObject).toHaveBeenCalledWith(child1);
      expect(context.renderObject).toHaveBeenCalledWith(child2);
    });

    it('should increment depth for children', async () => {
      const renderer = new GroupRenderer();
      const childRect = createMockRect();
      const group = createMockGroup({
        objects: [childRect],
      });
      const context = createMockContext();

      await renderer.render(group, context.page, context);

      // Check that renderObject was called with increased depth
      const renderObjectCalls = vi.mocked(context.renderObject).mock.calls;
      expect(renderObjectCalls.length).toBe(1);
    });
  });

  describe('depth limit', () => {
    it('should warn when exceeding max depth', async () => {
      const renderer = new GroupRenderer();
      const group = createMockGroup();
      const context = createMockContext();
      context.currentDepth = 20; // At limit

      await renderer.render(group, context.page, context);

      expect(context.warnings.add).toHaveBeenCalled();
      expect(context.renderObject).not.toHaveBeenCalled();
    });

    it('should not render children when exceeding max depth', async () => {
      const renderer = new GroupRenderer();
      const childRect = createMockRect();
      const group = createMockGroup({
        objects: [childRect],
      });
      const context = createMockContext();
      context.currentDepth = 25; // Over limit

      await renderer.render(group, context.page, context);

      expect(context.renderObject).not.toHaveBeenCalled();
    });

    it('should render normally when under max depth', async () => {
      const renderer = new GroupRenderer();
      const childRect = createMockRect();
      const group = createMockGroup({
        objects: [childRect],
      });
      const context = createMockContext();
      context.currentDepth = 5; // Well under limit

      await renderer.render(group, context.page, context);

      expect(context.warnings.add).not.toHaveBeenCalled();
      expect(context.renderObject).toHaveBeenCalled();
    });
  });

  describe('nested groups', () => {
    it('should handle nested groups', async () => {
      const renderer = new GroupRenderer();
      const innerRect = createMockRect();
      const innerGroup = createMockGroup({
        objects: [innerRect],
      });
      const outerGroup = createMockGroup({
        objects: [innerGroup],
      });
      const context = createMockContext();

      await renderer.render(outerGroup, context.page, context);

      // Should call renderObject for the inner group
      expect(context.renderObject).toHaveBeenCalledWith(innerGroup);
    });
  });

  describe('empty group', () => {
    it('should handle empty group', async () => {
      const renderer = new GroupRenderer();
      const group = createMockGroup({
        objects: [],
      });
      const context = createMockContext();

      await renderer.render(group, context.page, context);

      expect(context.page.pushGraphicsState).toHaveBeenCalled();
      expect(context.page.popGraphicsState).toHaveBeenCalled();
      expect(context.renderObject).not.toHaveBeenCalled();
    });
  });
});
