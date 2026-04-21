/**
 * Verify the three user-reported issues are actually fixed:
 *   1. Triangle orientation (should point UP just like on the canvas).
 *   2. Rotated line direction (positive angle = clockwise visually).
 *   3. Scaled object stays anchored at its declared (left, top).
 *
 * This script:
 *   - builds a minimal canvas JSON for each case,
 *   - runs the converter to produce a PDF,
 *   - rasterizes it to PNG,
 *   - measures the bounding box of each shape by color, and
 *   - asserts the measured box matches the expected canvas geometry.
 */
import * as fs from 'fs';
import { convertCanvasToPdf, resolveOptions } from '../src/index';
import { pdfToPng } from '../tests-external/visual/visual-regression';

type Bounds = { x: number; y: number; width: number; height: number };

function findShapeByColor(
  png: { width: number; height: number; data: Uint8Array | Buffer },
  targetR: number,
  targetG: number,
  targetB: number,
  tolerance = 30,
): Bounds | null {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx]!;
      const g = png.data[idx + 1]!;
      const b = png.data[idx + 2]!;
      if (
        Math.abs(r - targetR) < tolerance &&
        Math.abs(g - targetG) < tolerance &&
        Math.abs(b - targetB) < tolerance
      ) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function renderToPng(canvasJSON: any, label: string) {
  const options = resolveOptions({}, canvasJSON);
  const result = await convertCanvasToPdf(canvasJSON, options);
  fs.writeFileSync(`verify-${label}.pdf`, result.pdfBytes);
  const pngBuffer = await pdfToPng(result.pdfBytes, {
    width: canvasJSON.width,
    height: canvasJSON.height,
  });
  fs.writeFileSync(`verify-${label}.png`, pngBuffer);
  const PNG = require('pngjs').PNG;
  return PNG.sync.read(pngBuffer) as { width: number; height: number; data: Buffer };
}

function expectApprox(actual: number, expected: number, tolerance: number, label: string) {
  const ok = Math.abs(actual - expected) <= tolerance;
  const marker = ok ? 'OK  ' : 'FAIL';
  console.log(`    ${marker}  ${label}: actual=${actual.toFixed(1)}  expected≈${expected.toFixed(1)}  Δ=${(actual - expected).toFixed(1)}`);
  return ok;
}

