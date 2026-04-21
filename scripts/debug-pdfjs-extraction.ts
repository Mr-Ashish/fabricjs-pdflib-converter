import { convertCanvasToPdf, resolveOptions } from '../src/index';
import { extractOperators, extractElements } from '../tests/helpers/pdfjs-helpers';
import type { FabricCanvasJSON, FabricRectObject } from '../src/types';

async function debug() {
  const canvasJSON: FabricCanvasJSON = {
    version: '5.3.0',
    width: 800,
    height: 600,
    objects: [{
      type: 'rect',
      left: 100,
      top: 100,
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

  const operators = await extractOperators(result.pdfBytes);
  console.log('\nOperators:');
  operators.slice(0, 30).forEach((op, i) => {
    console.log(`  ${i}: ${op.name}`, JSON.stringify(op.args).slice(0, 80));
  });

  try {
    const elements = await extractElements(result.pdfBytes);
    console.log('\nExtracted elements:', elements.length);
    elements.forEach((el, i) => {
      console.log(`  ${i}: ${el.type}`, el.bounds);
    });
  } catch (err) {
    console.log('\nError during extraction:', err);
  }
}

debug().catch(console.error);
