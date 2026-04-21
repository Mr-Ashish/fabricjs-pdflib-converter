import { convertCanvasToPdf, resolveOptions } from '../src/index';
import { pdfToPng, findContentBounds } from '../tests-external/visual/visual-regression';
import * as fs from 'fs';

// Exact same JSON for both Fabric and PDF
const canvasJSON = {
  version: '5.3.0',
  width: 800,
  height: 600,
  objects: [
    {
      type: 'rect',
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: '#3498db',
      originX: 'left',
      originY: 'top',
    },
    {
      type: 'circle',
      left: 408,
      top: 163,
      radius: 60,
      width: 120,
      height: 120,
      fill: '#e74c3c',
      originX: 'left',
      originY: 'top',
    },
    {
      type: 'triangle',
      left: 251,
      top: 167,
      width: 120,
      height: 120,
      fill: '#f39c12',
      originX: 'left',
      originY: 'top',
    },
  ],
  background: '#ffffff'
};

async function analyze() {
  console.log('=== Position Analysis ===\n');
  console.log('Expected positions (from Fabric.js left/top origin):');
  console.log('  Rect:     top-left at (100, 100), size 150x100');
  console.log('  Circle:   top-left at (408, 163), diameter 120 (radius 60)');
  console.log('  Triangle: top-left at (251, 167), size 120x120');
  console.log('');
  
  // Generate PDF
  const options = resolveOptions({}, canvasJSON as any);
  const result = await convertCanvasToPdf(canvasJSON as any, options);
  
  fs.writeFileSync('compare-test.pdf', result.pdfBytes);
  
  // Convert to PNG
  const pngBuffer = await pdfToPng(result.pdfBytes, { width: 800, height: 600 });
  fs.writeFileSync('compare-test.png', pngBuffer);
  
  // Analyze each shape's position
  console.log('Actual positions in PDF (PNG coordinates, Y-down):');
  
  // Find all content
  const PNG = require('pngjs').PNG;
  const png = PNG.sync.read(pngBuffer);
  
  // Simple bounding box detection by color
  function findShapeByColor(targetR: number, targetG: number, targetB: number, name: string) {
    let minX = 800, minY = 600, maxX = 0, maxY = 0;
    let found = false;
    
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) << 2;
        const r = png.data[idx];
        const g = png.data[idx + 1];
        const b = png.data[idx + 2];
        
        // Check if pixel matches target color (with tolerance)
        const tolerance = 30;
        if (Math.abs(r - targetR) < tolerance && 
            Math.abs(g - targetG) < tolerance && 
            Math.abs(b - targetB) < tolerance) {
          found = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (found) {
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      console.log(`  ${name}: top-left at (${minX}, ${minY}), size ${width}x${height}`);
      return { x: minX, y: minY, width, height };
    } else {
      console.log(`  ${name}: NOT FOUND`);
      return null;
    }
  }
  
  // Find shapes by their colors
  const rectBounds = findShapeByColor(52, 152, 219, 'Rect    ');   // #3498db
  const circleBounds = findShapeByColor(231, 76, 60, 'Circle  ');  // #e74c3c
  const triangleBounds = findShapeByColor(243, 156, 18, 'Triangle'); // #f39c12
  
  console.log('\n=== Deltas (Actual - Expected) ===');
  if (rectBounds) {
    console.log(`  Rect:     x=${rectBounds.x - 100}, y=${rectBounds.y - 100}`);
  }
  if (circleBounds) {
    console.log(`  Circle:   x=${circleBounds.x - 408}, y=${circleBounds.y - 163}`);
  }
  if (triangleBounds) {
    console.log(`  Triangle: x=${triangleBounds.x - 251}, y=${triangleBounds.y - 167}`);
  }
  
  console.log('\n=== Analysis ===');
  console.log('PNG Y coordinate = distance from top of image');
  console.log('Fabric Y coordinate = distance from top of canvas');
  console.log('So PNG Y should match Fabric Y for left/top origin objects');
}

analyze().catch(console.error);
