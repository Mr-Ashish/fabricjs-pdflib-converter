import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { writeFileSync } from 'fs';

async function main() {
  const canvasJSON = {
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
    }],
  };

  const result = await convertCanvasToPdf(canvasJSON, resolveOptions({}, canvasJSON));
  writeFileSync('tests-external/visual/debug-top-origin.pdf', result.pdfBytes);
  console.log('PDF saved to debug-top-origin.pdf');
}

main();
