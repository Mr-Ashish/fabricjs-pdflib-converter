/**
 * Text Rendering Example
 * 
 * This example demonstrates text rendering with different fonts and alignments.
 */

import { parseCanvasJSON, resolveOptions, convertCanvasToPdf } from '../src/index';
import * as fs from 'fs';

const canvasJSON = {
  version: '5.3.0',
  width: 600,
  height: 500,
  objects: [
    // Title - Helvetica Bold
    {
      type: 'text',
      left: 50,
      top: 50,
      width: 500,
      height: 40,
      text: 'Text Rendering Demo',
      fontFamily: 'Helvetica',
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#212529'
    },
    // Left aligned text
    {
      type: 'text',
      left: 50,
      top: 120,
      width: 500,
      height: 30,
      text: 'Left aligned text (default)',
      fontFamily: 'Helvetica',
      fontSize: 18,
      textAlign: 'left',
      fill: '#495057'
    },
    // Center aligned text
    {
      type: 'text',
      left: 50,
      top: 170,
      width: 500,
      height: 30,
      text: 'Center aligned text',
      fontFamily: 'Helvetica',
      fontSize: 18,
      textAlign: 'center',
      fill: '#495057'
    },
    // Right aligned text
    {
      type: 'text',
      left: 50,
      top: 220,
      width: 500,
      height: 30,
      text: 'Right aligned text',
      fontFamily: 'Helvetica',
      fontSize: 18,
      textAlign: 'right',
      fill: '#495057'
    },
    // Multi-line text
    {
      type: 'text',
      left: 50,
      top: 280,
      width: 500,
      height: 100,
      text: 'This is a multi-line text example.\nLine breaks are supported.\nEach line can be positioned independently.',
      fontFamily: 'Times-Roman',
      fontSize: 14,
      lineHeight: 1.5,
      fill: '#343A40'
    },
    // Italic text
    {
      type: 'text',
      left: 50,
      top: 420,
      width: 500,
      height: 30,
      text: 'Italic text example',
      fontFamily: 'Times-Roman',
      fontSize: 16,
      fontStyle: 'italic',
      fill: '#6C757D'
    }
  ]
};

async function main() {
  console.log('Converting text to PDF...');
  
  const parsed = parseCanvasJSON(canvasJSON);
  const options = resolveOptions({}, parsed);
  const result = await convertCanvasToPdf(parsed, options);
  
  fs.writeFileSync('examples/output-text.pdf', result.pdfBytes);
  
  console.log('✅ PDF created: examples/output-text.pdf');
  console.log(`   Size: ${result.pdfBytes.length} bytes`);
}

main().catch(console.error);
