import { describe, it, expect, vi } from 'vitest';
import { traceClipPath } from '../../../src/renderers/clip-path';
import type { FabricObject } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

function createMockPage() {
  return {
    pushOperators: vi.fn(),
  } as unknown as PDFPage;
}

function makeRect(overrides: Partial<FabricObject> = {}): FabricObject {
  return {
    type: 'rect',
    left: 10, top: 20, width: 100, height: 50,
    scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
    flipX: false, flipY: false,
    originX: 'left', originY: 'top',
    fill: '#ff0000', stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeLineJoin: 'miter', strokeMiterLimit: 4,
    strokeUniform: false, opacity: 1, visible: true,
    shadow: null, globalCompositeOperation: 'source-over',
    rx: 0, ry: 0,
    ...overrides,
  } as FabricObject;
}

describe('traceClipPath', () => {
  it('pushes path operators for a rect clip path', () => {
    const page = createMockPage();
    traceClipPath(makeRect({ type: 'rect', left: 0, top: 0, width: 80, height: 40 }), page);
    expect(page.pushOperators).toHaveBeenCalled();
  });

  it('includes moveTo (m), lineTo (l), closePath (h), clip (W), and endPath (n) operators', () => {
    const page = createMockPage();
    traceClipPath(makeRect({ type: 'rect', left: 0, top: 0, width: 80, height: 40 }), page);

    const allOps = vi.mocked(page.pushOperators).mock.calls.flat();
    const opNames = allOps
      .filter((op) => typeof op === 'object' && op !== null && 'name' in (op as object))
      .map((op) => (op as { name: string }).name);

    expect(opNames).toContain('m');
    expect(opNames).toContain('l');
    expect(opNames).toContain('h');
    expect(opNames).toContain('W');
    expect(opNames).toContain('n');
  });

  it('uses the rect left/top as the start position', () => {
    const page = createMockPage();
    traceClipPath(makeRect({ type: 'rect', left: 15, top: 25, width: 80, height: 40 }), page);

    const allOps = vi.mocked(page.pushOperators).mock.calls.flat();
    type Op = { name: string; args: { numberValue: number }[] };
    const mOp = allOps.find((op): op is Op => (op as Op).name === 'm');
    expect(mOp?.args[0]?.numberValue).toBeCloseTo(15, 3);
    expect(mOp?.args[1]?.numberValue).toBeCloseTo(25, 3);
  });

  it('pushes operators for a circle clip path using bezier curves', () => {
    const circleClip = {
      ...makeRect(),
      type: 'circle',
      radius: 30,
    } as unknown as FabricObject;

    const page = createMockPage();
    traceClipPath(circleClip, page);

    const allOps = vi.mocked(page.pushOperators).mock.calls.flat();
    const opNames = allOps
      .filter((op) => typeof op === 'object' && op !== null && 'name' in (op as object))
      .map((op) => (op as { name: string }).name);

    expect(opNames).toContain('c');  // bezier curve
    expect(opNames).toContain('W');
    expect(opNames).toContain('n');
  });

  it('pushes operators for a polygon clip path', () => {
    const polygonClip = {
      ...makeRect(),
      type: 'polygon',
      points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 50 }],
    } as unknown as FabricObject;

    const page = createMockPage();
    traceClipPath(polygonClip, page);

    const allOps = vi.mocked(page.pushOperators).mock.calls.flat();
    const opNames = allOps
      .filter((op) => typeof op === 'object' && op !== null && 'name' in (op as object))
      .map((op) => (op as { name: string }).name);

    expect(opNames).toContain('m');
    expect(opNames).toContain('l');
    expect(opNames).toContain('W');
  });
});
