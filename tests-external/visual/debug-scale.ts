import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

async function debug() {
  console.log('=== DEBUG SCALE ===\n');

  // Test with scale 1
  console.log('1. SCALE 1x');
  const canvas1: FabricCanvasJSON = {
    version: '5.3.0',
    width: 400,
    height: 400,
    objects: [{
      type: 'rect',
      left: 200,
      top: 200,
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
      rx: 0,
      ry: 0,
    } as FabricRectObject],
  };
  const result1 = await convertCanvasToPdf(canvas1, resolveOptions({}, canvas1));
  const png1 = await pdfToPng(result1.pdfBytes, { width: 400, height: 400 });
  const bounds1 = findContentBounds(png1);
  console.log('  Bounds:', bounds1);
  savePng(png1, 'debug-scale1x.png');

  // Test with scale 2
  console.log('\n2. SCALE 2x');
  const canvas2: FabricCanvasJSON = {
    version: '5.3.0',
    width: 400,
    height: 400,
    objects: [{
      type: 'rect',
      left: 200,
      top: 200,
      width: 100,
      height: 100,
      fill: '#FF0000',
      scaleX: 2,
      scaleY: 2,
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
      rx: 0,
      ry: 0,
    } as FabricRectObject],
  };
  const result2 = await convertCanvasToPdf(canvas2, resolveOptions({}, canvas2));
  const png2 = await pdfToPng(result2.pdfBytes, { width: 400, height: 400 });
  const bounds2 = findContentBounds(png2);
  console.log('  Bounds:', bounds2);
  console.log('  Expected: size 200x200');
  savePng(png2, 'debug-scale2x.png');

  // Test with no origin offset (left/top origin)
  console.log('\n3. LEFT/TOP ORIGIN');
  const canvas3: FabricCanvasJSON = {
    version: '5.3.0',
    width: 400,
    height: 400,
    objects: [{
      type: 'rect',
      left: 100,
      top: 100,
      width: 80,
      height: 80,
      fill: '#FF0000',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
      originX: 'left',
      originY: 'top',
      stroke: null,
      strokeWidth: 0,
      opacity: 1,
      visible: true,
      rx: 0,
      ry: 0,
    } as FabricRectObject],
  };
  const result3 = await convertCanvasToPdf(canvas3, resolveOptions({}, canvas3));
  const png3 = await pdfToPng(result3.pdfBytes, { width: 400, height: 400 });
  const bounds3 = findContentBounds(png3);
  console.log('  Bounds:', bounds3);
  console.log('  Expected: x=100, y=220 (400-100-80), size 80x80');
  savePng(png3, 'debug-lefttop2.png');
}

debug();
