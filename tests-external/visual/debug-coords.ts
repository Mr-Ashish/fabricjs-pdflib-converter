import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

async function debug() {
  console.log('=== Test 1: Center origin at (200, 200) ===');
  const canvasJSON1: FabricCanvasJSON = {
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

  const options1 = resolveOptions({}, canvasJSON1);
  const result1 = await convertCanvasToPdf(canvasJSON1, options1);
  const pngBuffer1 = await pdfToPng(result1.pdfBytes, { width: 400, height: 400 });
  const bounds1 = findContentBounds(pngBuffer1);
  console.log('Bounds:', bounds1);
  console.log('Expected: centered at (200, 200), size ~100x100');
  savePng(pngBuffer1, 'debug-center.png');

  console.log('\n=== Test 2: Left/top origin at (100, 100) ===');
  const canvasJSON2: FabricCanvasJSON = {
    version: '5.3.0',
    width: 400,
    height: 400,
    objects: [{
      type: 'rect',
      left: 100,
      top: 100,
      width: 80,
      height: 80,
      fill: '#00FF00',
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

  const options2 = resolveOptions({}, canvasJSON2);
  const result2 = await convertCanvasToPdf(canvasJSON2, options2);
  const pngBuffer2 = await pdfToPng(result2.pdfBytes, { width: 400, height: 400 });
  const bounds2 = findContentBounds(pngBuffer2);
  console.log('Bounds:', bounds2);
  console.log('Expected: at (100, 100), size 80x80');
  savePng(pngBuffer2, 'debug-lefttop.png');
}

debug();
