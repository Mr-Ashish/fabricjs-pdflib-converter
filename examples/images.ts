/**
 * Images Example
 * 
 * This example demonstrates working with images.
 * Note: In production, you would load images from files or URLs.
 */

import { parseCanvasJSON, resolveOptions, convertCanvasToPdf } from '../src/index';
import * as fs from 'fs';

// Example with placeholder - in real usage you'd use actual image data
const canvasJSON = {
  version: '5.3.0',
  width: 600,
  height: 400,
  objects: [
    {
      type: 'text',
      left: 50,
      top: 50,
      width: 500,
      height: 30,
      text: 'Image Support',
      fontFamily: 'Helvetica',
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#212529'
    },
    {
      type: 'text',
      left: 50,
      top: 100,
      width: 500,
      height: 80,
      text: 'This library supports PNG and JPG images via data URLs or external URLs.\n\nIn this example, we show the text layout.',
      fontFamily: 'Helvetica',
      fontSize: 14,
      lineHeight: 1.5,
      fill: '#495057'
    },
    {
      type: 'rect',
      left: 50,
      top: 200,
      width: 200,
      height: 150,
      fill: '#E9ECEF',
      stroke: '#ADB5BD',
      strokeWidth: 1
    },
    {
      type: 'text',
      left: 70,
      top: 280,
      width: 160,
      height: 20,
      text: 'Image Placeholder',
      fontFamily: 'Helvetica',
      fontSize: 12,
      textAlign: 'center',
      fill: '#6C757D'
    }
  ]
};

async function main() {
  console.log('Creating PDF with image layout...');
  console.log('Note: Add actual image data URLs to test image rendering');
  
  const parsed = parseCanvasJSON(canvasJSON);
  const options = resolveOptions({}, parsed);
  const result = await convertCanvasToPdf(parsed, options);
  
  fs.writeFileSync('examples/output-images.pdf', result.pdfBytes);
  
  console.log('✅ PDF created: examples/output-images.pdf');
  console.log('');
  console.log('To use images, add objects like:');
  console.log(`  {`);
  console.log(`    type: 'image',`);
  console.log(`    left: 50,`);
  console.log(`    top: 50,`);
  console.log(`    width: 200,`);
  console.log(`    height: 150,`);
  console.log(`    src: 'data:image/png;base64,iVBORw0KGgo...'`);
  console.log(`  }`);
}

main().catch(console.error);
