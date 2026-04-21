# PDF.js Integration Test Plan

## Overview

Use Mozilla's PDF.js (pdfjs-dist) to parse generated PDFs and verify actual element positions, catching bugs that mock-based tests miss.

**Scope:** Test-only (devDependency)
**Purpose:** Verify actual PDF output, not just method calls

---

## How PDF.js Works for Testing

PDF.js provides access to the PDF's operator list - the low-level drawing commands:

```typescript
const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
const page = await pdf.getPage(1);
const ops = await page.getOperatorList();

// ops.fnArray = array of operator types (numbers)
// ops.argsArray = array of operator arguments
```

### Key PDF Operators for Testing

| Operator | Name | Purpose | What We Can Verify |
|----------|------|---------|-------------------|
| `cm` | concatMatrix | Apply transformation matrix | Position, scale, rotation |
| `q` | saveGraphicsState | Push graphics state | Isolation between objects |
| `Q` | restoreGraphicsState | Pop graphics state | Proper cleanup |
| `re` | rectangle | Draw rectangle | Rectangle position/size |
| `m` | moveTo | Start path | Path start position |
| `l` | lineTo | Line to point | Path segments |
| `c` | curveTo | Bezier curve | Curved paths |
| `f` | fill | Fill path | Fill is applied |
| `S` | stroke | Stroke path | Stroke is applied |
| `RG` | setStrokeRGB | Stroke color | Stroke color values |
| `rg` | setFillRGB | Fill color | Fill color values |

---

## Test Case Categories

### Category 1: Position Verification Tests

**Purpose:** Verify objects appear at correct PDF coordinates

#### Test 1.1: Single Rectangle Position
```typescript
it('should position rect at correct PDF coordinates', async () => {
  // Fabric: rect at left=100, top=100, width=100, height=100, origin=center
  // Expected PDF: 
  // - x = 100 - 50 = 50 (left minus half width for center origin)
  // - y = 600 - 100 - 50 = 450 (pageHeight - top - half height)
  
  const canvasJSON = {
    objects: [{
      type: 'rect',
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      originX: 'center',
      originY: 'center',
      fill: '#FF0000'
    }]
  };
  
  const result = await convertCanvasToPdf(canvasJSON, options);
  const elements = await extractElements(result.pdfBytes);
  
  expect(elements).toHaveLength(1);
  expect(elements[0].type).toBe('rect');
  expect(elements[0].bounds.x).toBeCloseTo(50, 1);
  expect(elements[0].bounds.y).toBeCloseTo(450, 1);
  expect(elements[0].bounds.width).toBeCloseTo(100, 1);
  expect(elements[0].bounds.height).toBeCloseTo(100, 1);
});
```

#### Test 1.2: Y-Coordinate Flipping (Fabric Y-down → PDF Y-up)
```typescript
it('should flip Y coordinates correctly', async () => {
  // Two rects at same X, different Y in Fabric
  // Should be at same X, flipped Y in PDF
  
  const canvasJSON = {
    width: 800,
    height: 600,
    objects: [
      { type: 'rect', left: 100, top: 100, ... },  // Near top
      { type: 'rect', left: 100, top: 500, ... }   // Near bottom
    ]
  };
  
  const elements = await extractElements(result.pdfBytes);
  
  // Object at Fabric top=100 should be at higher PDF Y
  // Object at Fabric top=500 should be at lower PDF Y
  expect(elements[0].bounds.y).toBeGreaterThan(elements[1].bounds.y);
});
```

#### Test 1.3: Multiple Objects Relative Positioning
```typescript
it('should maintain relative positions between objects', async () => {
  // Grid of 4 rects at (100,100), (300,100), (100,300), (300,300)
  
  const elements = await extractElements(result.pdfBytes);
  
  // Verify horizontal spacing
  expect(elements[1].bounds.x - elements[0].bounds.x).toBeCloseTo(200, 1);
  
  // Verify vertical spacing (in PDF coordinates)
  expect(elements[2].bounds.y - elements[0].bounds.y).toBeCloseTo(-200, 1);
});
```

---

### Category 2: Scale Verification Tests

**Purpose:** Verify objects are scaled correctly (not double-scaled)

#### Test 2.1: Scale in Transformation Matrix
```typescript
it('should apply scale via transformation matrix', async () => {
  // Rect with scaleX=2, scaleY=3
  
  const canvasJSON = {
    objects: [{
      type: 'rect',
      width: 100,
      height: 100,
      scaleX: 2,
      scaleY: 3,
      originX: 'center',
      originY: 'center'
    }]
  };
  
  const ops = await extractOperators(result.pdfBytes);
  
  // Find the cm (concatMatrix) operator
  const matrixOp = ops.find(op => op.name === 'cm');
  
  // Matrix should contain scale: [2, 0, 0, 3, tx, ty]
  expect(matrixOp.args[0]).toBeCloseTo(2, 5); // scaleX
  expect(matrixOp.args[3]).toBeCloseTo(3, 5); // scaleY
});
```

