import type { OriginX, OriginY, Point } from '../types';

/**
 * Resolves originX/originY to pixel offset from top-left corner.
 *
 * Fabric.js objects are positioned by their origin point. This function
 * calculates the offset needed to position the object correctly.
 *
 * @param originX - Horizontal origin ('left', 'center', 'right')
 * @param originY - Vertical origin ('top', 'center', 'bottom')
 * @param width - Object width in pixels
 * @param height - Object height in pixels
 * @returns Offset from top-left corner to the origin point
 */
export function resolveOriginOffset(
  originX: OriginX,
  originY: OriginY,
  width: number,
  height: number,
): Point {
  let offsetX = 0;
  let offsetY = 0;

  // Resolve originX
  switch (originX) {
    case 'left':
      offsetX = 0;
      break;
    case 'center':
      offsetX = -width / 2;
      break;
    case 'right':
      offsetX = -width;
      break;
  }

  // Resolve originY
  switch (originY) {
    case 'top':
      offsetY = 0;
      break;
    case 'center':
      offsetY = -height / 2;
      break;
    case 'bottom':
      offsetY = -height;
      break;
  }

  return { x: offsetX, y: offsetY };
}
