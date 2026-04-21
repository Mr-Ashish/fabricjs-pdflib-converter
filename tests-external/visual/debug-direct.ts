import { PDFDocument, rgb } from 'pdf-lib';
import { pdfToPng, findContentBounds, savePng } from './visual-regression';

async function main() {
  // Create a PDF directly with pdf-lib to test coordinate system
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 400]);
  
  // Draw a red rectangle at (100, 100) with size 80x80
  // In PDF coordinates, (100, 100) is 100 units from bottom-left
  page.drawRectangle({
    x: 100,
    y: 100,
    width: 80,
    height: 80,
    color: rgb(1, 0, 0),
  });
  
  const pdfBytes = await pdfDoc.save();
  const pngBuffer = await pdfToPng(pdfBytes, { width: 400, height: 400 });
  const bounds = findContentBounds(pngBuffer);
  
  console.log('Direct PDF draw at (100, 100):');
  console.log('  Bounds:', bounds);
  console.log('  Expected: x≈100, y≈100 (PDF y=100 is near bottom)');
  
  savePng(pngBuffer, 'debug-direct.png');
}

main();
