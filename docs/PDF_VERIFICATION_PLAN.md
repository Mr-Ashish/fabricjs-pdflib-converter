# PDF Verification Plan

## Problem Statement
Current positioning and scaling issues in PDF generation are hard to debug because:
1. Tests verify that methods are called, not the actual PDF output
2. No way to inspect what pdf-lib actually renders
3. Coordinate system conversion (Fabric Y-down vs PDF Y-up) is complex
4. Transformation matrix order is hard to verify

## Solution: 3-Phase Approach

---

## Phase 1: Enhanced Transformation Inspector (Immediate)

**Goal:** Capture and verify all transformation data without parsing PDF

### Implementation

```typescript
// src/testing/transformation-inspector.ts
export interface TransformationRecord {
  objectType: string;
  objectIndex: number;
  fabricProps: {
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    originX: string;
    originY: string;
  };
  pdfMatrix: [number, number, number, number, number, number];
  drawCommand: {
    method: string;
    args: Record<string, unknown>;
  };
}

export class TransformationInspector {
  records: TransformationRecord[] = [];
  
  capture(obj: FabricObject, matrix: TransformMatrix, drawMethod: string, drawArgs: unknown) {
    this.records.push({
      objectType: obj.type,
      fabricProps: { left: obj.left, top: obj.top, ... },
      pdfMatrix: matrix,
      drawCommand: { method: drawMethod, args: drawArgs }
    });
  }
  
  // Verify methods
  verifyPosition(index: number, expectedX: number, expectedY: number) { ... }
  verifyScale(index: number, expectedScaleX: number, expectedScaleY: number) { ... }
  verifyRotation(index: number, expectedAngle: number) { ... }
}
```

### Usage in Tests

```typescript
const inspector = new TransformationInspector();
const renderer = new InspectedRectRenderer(inspector);

// Render object
renderer.render(obj, page, context);

// Verify transformation
inspector.verifyPosition(0, 100, 500); // PDF Y is flipped
inspector.verifyScale(0, 2, 2);
```

---

## Phase 2: PDF.js Integration Tests

**Goal:** Parse actual generated PDFs and verify element positions

### Dependencies
```bash
npm install --save-dev pdfjs-dist@4
```

### Implementation

```typescript
// tests/integration/pdfjs-verification.test.ts
import * as pdfjs from 'pdfjs-dist';

async function extractPageElements(pdfBytes: Uint8Array) {
  const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(1);
  const ops = await page.getOperatorList();
  
  const elements: Array<{
    type: 'rect' | 'path' | 'text';
    transform: [number, number, number, number, number, number];
    bounds: { x: number; y: number; width: number; height: number };
  }> = [];
  
  // Parse operator list to extract elements
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    
    // Track transformation matrices (cm operator)
    // Track rectangle drawing (re operator)
    // Track path construction
  }
  
  return elements;
}
```

### Test Example

```typescript
it('should position rectangle at correct PDF coordinates', async () => {
  const canvasJSON = createCanvasWithRect({ left: 100, top: 100 });
  const result = await convertCanvasToPdf(canvasJSON, options);
  
  const elements = await extractPageElements(result.pdfBytes);
  
  expect(elements).toHaveLength(1);
  expect(elements[0].type).toBe('rect');
  expect(elements[0].bounds.x).toBeCloseTo(75, 1); // left - width/2 for center origin
  expect(elements[0].bounds.y).toBeCloseTo(475, 1); // pageHeight - top - height/2
});
```

---

## Phase 3: Visual Regression Tests

**Goal:** Compare rendered PDF images against expected

### Dependencies
```bash
npm install --save-dev pdf2pic pixelmatch
```

### Implementation

```typescript
// tests/visual/regression.test.ts
import { fromBuffer } from 'pdf2pic';
import pixelmatch from 'pixelmatch';

async function comparePdfToExpected(
  pdfBytes: Uint8Array, 
  expectedPngPath: string,
  threshold = 0.1
) {
  // Convert PDF to PNG
  const convert = fromBuffer(pdfBytes, {
    density: 100,
    format: 'png',
    width: 800,
    height: 600
  });
  
  const result = await convert(1);
  const resultPng = PNG.parse(result.base64);
  const expectedPng = PNG.parse(fs.readFileSync(expectedPngPath));
  
  // Compare
  const diff = pixelmatch(
    resultPng.data, 
    expectedPng.data, 
    null, 
    800, 
    600, 
    { threshold }
  );
  
  return { diff, match: diff === 0 };
}
```

---

## Debug Script for Current Issues

Create a debug tool to diagnose current positioning/scaling problems:

```typescript
// scripts/debug-pdf.ts
import { PDFDocument } from 'pdf-lib';
import { convertCanvasToPdf } from '../src';

async function debugPDF() {
  // Create simple test case
  const canvasJSON = {
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
        scaleX: 2,
        scaleY: 2,
        angle: 45
      }
    ]
  };
  
  const result = await convertCanvasToPdf(canvasJSON);
  
  // Load and inspect
  const pdf = await PDFDocument.load(result.pdfBytes);
  const page = pdf.getPages()[0];
  
  console.log('Page size:', page.getWidth(), 'x', page.getHeight());
  
  // Try to access content stream
  const contentRef = page.node.get(PDFName.of('Contents'));
  console.log('Content stream ref:', contentRef);
  
  // Save for manual inspection
  fs.writeFileSync('debug-output.pdf', result.pdfBytes);
  console.log('Saved to debug-output.pdf');
}
```

---

## Implementation Priority

1. **Immediate (Today):** Phase 1 - Transformation Inspector
   - Non-invasive, can be added to existing tests
   - Will help debug current issues

2. **This Week:** Phase 2 - PDF.js Integration
   - Parse actual PDF output
   - Verify real positions

3. **Next Week:** Phase 3 - Visual Regression
   - Final verification layer
   - Catch visual bugs

---

## Expected Outcomes

After implementing all phases:
- Unit tests verify transformation logic
- Integration tests verify PDF structure
- Visual tests verify actual appearance
- Full traceability from Fabric props → Matrix → PDF → Visual
