import { describe, it, expect } from 'vitest';
import { convertCanvasToPdf } from '../../../src/core/converter';
import type { ResolvedConverterOptions, FabricCanvasJSON } from '../../../src/types';

function makeOptions(): ResolvedConverterOptions {
  return {
    pageWidth: 400,
    pageHeight: 300,
    scale: 1,
    fonts: {},
    defaultFont: 'Helvetica',
    onUnsupported: 'warn',
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    maxGroupDepth: 20,
  };
}

const baseRect = {
  type: 'rect' as const,
  left: 100, top: 100, width: 80, height: 60,
  scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
  flipX: false, flipY: false,
  originX: 'left' as const, originY: 'top' as const,
  fill: '#ff0000', stroke: null, strokeWidth: 0,
  strokeDashArray: null, strokeLineCap: 'butt' as const,
  strokeLineJoin: 'miter' as const, strokeMiterLimit: 4,
  strokeUniform: false, opacity: 1, visible: true,
  shadow: null,
  globalCompositeOperation: 'source-over',
  rx: 0, ry: 0,
};

describe('shadow rendering', () => {
  it('produces a PDF without error when shadow is set on a rect', async () => {
    const canvas: FabricCanvasJSON = {
      version: '5.3.0',
      objects: [{
        ...baseRect,
        shadow: { color: 'rgba(0,0,0,0.5)', blur: 0, offsetX: 5, offsetY: 5, affectStroke: false, nonScaling: false },
      }],
    };
    const result = await convertCanvasToPdf(canvas, makeOptions());
    expect(result.pdfBytes.length).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('produces larger PDF when shadow is present vs absent (shadow adds content)', async () => {
    const noShadow = await convertCanvasToPdf({ version: '5.3.0', objects: [baseRect] }, makeOptions());
    const withShadow = await convertCanvasToPdf({
      version: '5.3.0',
      objects: [{ ...baseRect, shadow: { color: 'rgba(0,0,0,0.5)', blur: 0, offsetX: 5, offsetY: 5, affectStroke: false, nonScaling: false } }],
    }, makeOptions());
    expect(withShadow.pdfBytes.length).toBeGreaterThan(noShadow.pdfBytes.length);
  });

  it('does not error when shadow is null', async () => {
    const canvas: FabricCanvasJSON = { version: '5.3.0', objects: [baseRect] };
    const result = await convertCanvasToPdf(canvas, makeOptions());
    expect(result.pdfBytes.length).toBeGreaterThan(0);
  });

  it('shadow with affectStroke=true still renders without error', async () => {
    const canvas: FabricCanvasJSON = {
      version: '5.3.0',
      objects: [{
        ...baseRect,
        stroke: '#000000',
        strokeWidth: 2,
        shadow: { color: 'rgba(0,0,100,0.6)', blur: 0, offsetX: -3, offsetY: 4, affectStroke: true, nonScaling: false },
      }],
    };
    const result = await convertCanvasToPdf(canvas, makeOptions());
    expect(result.pdfBytes.length).toBeGreaterThan(0);
  });
});
