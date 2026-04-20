/**
 * Basic Example - Converting shapes to PDF
 * 
 * This example demonstrates converting basic Fabric.js shapes to PDF.
 */

import { parseCanvasJSON, resolveOptions, convertCanvasToPdf } from '../src/index';
import * as fs from 'fs';

// A simple Fabric.js canvas with various shapes
const canvasJSON = {
  version: '5.3.0',
  width: 600,
  height: 400,
  objects: [
    // Red rectangle
    {
      type: 'rect',
      left: 50,
      top: 50,
      width: 150,
      height: 100,
      fill: '#FF6B6B',
      stroke: '#CC0000',
      strokeWidth: 2
    },
    // Green circle
    {
      type: 'circle',
      left: 300,
      top: 50,
      radius: 50,
      fill: '#51CF66'
    },
    // Blue triangle
    {
      type: 'triangle',
      left: 450,
      top: 50,
      width: 100,
      height: 100,
      fill: '#339AF0'
    },
    // Purple ellipse
    {
      type: 'ellipse',
      left: 100,
      top: 200,
      rx: 80,
      ry: 40,
      fill: '#9775FA'
    },
    // Black line
    {
      type: 'line',
      left: 300,
      top: 250,
      x1: 0,
      y1: 0,
      x2: 150,
      y2: 50,
      stroke: '#000000',
      strokeWidth: 3
    }
  ]
};

async function main() {
  console.log('Converting basic shapes to PDF...');
  
  // Parse and validate the JSON
  const parsed = parseCanvasJSON(canvasJSON);
  
  // Resolve options with defaults
  const options = resolveOptions({
    backgroundColor: '#F8F9FA'
  }, parsed);
  
  // Convert to PDF
  const result = await convertCanvasToPdf(parsed, options);
  
  // Save the PDF
  fs.writeFileSync('examples/output-basic.pdf', result.pdfBytes);
  
  console.log('✅ PDF created: examples/output-basic.pdf');
  console.log(`   Size: ${result.pdfBytes.length} bytes`);
  
  if (result.warnings.length > 0) {
    console.log(`   Warnings: ${result.warnings.length}`);
    result.warnings.forEach(w => console.log(`   - ${w.message}`));
  }
}

main().catch(console.error);
