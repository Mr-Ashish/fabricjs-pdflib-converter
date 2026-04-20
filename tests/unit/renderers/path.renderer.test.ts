import { describe, it, expect, vi } from 'vitest';
import { PathRenderer } from '../../../src/renderers/path.renderer';
import type { FabricPathObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Factory for creating mock path objects
function createMockPath(overrides: Partial<FabricPathObject> = {}): FabricPathObject {
  return {
    type: 'path',
    left: 10,
    top: 20,
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
    fill: '#FF0000',
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    path: [['M', 0, 0], ['L', 100, 100]],
    ...overrides,
  } as FabricPathObject;
}

// Factory for creating mock context
function createMockContext(): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {
      drawSvgPath: vi.fn(),
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
  };
}

describe('PathRenderer', () => {
  describe('type and canRender', () => {
    it('should have type "path"', () => {
      const renderer = new PathRenderer();
      expect(renderer.type).toBe('path');
    });

    it('should render path objects', () => {
      const renderer = new PathRenderer();
      const path = createMockPath();
      expect(renderer.canRender(path)).toBe(true);
    });

    it('should not render non-path objects', () => {
      const renderer = new PathRenderer();
      const rect = { ...createMockPath(), type: 'rect' };
      expect(renderer.canRender(rect)).toBe(false);
    });
  });

  describe('basic path rendering', () => {
    it('should call drawSvgPath for path', () => {
      const renderer = new PathRenderer();
      const path = createMockPath();
      const context = createMockContext();

      renderer.render(path, context.page, context);

      expect(context.page.drawSvgPath).toHaveBeenCalled();
    });

    it('should convert path commands to SVG string', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        path: [['M', 0, 0], ['L', 100, 100]],
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(typeof svgPath).toBe('string');
      expect(svgPath).toContain('M');
      expect(svgPath).toContain('L');
    });

    it('should handle simple line path', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        path: [['M', 10, 20], ['L', 100, 200]],
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toMatch(/M\s+10\s+20/);
      expect(svgPath).toMatch(/L\s+100\s+200/);
    });

    it('should apply fill color', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({ fill: '#FF0000' });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeDefined();
    });

    it('should apply stroke color and width', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        stroke: '#0000FF',
        strokeWidth: 2,
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.borderColor).toBeDefined();
      expect(options.borderWidth).toBe(2);
    });
  });

  describe('fill only', () => {
    it('should render fill without stroke', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        fill: '#00FF00',
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeDefined();
      expect(options.borderWidth).toBe(0);
    });
  });

  describe('stroke only', () => {
    it('should render stroke without fill', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        fill: null,
        stroke: '#0000FF',
        strokeWidth: 3,
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const options = vi.mocked(context.page.drawSvgPath).mock.calls[0]![1];
      expect(options.color).toBeUndefined();
      expect(options.borderColor).toBeDefined();
      expect(options.borderWidth).toBe(3);
    });
  });

  describe('no fill and no stroke', () => {
    it('should not render if both fill and stroke are null', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        fill: null,
        stroke: null,
        strokeWidth: 0,
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      expect(context.page.drawSvgPath).not.toHaveBeenCalled();
    });
  });

  describe('complex paths', () => {
    it('should handle cubic bezier curves', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        path: [['M', 0, 0], ['C', 10, 20, 30, 40, 50, 60]],
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toContain('C');
    });

    it('should handle quadratic bezier curves', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        path: [['M', 0, 0], ['Q', 25, 25, 50, 0]],
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toContain('Q');
    });

    it('should handle arc commands', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        path: [['M', 0, 0], ['A', 50, 50, 0, 0, 1, 50, 50]],
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toContain('A');
    });

    it('should handle close path command', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        path: [['M', 0, 0], ['L', 100, 0], ['L', 100, 100], ['Z']],
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toContain('Z');
    });

    it('should handle multi-command paths', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        path: [
          ['M', 10, 10],
          ['L', 100, 10],
          ['C', 150, 10, 150, 100, 100, 100],
          ['L', 10, 100],
          ['Z'],
        ],
      });
      const context = createMockContext();

      renderer.render(path, context.page, context);

      const svgPath = vi.mocked(context.page.drawSvgPath).mock.calls[0]![0];
      expect(svgPath).toContain('M');
      expect(svgPath).toContain('L');
      expect(svgPath).toContain('C');
      expect(svgPath).toContain('Z');
    });
  });

  describe('empty path handling', () => {
    it('should handle empty path array gracefully', () => {
      const renderer = new PathRenderer();
      const path = createMockPath({
        path: [],
      });
      const context = createMockContext();

      expect(() => renderer.render(path, context.page, context)).not.toThrow();
    });
  });
});
