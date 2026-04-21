/**
 * Debug Script for Transformation Issues
 * 
 * Usage: npx tsx scripts/debug-transformations.ts
 */

import { PDFDocument } from 'pdf-lib';
import { convertCanvasToPdf, resolveOptions } from '../src/index';
import { TransformationInspector } from '../src/testing/transformation-inspector';
import type { FabricCanvasJSON, FabricRectObject, FabricCircleObject, FabricTriangleObject } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Create test cases for common scenarios
const testCases = [
  {
    name: 'Simple Rect (no transform)',
    canvas: {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'rect',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: '#FF0000',
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        originX: 'center',
        originY: 'center',
      } as FabricRectObject],
    } as FabricCanvasJSON,
  },
  {
    name: 'Scaled Rect',
    canvas: {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'rect',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: '#FF0000',
        scaleX: 2,
        scaleY: 2,
        angle: 0,
        originX: 'center',
        originY: 'center',
      } as FabricRectObject],
    } as FabricCanvasJSON,
  },
  {
    name: 'Rotated Rect',
    canvas: {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'rect',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: '#FF0000',
        scaleX: 1,
        scaleY: 1,
        angle: 45,
        originX: 'center',
        originY: 'center',
      } as FabricRectObject],
    } as FabricCanvasJSON,
  },
  {
    name: 'Rotated + Scaled Rect',
    canvas: {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'rect',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: '#FF0000',
        scaleX: 2,
        scaleY: 2,
        angle: 45,
        originX: 'center',
        originY: 'center',
      } as FabricRectObject],
    } as FabricCanvasJSON,
  },
  {
    name: 'Triangle (default size)',
    canvas: {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [{
        type: 'triangle',
        left: 150,
        top: 150,
        width: 120,
        height: 120,
        fill: '#f39c12',
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        originX: 'center',
        originY: 'center',
      } as FabricTriangleObject],
    } as FabricCanvasJSON,
  },
  {
    name: 'Multiple Objects',
    canvas: {
      version: '5.3.0',
      width: 800,
      height: 600,
      objects: [
        {
          type: 'rect',
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: '#FF0000',
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          originX: 'center',
          originY: 'center',
        } as FabricRectObject,
        {
          type: 'rect',
          left: 300,
          top: 100,
          width: 100,
          height: 100,
          fill: '#00FF00',
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          originX: 'center',
          originY: 'center',
        } as FabricRectObject,
      ],
    } as FabricCanvasJSON,
  },
];

async function runDebug() {
  const outputDir = path.join(__dirname, '..', 'debug-output');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Running transformation debug tests...\n');

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test: ${testCase.name}`);
    console.log('='.repeat(60));

    try {
      // Convert to PDF
      const options = resolveOptions({}, testCase.canvas);
      const result = await convertCanvasToPdf(testCase.canvas, options);

      // Save PDF for manual inspection
      const safeName = testCase.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const pdfPath = path.join(outputDir, `${safeName}.pdf`);
      fs.writeFileSync(pdfPath, result.pdfBytes);
      console.log(`  Saved PDF: ${pdfPath}`);

      // Load and inspect with pdf-lib
      const pdf = await PDFDocument.load(result.pdfBytes);
      const page = pdf.getPages()[0];
      
      console.log(`  Page size: ${page.getWidth()} x ${page.getHeight()}`);
      console.log(`  Objects: ${testCase.canvas.objects.length}`);

      // Basic validation
      for (let i = 0; i < testCase.canvas.objects.length; i++) {
        const obj = testCase.canvas.objects[i];
        console.log(`\n  Object ${i + 1}: ${obj.type}`);
        console.log(`    Fabric: left=${obj.left}, top=${obj.top}, width=${obj.width}, height=${obj.height}`);
        console.log(`    Scale: ${obj.scaleX ?? 1}x${obj.scaleY ?? 1}, Angle: ${obj.angle ?? 0}°`);
      }

    } catch (error) {
      console.error(`  ERROR: ${error}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Debug complete! Check the debug-output/ directory');
  console.log('='.repeat(60));
}

// Run if executed directly
if (require.main === module) {
  runDebug().catch(console.error);
}

export { runDebug };
