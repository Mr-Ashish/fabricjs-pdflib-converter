import { describe, it, expect, vi } from 'vitest';
import type { PDFPage } from 'pdf-lib';
import type { FabricRectObject, RenderContext } from '../../../src/types';
import { applyTransformations } from '../../../src/transform';

vi.mock('pdf-lib', async () => {
  const actual = await vi.importActual<typeof import('pdf-lib')>('pdf-lib');
  return {
    ...actual,
    concatTransformationMatrix: vi.fn((a, b, c, d, e, f) => ({
      op: 'cm',
      args: [a, b, c, d, e, f],
    })),
  };
});

function createPage(): PDFPage {
  return {
    pushOperators: vi.fn(),
  } as unknown as PDFPage;
}

function createContext(scale = 1): RenderContext {
  return {
    pdfDoc: {} as RenderContext['pdfDoc'],
    page: {} as RenderContext['page'],
    fontManager: {} as RenderContext['fontManager'],
    imageLoader: {} as RenderContext['imageLoader'],
    options: {
      scale,
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

function createRect(overrides: Partial<FabricRectObject> = {}): FabricRectObject {
  return {
    type: 'rect',
    left: 100,
    top: 50,
    width: 20,
    height: 10,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'left',
    originY: 'top',
    fill: '#000',
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
    strokeMiterLimit: 4,
    strokeUniform: false,
    opacity: 1,
    visible: true,
    rx: 0,
    ry: 0,
    ...overrides,
  };
}

describe('applyTransformations', () => {
  // The outer CTM is:   [s, 0, 0, -s, left*s, pageHeight - top*s]
  //   (pixels-to-points scale on X, Y flip + scale, translate to canvas (left, top) in PDF).
  // The inner CTM is an identity unless the object has angle/scale/skew/flip/origin-offset.

  it('applies global scale and Y-flip in the outer CTM, then identity inner CTM for a plain object', () => {
    const page = createPage();
    const context = createContext(2); // scale = 2
    const obj = createRect({
      // left=100, top=50, width=20, height=10, originX=left, originY=top
    });

    applyTransformations(obj, page, context);

    const calls = vi.mocked(page.pushOperators).mock.calls;
    expect(calls).toHaveLength(2);

    const outerOp = calls[0]![0] as { args: number[] };
    const innerOp = calls[1]![0] as { args: number[] };

    //   a = scale = 2
    //   d = -scale = -2
    //   e = left * scale = 100 * 2 = 200
    //   f = pageHeight - top * scale = 600 - 50 * 2 = 500
    expect(outerOp.args).toEqual([2, 0, 0, -2, 200, 500]);

    // Inner: identity (no origin offset for left/top, no scale/skew/rotate)
    expect(innerOp.args).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('defaults missing origin to left/top and keeps inner CTM identity', () => {
    const page = createPage();
    const context = createContext(1);
    const obj = createRect({
      originX: undefined as unknown as FabricRectObject['originX'],
      originY: undefined as unknown as FabricRectObject['originY'],
    });

    applyTransformations(obj, page, context);

    const calls = vi.mocked(page.pushOperators).mock.calls;
    const outerOp = calls[0]![0] as { args: number[] };
    const innerOp = calls[1]![0] as { args: number[] };

    // scale = 1, left = 100, top = 50, pageHeight = 600.
    expect(outerOp.args).toEqual([1, 0, 0, -1, 100, 550]);
    // left/top origin + no other transforms ⇒ inner is identity.
    expect(innerOp.args).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('keeps the bbox anchor at canvas (left, top) regardless of object scaleX/scaleY', () => {
    // This is the regression case: previously, doubling scaleY moved the
    // drawn rectangle off its anchor. In the new contract, object-level
    // scaling happens INSIDE the inner CTM and the outer translation
    // always resolves to canvas (left, top) in PDF.
    const page = createPage();
    const context = createContext(1);
    const obj = createRect({ scaleX: 2, scaleY: 3 });

    applyTransformations(obj, page, context);

    const [outerCall, innerCall] = vi.mocked(page.pushOperators).mock.calls;
    const outerOp = outerCall![0] as { args: number[] };
    const innerOp = innerCall![0] as { args: number[] };

    // Outer unchanged: local (0,0) → canvas (left, top) = PDF (100, 550).
    expect(outerOp.args).toEqual([1, 0, 0, -1, 100, 550]);
    // Inner carries the object's own scaling.
    expect(innerOp.args).toEqual([2, 0, 0, 3, 0, 0]);
  });

  it('rotates clockwise visually for positive Fabric angle', () => {
    const page = createPage();
    const context = createContext(1);
    const obj = createRect({ angle: 90 });

    applyTransformations(obj, page, context);

    const [, innerCall] = vi.mocked(page.pushOperators).mock.calls;
    const innerOp = innerCall![0] as { args: number[] };

    // In canvas-Y-down local frame, [cos, sin, -sin, cos] with angle=90°
    // is [0, 1, -1, 0], which is a CLOCKWISE rotation on screen.
    // A local point (1, 0) (→ right) maps to (0, 1) (→ down), i.e.
    // "right becomes down" — clockwise, matching Fabric.
    const [a, b, c, d] = innerOp.args;
    expect(a).toBeCloseTo(0);
    expect(b).toBeCloseTo(1);
    expect(c).toBeCloseTo(-1);
    expect(d).toBeCloseTo(0);
  });

  it('shifts the inner CTM by the origin offset so the anchor sits at local (0,0)', () => {
    const page = createPage();
    const context = createContext(1);
    const obj = createRect({
      width: 40,
      height: 20,
      originX: 'center',
      originY: 'center',
    });

    applyTransformations(obj, page, context);

    const [, innerCall] = vi.mocked(page.pushOperators).mock.calls;
    const innerOp = innerCall![0] as { args: number[] };

    // Center origin: origin offset is (w/2, h/2) = (20, 10).
    // Inner CTM translates by (-20, -10) so the object's drawn bbox
    // (0..w, 0..h) is shifted to be centred on local (0,0).
    expect(innerOp.args).toEqual([1, 0, 0, 1, -20, -10]);
  });
});