#### Test 2.2: No Double Scaling
```typescript
it('should not double-scale dimensions', async () => {
  // Rect with width=100, scaleX=2
  // Draw call should use width=100 (not 200)
  // Scale should be in matrix only
  
  const ops = await extractOperators(result.pdfBytes);
  
  // Find rectangle operator
  const rectOp = ops.find(op => op.name === 're');
  
  // Rectangle width should be original (100), not scaled (200)
  expect(rectOp.args[2]).toBe(100); // width
});
```

#### Test 2.3: Triangle Scaling
```typescript
it('should scale triangle correctly', async () => {
  // Triangle with width=60, height=60, scaleX=2, scaleY=2
  
  const elements = await extractElements(result.pdfBytes);
  
  // Path should use original dimensions, matrix should have scale
  const triangle = elements[0];
  expect(triangle.transform[0]).toBeCloseTo(2, 5); // scaleX in matrix
  expect(triangle.transform[3]).toBeCloseTo(2, 5); // scaleY in matrix
});
```

---

### Category 3: Rotation Verification Tests

**Purpose:** Verify rotation is applied correctly

#### Test 3.1: Rotation in Matrix
```typescript
it('should apply rotation via transformation matrix', async () => {
  // Rect with angle=45 degrees
  
  const ops = await extractOperators(result.pdfBytes);
  const matrixOp = ops.find(op => op.name === 'cm');
  
  // Rotation matrix: [cos(45), sin(45), -sin(45), cos(45), tx, ty]
  const cos45 = Math.cos(Math.PI / 4);
  const sin45 = Math.sin(Math.PI / 4);
  
  expect(matrixOp.args[0]).toBeCloseTo(cos45, 5);
  expect(matrixOp.args[1]).toBeCloseTo(sin45, 5);
  expect(matrixOp.args[2]).toBeCloseTo(-sin45, 5);
  expect(matrixOp.args[3]).toBeCloseTo(cos45, 5);
});
```

#### Test 3.2: Rotation Around Center
```typescript
it('should rotate around object center', async () => {
  // Rect at (100,100) rotated 45°
  // Should rotate around its center, not origin
  
  const elements = await extractElements(result.pdfBytes);
  
  // The bounds should show rotation effect
  // A 100x100 square rotated 45° should have width ≈ 141 (100 * sqrt(2))
  expect(elements[0].bounds.width).toBeCloseTo(141.4, 1);
  expect(elements[0].bounds.height).toBeCloseTo(141.4, 1);
});
```

#### Test 3.3: Combined Rotation and Scale
```typescript
it('should handle rotation and scale together', async () => {
  // Rect with angle=45, scaleX=2, scaleY=2
  
  const ops = await extractOperators(result.pdfBytes);
  const matrixOp = ops.find(op => op.name === 'cm');
  
  // Matrix should have both rotation and scale
  const [a, b, c, d] = matrixOp.args;
  
  // Extract scale from matrix
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);
  
  expect(scaleX).toBeCloseTo(2, 5);
  expect(scaleY).toBeCloseTo(2, 5);
});
```

---

### Category 4: Origin Handling Tests

**Purpose:** Verify originX/originY are handled correctly

#### Test 4.1: Center Origin (Default)
```typescript
it('should handle center origin correctly', async () => {
  // Rect at left=100, top=100 with center origin
  // Center should be at (100, 100)
  // Rect should extend from (50, 50) to (150, 150)
  
  const elements = await extractElements(result.pdfBytes);
  
  expect(elements[0].bounds.x).toBeCloseTo(50, 1);
  expect(elements[0].bounds.y).toBeCloseTo(450, 1); // PDF Y flipped
});
```

#### Test 4.2: Left/Top Origin
```typescript
it('should handle left/top origin correctly', async () => {
  // Rect at left=100, top=100 with originX=left, originY=top
  // Top-left should be at (100, 100)
  // Rect should extend from (100, 100) to (200, 200)
  
  const elements = await extractElements(result.pdfBytes);
  
  expect(elements[0].bounds.x).toBeCloseTo(100, 1);
  expect(elements[0].bounds.y).toBeCloseTo(400, 1); // PDF Y flipped
});
```

---

### Category 5: Graphics State Isolation Tests

**Purpose:** Verify transformations don't leak between objects

