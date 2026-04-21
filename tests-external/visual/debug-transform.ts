import { resolveOptions } from '../../src/index';
import type { FabricCanvasJSON, FabricRectObject } from '../../src/types';

// Mock the transformation function to see the values
function debugTransform(obj: FabricRectObject, pageHeight: number) {
  const objWidth = obj.width;
  const objHeight = obj.height;
  const originX = obj.originX || 'center';
  const originY = obj.originY || 'center';
  
  // Calculate origin offset
  let offsetX = 0;
  let offsetY = 0;
  switch (originX) {
    case 'left': offsetX = 0; break;
    case 'center': offsetX = -objWidth / 2; break;
    case 'right': offsetX = -objWidth; break;
  }
  switch (originY) {
    case 'top': offsetY = 0; break;
    case 'center': offsetY = -objHeight / 2; break;
    case 'bottom': offsetY = -objHeight; break;
  }
  
  const pdfOriginY = pageHeight - obj.top;
  let translateY = pdfOriginY;
  if (originY === 'top') {
    translateY -= objHeight;
  }
  
  console.log('Object:', { left: obj.left, top: obj.top, width: obj.width, height: obj.height });
  console.log('Origin:', { originX, originY });
  console.log('Calculated:', { pdfOriginY, offsetX, offsetY, translateY });
  console.log('Expected bounds y:', translateY + offsetY);
  console.log();
}

const testCases = [
  { left: 200, top: 200, width: 100, height: 100, originX: 'center', originY: 'center' },
  { left: 200, top: 200, width: 100, height: 100, originX: 'left', originY: 'top' },
  { left: 100, top: 100, width: 80, height: 80, originX: 'left', originY: 'top' },
];

for (const tc of testCases) {
  debugTransform(tc as FabricRectObject, 400);
}
