/**
 * Vector Paths Example
 * 
 * This example demonstrates SVG paths, polylines, and polygons.
 */

import { parseCanvasJSON, resolveOptions, convertCanvasToPdf } from '../src/index';
import * as fs from 'fs';

const canvasJSON = {
  version: '5.3.0',
  width: 600,
  height: 500,
  objects: [
    {
      type: 'text',
      left: 50,
      top: 30,
      width: 500,
      height: 30,
      text: 'Vector Paths Demo',
      fontFamily: 'Helvetica',
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#212529'
    },
    // SVG Path - Heart shape
    {
      type: 'path',
      left: 100,
      top: 100,
      path: [
        ['M', 50, 30],
        ['C', 50, 10, 30, 0, 15, 20],
        ['C', 0, 40, 30, 60, 50, 80],
        ['C', 70, 60, 100, 40, 85, 20],
        ['C', 70, 0, 50, 10, 50, 30],
        ['Z']
      ],
      fill: '#FF6B6B',
      stroke: '#CC0000',
      strokeWidth: 2
    },
    // Polyline - Zigzag
    {
      type: 'polyline',
      left: 300,
      top: 100,
      points: [
        { x: 0, y: 50 },
        { x: 25, y: 0 },
        { x: 50, y: 50 },
        { x: 75, y: 0 },
        { x: 100, y: 50 }
      ],
      stroke: '#339AF0',
      strokeWidth: 3,
      fill: null
    },
    // Polygon - Star
    {
      type: 'polygon',
      left: 100,
      top: 300,
      points: [
        { x: 50, y: 0 },
        { x: 61, y: 35 },
        { x: 98, y: 35 },
        { x: 68, y: 57 },
        { x: 79, y: 91 },
        { x: 50, y: 70 },
        { x: 21, y: 91 },
        { x: 32, y: 57 },
        { x: 2, y: 35 },
        { x: 39, y: 35 }
      ],
      fill: '#FFD43B',
      stroke: '#F59F00',
      strokeWidth: 2
    },
    // Dashed line
    {
      type: 'line',
      left: 300,
      top: 350,
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 50,
      stroke: '#51CF66',
      strokeWidth: 4,
      strokeDashArray: [10, 5]
    }
  ]
};

async function main() {
  console.log('Converting vector paths to PDF...');
  
  const parsed = parseCanvasJSON(canvasJSON);
  const options = resolveOptions({}, parsed);
  const result = await convertCanvasToPdf(parsed, options);
  
  fs.writeFileSync('examples/output-vectors.pdf', result.pdfBytes);
  
  console.log('✅ PDF created: examples/output-vectors.pdf');
  console.log(`   Size: ${result.pdfBytes.length} bytes`);
  console.log('');
  console.log('Features demonstrated:');
  console.log('  - SVG paths (cubic bezier curves)');
  console.log('  - Polylines (open paths)');
  console.log('  - Polygons (closed paths)');
  console.log('  - Dash patterns');
}

main().catch(console.error);