#### Test 5.1: Push/Pop Graphics State
```typescript
it('should isolate transformations between objects', async () => {
  // Two objects with different transforms
  
  const ops = await extractOperators(result.pdfBytes);
  
  // Count q (save) and Q (restore) operators
  const saveCount = ops.filter(op => op.name === 'q').length;
  const restoreCount = ops.filter(op => op.name === 'Q').length;
  
  // Should have balanced save/restore
  expect(saveCount).toBe(restoreCount);
  expect(saveCount).toBe(2); // One per object
});
```

#### Test 5.2: No Transform Leakage
```typescript
it('should not leak transforms between objects', async () => {
  // Object 1: scaled 2x
  // Object 2: no scale
  
  const elements = await extractElements(result.pdfBytes);
  
  // Second object should not have scale from first
  const matrix2 = elements[1].transform;
  const scaleX2 = Math.sqrt(matrix2[0] * matrix2[0] + matrix2[1] * matrix2[1]);
  
  expect(scaleX2).toBeCloseTo(1, 5); // No scale
});
```

---

## Test Infrastructure

### Helper Functions

```typescript
// tests/helpers/pdfjs-helpers.ts

interface ExtractedElement {
  type: 'rect' | 'path' | 'text' | 'circle';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  transform: [number, number, number, number, number, number];
  fill?: { r: number; g: number; b: number };
  stroke?: { r: number; g: number; b: number };
}

interface PDFOperator {
  name: string;
  args: number[];
  index: number;
}

/**
 * Extract elements from PDF by parsing operator list
 */
async function extractElements(pdfBytes: Uint8Array): Promise<ExtractedElement[]> {
  const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(1);
  const ops = await page.getOperatorList();
  
  const elements: ExtractedElement[] = [];
  let currentTransform: number[] = [1, 0, 0, 1, 0, 0];
  let graphicsStack: number[][] = [];
  
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    
    switch (fn) {
      case pdfjs.OPS.save: // q
        graphicsStack.push([...currentTransform]);
        break;
        
      case pdfjs.OPS.restore: // Q
        currentTransform = graphicsStack.pop() || [1, 0, 0, 1, 0, 0];
        break;
        
      case pdfjsOPS.transform: // cm
        currentTransform = multiplyMatrices(currentTransform, args);
        break;
        
      case pdfjs.OPS.rectangle: // re
        const [x, y, width, height] = args;
        elements.push({
          type: 'rect',
          bounds: { x, y, width, height },
          transform: [...currentTransform]
        });
        break;
        
      // Handle other operators...
    }
  }
  
  return elements;
}

/**
 * Extract raw operators for low-level verification
 */
async function extractOperators(pdfBytes: Uint8Array): Promise<PDFOperator[]> {
  const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(1);
  const ops = await page.getOperatorList();
  
  const operatorNames = Object.entries(pdfjs.OPS).reduce((acc, [name, num]) => {
    acc[num] = name;
    return acc;
  }, {} as Record<number, string>);
  
  return ops.fnArray.map((fn, index) => ({
    name: operatorNames[fn] || `unknown(${fn})`,
    args: ops.argsArray[index],
    index
  }));
}
```

### Setup Requirements

```typescript
// tests/setup.pdfjs.ts
import * as pdfjs from 'pdfjs-dist';

// PDF.js needs a worker
// Option 1: Use external worker
pdfjs.GlobalWorkerOptions.workerSrc = 
  'node_modules/pdfjs-dist/build/pdf.worker.js';

// Option 2: Use worker entry (faster for tests)
const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
```

---

## Dependencies to Add

```bash
npm install --save-dev pdfjs-dist@^4.0.0
```

---

## Expected Test Count

| Category | Tests |
|----------|-------|
| Position Verification | 5-7 tests |
| Scale Verification | 4-6 tests |
| Rotation Verification | 4-6 tests |
| Origin Handling | 3-5 tests |
| Graphics State Isolation | 2-4 tests |
| **Total** | **18-28 tests** |

---

## Benefits Over Current Testing

| Current Approach | PDF.js Approach |
|-----------------|-----------------|
| Verifies methods are called | Verifies actual PDF output |
| Can't catch pdf-lib integration bugs | Catches pdf-lib integration bugs |
| Mock-based (fake) | Real PDF parsing |
| Tests transformation logic | Tests transformation result |
| Fast | Slower (PDF parsing) |

---

## Implementation Order

1. **Week 1:** Set up PDF.js infrastructure, create helpers
2. **Week 2:** Implement Category 1-2 tests (position, scale)
3. **Week 3:** Implement Category 3-5 tests (rotation, origin, isolation)
4. **Week 4:** Fix any bugs discovered, add regression tests