async function main() {
  let allOk = true;
  const tolerance = 2; // pixels

  // --------------------------------------------------------------
  // Case 1: Triangle at left=100, top=80, 120×100. Tip at top, base at bottom.
  // --------------------------------------------------------------
  console.log('Case 1: Triangle orientation and placement');
  {
    const json = {
      version: '5.3.0',
      width: 400,
      height: 300,
      background: '#ffffff',
      objects: [
        {
          type: 'triangle',
          left: 100,
          top: 80,
          width: 120,
          height: 100,
          fill: '#f39c12',
          originX: 'left',
          originY: 'top',
        },
      ],
    };
    const png = await renderToPng(json, 'triangle');
    const bounds = findShapeByColor(png, 243, 156, 18);
    if (!bounds) {
      console.log('    FAIL: triangle not found in PNG');
      allOk = false;
    } else {
      // Bbox should be at canvas (100, 80)–(220, 180).
      allOk = expectApprox(bounds.x, 100, tolerance, 'bbox.x (canvas left)') && allOk;
      allOk = expectApprox(bounds.y, 80, tolerance, 'bbox.y (canvas top)') && allOk;
      allOk = expectApprox(bounds.width, 120, tolerance, 'bbox.width') && allOk;
      allOk = expectApprox(bounds.height, 100, tolerance, 'bbox.height') && allOk;

      // Orientation check: at the TOP scanline of the shape there should be
      // only ~1px of filled pixels (the tip); at the BOTTOM scanline there
      // should be ~120px (the full base).
      function widthAtRow(y: number): number {
        let count = 0;
        for (let x = 0; x < png.width; x++) {
          const idx = (png.width * y + x) << 2;
          const r = png.data[idx]!;
          const g = png.data[idx + 1]!;
          const b = png.data[idx + 2]!;
          if (Math.abs(r - 243) < 30 && Math.abs(g - 156) < 30 && Math.abs(b - 18) < 30) {
            count++;
          }
        }
        return count;
      }
      const topRowWidth = widthAtRow(bounds.y + 1);
      const bottomRowWidth = widthAtRow(bounds.y + bounds.height - 1);
      console.log(`    topRowWidth=${topRowWidth}px  bottomRowWidth=${bottomRowWidth}px`);
      if (!(topRowWidth < bottomRowWidth)) {
        console.log('    FAIL: triangle is NOT pointing up (top row wider than bottom row)');
        allOk = false;
      } else {
        console.log('    OK    triangle points up (top row narrower than bottom row)');
      }
    }
  }
  console.log('');

  // --------------------------------------------------------------
  // Case 2: Line rotated 90° clockwise. A horizontal line rotated 90° CW
  // should end up VERTICAL with its right endpoint BELOW its left endpoint.
  // --------------------------------------------------------------
  console.log('Case 2: Rotated line direction');
  {
    // Horizontal line from canvas (100, 100) to (200, 100), length 100.
    // Fabric-normalized: x1=-50, y1=0, x2=50, y2=0, left=100, top=100, w=100, h=0.
    // Rotated 90° CW about the default left/top anchor → the line extends
    // DOWNWARD from canvas (100, 100) along x=100, y ∈ [100, 200] visually.
    // (That is Fabric.js's own rendering.)
    const json = {
      version: '5.3.0',
      width: 400,
      height: 400,
      background: '#ffffff',
      objects: [
        {
          type: 'line',
          left: 100,
          top: 100,
          width: 100,
          height: 0,
          x1: -50,
          y1: 0,
          x2: 50,
          y2: 0,
          angle: 90,
          stroke: '#9b59b6',
          strokeWidth: 3,
          originX: 'left',
          originY: 'top',
        },
      ],
    };
    const png = await renderToPng(json, 'rotated-line');
    const bounds = findShapeByColor(png, 155, 89, 182);
    if (!bounds) {
      console.log('    FAIL: line not found');
      allOk = false;
    } else {
      // Expected: vertical line anchored at canvas (100, 100) going down by 100px.
      // The rotation happens about local (0,0) which maps to canvas (100, 100).
      // Rotated horizontal line (originally going to the right) rotates 90° CW
      // → points downward. Bounds should be roughly at x=100, y ∈ [100, 200].
      allOk = expectApprox(bounds.x, 100, 3, 'bbox.x') && allOk;
      allOk = expectApprox(bounds.y, 100, 3, 'bbox.y') && allOk;
      // Very tall, very narrow → this means the line is vertical (correctly rotated).
      const ok = bounds.height > bounds.width * 5;
      console.log(
        `    ${ok ? 'OK  ' : 'FAIL'}  line is vertical (w=${bounds.width}, h=${bounds.height})`,
      );
      allOk = ok && allOk;
      allOk = expectApprox(bounds.height, 100, 3, 'line length (vertical span)') && allOk;
    }
  }
  console.log('');

  // --------------------------------------------------------------
  // Case 3: Scaled rectangle stays anchored at (left, top).
  // left=100, top=100, width=50, height=40, scaleX=2, scaleY=3
  // → rendered bbox should be at canvas (100, 100) with size 100×120.
  // --------------------------------------------------------------
  console.log('Case 3: Scaled rect anchors at (left, top)');
  {
    const json = {
      version: '5.3.0',
      width: 500,
      height: 500,
      background: '#ffffff',
      objects: [
        {
          type: 'rect',
          left: 100,
          top: 100,
          width: 50,
          height: 40,
          scaleX: 2,
          scaleY: 3,
          fill: '#3498db',
          originX: 'left',
          originY: 'top',
        },
      ],
    };
    const png = await renderToPng(json, 'scaled-rect');
    const bounds = findShapeByColor(png, 52, 152, 219);
    if (!bounds) {
      console.log('    FAIL: rect not found');
      allOk = false;
    } else {
      allOk = expectApprox(bounds.x, 100, tolerance, 'bbox.x (canvas left)') && allOk;
      allOk = expectApprox(bounds.y, 100, tolerance, 'bbox.y (canvas top)') && allOk;
      allOk = expectApprox(bounds.width, 100, tolerance, 'bbox.width (50·scaleX=100)') && allOk;
      allOk = expectApprox(bounds.height, 120, tolerance, 'bbox.height (40·scaleY=120)') && allOk;
    }
  }
  console.log('');

  console.log(allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
