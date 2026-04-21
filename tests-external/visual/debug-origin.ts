import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

async function debug() {
  console.log('=== DEBUG ORIGIN TYPES ===\n');
  
  const origins = [
    { originX: 'center', originY: 'center', expected: 'centered at (200, 200)' },
    { originX: 'left', originY: 'top', expected: 'top-left at (200, 200)' },
    { originX: 'left', originY: 'top', left: 100, top: 100, expected: 'top-left at (100, 100), y≈220' },
  ];
  
  for (const config of origins) {
    // Use the dimensions from the test case (80x80 for the third test)
    const width = config.left === 100 ? 80 : 100;
    const height = config.top === 100 ? 80 : 100;
    
    const canvasJSON: FabricCanvasJSON = {
      version: '5.3.0',
      width: 400,
      height: 400,
      objects: [{
        type: 'rect',
        left: config.left ?? 200,
        top: config.top ?? 200,
        width,
        height,
        fill: '#FF0000',
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        originX: config.originX as 'center' | 'left' | 'right',
        originY: config.originY as 'center' | 'top' | 'bottom',
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
    const pngBuffer = await pdfToPng(result.pdfBytes, { width: 400, height: 400 });
    const bounds = findContentBounds(pngBuffer);
    
    console.log(`Origin: ${config.originX}/${config.originY}, left=${config.left ?? 200}, top=${config.top ?? 200}`);
    console.log(`  Bounds:`, bounds);
    console.log(`  Expected: ${config.expected}`);
    console.log();
    
    savePng(pngBuffer, `debug-origin-${config.originX}-${config.originY}-${config.left ?? 200}.png`);
  }
}

debug();
