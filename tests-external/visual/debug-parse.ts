import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

async function debug() {
  const canvasJSON: FabricCanvasJSON = {
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

  const options = resolveOptions({}, canvasJSON);
  const result = await convertCanvasToPdf(canvasJSON, options);

  console.log('PDF bytes length:', result.pdfBytes.length);

  try {
    const pngBuffer = await pdfToPng(result.pdfBytes, { width: 400, height: 400 });
    console.log('PNG buffer length:', pngBuffer.length);
    
    const bounds = findContentBounds(pngBuffer);
    console.log('Content bounds:', bounds);
    
    savePng(pngBuffer, 'debug-parsed.png');
    console.log('Saved debug image');
  } catch (err) {
    console.error('Error:', err);
  }
}

debug();
