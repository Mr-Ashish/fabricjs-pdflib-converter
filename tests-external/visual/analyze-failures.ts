import { convertCanvasToPdf, resolveOptions } from '../../src/index';
import { pdfToPng, findContentBounds, savePng } from './visual-regression';
import type { FabricCanvasJSON, FabricRectObject, FabricCircleObject } from '../../src/types';

async function analyze() {
  console.log('=== ANALYSIS OF FAILING TESTS ===\n');

  // Test 1: Multiple objects positioning
  console.log('1. MULTIPLE OBJECTS POSITIONING');
  const multiCanvas: FabricCanvasJSON = {
    version: '5.3.0',
    width: 400,
    height: 400,
    objects: [
      {
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
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
      } as FabricRectObject,
      {
        type: 'rect',
        left: 300,
        top: 100,
        width: 50,
        height: 50,
        fill: '#00FF00',
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
      } as FabricRectObject,
    ],
  };
  const multiResult = await convertCanvasToPdf(multiCanvas, resolveOptions({}, multiCanvas));
  const multiPng = await pdfToPng(multiResult.pdfBytes, { width: 400, height: 400 });
  const multiBounds = findContentBounds(multiPng);
  console.log('  Content bounds:', multiBounds);
  console.log('  Expected: Two separate rects at x≈75 and x≈275');
  savePng(multiPng, 'analyze-multi.png');

  // Test 2: Left/top origin
  console.log('\n2. LEFT/TOP ORIGIN');
  const originCanvas: FabricCanvasJSON = {
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
  const originResult = await convertCanvasToPdf(originCanvas, resolveOptions({}, originCanvas));
  const originPng = await pdfToPng(originResult.pdfBytes, { width: 400, height: 400 });
  const originBounds = findContentBounds(originPng);
  console.log('  Content bounds:', originBounds);
  console.log('  Expected: x≈100, y≈220 (400-100-80), size 80x80');
  savePng(originPng, 'analyze-origin.png');

  // Test 3: Circle positioning
  console.log('\n3. CIRCLE POSITIONING');
  const circleCanvas: FabricCanvasJSON = {
    version: '5.3.0',
    width: 400,
    height: 400,
    objects: [{
      type: 'circle',
      left: 200,
      top: 200,
      radius: 50,
      fill: '#0000FF',
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
    } as FabricCircleObject],
  };
  const circleResult = await convertCanvasToPdf(circleCanvas, resolveOptions({}, circleCanvas));
  const circlePng = await pdfToPng(circleResult.pdfBytes, { width: 400, height: 400 });
  const circleBounds = findContentBounds(circlePng);
  console.log('  Content bounds:', circleBounds);
  console.log('  Expected: centered at (200, 200), size ~100x100');
  savePng(circlePng, 'analyze-circle.png');

  // Test 4: Scale 2x
  console.log('\n4. SCALE 2x');
  const scaleCanvas: FabricCanvasJSON = {
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
  const scaleResult = await convertCanvasToPdf(scaleCanvas, resolveOptions({}, scaleCanvas));
  const scalePng = await pdfToPng(scaleResult.pdfBytes, { width: 400, height: 400 });
  const scaleBounds = findContentBounds(scalePng);
  console.log('  Content bounds:', scaleBounds);
  console.log('  Expected: size 200x200');
  savePng(scalePng, 'analyze-scale2x.png');

  // Test 5: Rotation 45°
  console.log('\n5. ROTATION 45°');
  const rotateCanvas: FabricCanvasJSON = {
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
      angle: 45,
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
  const rotateResult = await convertCanvasToPdf(rotateCanvas, resolveOptions({}, rotateCanvas));
  const rotatePng = await pdfToPng(rotateResult.pdfBytes, { width: 400, height: 400 });
  const rotateBounds = findContentBounds(rotatePng);
  console.log('  Content bounds:', rotateBounds);
  console.log('  Expected: size ~141x141 (100*sqrt(2))');
  savePng(rotatePng, 'analyze-rotate45.png');

  console.log('\n=== END ANALYSIS ===');
}

analyze();
