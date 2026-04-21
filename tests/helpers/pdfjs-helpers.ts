/**
 * PDF.js Helper Functions for Testing
 * 
 * These utilities parse generated PDFs and extract element positions,
 * transformations, and operators for verification.
 */

// Use pdfjs-dist v3 with Node.js compatibility
import * as pdfjs from 'pdfjs-dist';

// Disable worker for Node.js testing
// @ts-expect-error - pdfjs allows false to disable worker
pdfjs.GlobalWorkerOptions.workerSrc = false;

export interface ExtractedElement {
  type: 'rect' | 'path' | 'text' | 'circle' | 'unknown';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  transform: [number, number, number, number, number, number];
  fill?: { r: number; g: number; b: number };
  stroke?: { r: number; g: number; b: number };
  strokeWidth?: number;
}

export interface PDFOperator {
  name: string;
  args: unknown[];
  index: number;
}

/**
 * Multiply two transformation matrices
 * result = m2 × m1 (m1 applied first, then m2)
 */
function multiplyMatrices(
  m1: number[],
  m2: number[]
): [number, number, number, number, number, number] {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;

  return [
    a2 * a1 + c2 * b1,
    b2 * a1 + d2 * b1,
    a2 * c1 + c2 * d1,
    b2 * c1 + d2 * d1,
    a2 * e1 + c2 * f1 + e2,
    b2 * e1 + d2 * f1 + f2,
  ];
}

/**
 * Apply transformation matrix to a point
 */
function transformPoint(
  x: number,
  y: number,
  matrix: number[]
): { x: number; y: number } {
  const [a, b, c, d, e, f] = matrix;
  return {
    x: a * x + c * y + e,
    y: b * x + d * y + f,
  };
}

/**
 * Extract all operators from a PDF page
 */
export async function extractOperators(pdfBytes: Uint8Array): Promise<PDFOperator[]> {
  const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(1);
  const ops = await page.getOperatorList();

  // Build reverse mapping from operator number to name
  const operatorNames: Record<number, string> = {};
  for (const [name, num] of Object.entries(pdfjs.OPS)) {
    operatorNames[num as number] = name;
  }

  return ops.fnArray.map((fn, index) => ({
    name: operatorNames[fn] || `unknown(${fn})`,
    args: ops.argsArray[index] || [],
    index,
  }));
}

/**
 * Extract elements from PDF by tracking graphics state and transformations
 */
export async function extractElements(
  pdfBytes: Uint8Array
): Promise<ExtractedElement[]> {
  const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(1);
  const ops = await page.getOperatorList();

  const elements: ExtractedElement[] = [];
  let currentTransform: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  const graphicsStack: typeof currentTransform[] = [];
  
  // Track current path for path-based elements
  let currentPath: Array<{ x: number; y: number }> = [];
  let pathStarted = false;
  
  // Track current colors
  let currentFill: { r: number; g: number; b: number } | undefined;
  let currentStroke: { r: number; g: number; b: number } | undefined;
  let currentStrokeWidth = 1;

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];

    switch (fn) {
      case pdfjs.OPS.save: // q - save graphics state
        graphicsStack.push([...currentTransform]);
        break;

      case pdfjs.OPS.restore: // Q - restore graphics state
        currentTransform = graphicsStack.pop() || [1, 0, 0, 1, 0, 0];
        break;

      case pdfjs.OPS.transform: // cm - concat transformation matrix
        currentTransform = multiplyMatrices(currentTransform, args as number[]);
        break;

      case pdfjs.OPS.setFillRGBColor: // rg - set fill color
        const [r, g, b] = args as number[];
        currentFill = { r, g, b };
        break;

      case pdfjs.OPS.setStrokeRGBColor: // RG - set stroke color
        const [sr, sg, sb] = args as number[];
        currentStroke = { r: sr, g: sg, b: sb };
        break;

      case pdfjs.OPS.setLineWidth: // w - set line width
        currentStrokeWidth = args[0] as number;
        break;

      case pdfjs.OPS.rectangle: // re - rectangle
        const [x, y, width, height] = args as number[];
        
        // Transform the rectangle corners
        const topLeft = transformPoint(x, y + height, currentTransform);
        const bottomRight = transformPoint(x + width, y, currentTransform);
        
        elements.push({
          type: 'rect',
          bounds: {
            x: Math.min(topLeft.x, bottomRight.x),
            y: Math.min(topLeft.y, bottomRight.y),
            width: Math.abs(bottomRight.x - topLeft.x),
            height: Math.abs(topLeft.y - bottomRight.y),
          },
          transform: [...currentTransform],
          fill: currentFill ? { ...currentFill } : undefined,
          stroke: currentStroke ? { ...currentStroke } : undefined,
          strokeWidth: currentStrokeWidth,
        });
        break;

      case pdfjs.OPS.constructPath: // pdf-lib uses this for paths
        const [pathTypes, pathCoords] = args as [number[], number[]];
        
        // Parse path types and coordinates
        // pathTypes: array of path segment types
        // pathCoords: flat array of coordinates
        let coordIndex = 0;
        const pathPoints: Array<{ x: number; y: number }> = [];
        
        for (const pathType of pathTypes) {
          switch (pathType) {
            case 13: // moveTo
              pathPoints.push({ x: pathCoords[coordIndex], y: pathCoords[coordIndex + 1] });
              coordIndex += 2;
              break;
            case 14: // lineTo
              pathPoints.push({ x: pathCoords[coordIndex], y: pathCoords[coordIndex + 1] });
              coordIndex += 2;
              break;
            case 15: // curveTo (cubic bezier)
              coordIndex += 6; // Skip control points, just track end point
              break;
            case 18: // closePath
              // No coordinates
              break;
          }
        }
        
        if (pathPoints.length > 0) {
          // Calculate bounds from path points
          const xs = pathPoints.map(p => p.x);
          const ys = pathPoints.map(p => p.y);
          
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          
          // Transform bounds
          const tl = transformPoint(minX, maxY, currentTransform);
          const br = transformPoint(maxX, minY, currentTransform);
          
          elements.push({
            type: 'path',
            bounds: {
              x: Math.min(tl.x, br.x),
              y: Math.min(tl.y, br.y),
              width: Math.abs(br.x - tl.x),
              height: Math.abs(tl.y - br.y),
            },
            transform: [...currentTransform],
            fill: currentFill ? { ...currentFill } : undefined,
            stroke: currentStroke ? { ...currentStroke } : undefined,
            strokeWidth: currentStrokeWidth,
          });
        }
        break;

      case pdfjs.OPS.moveTo: // m - move to
        const [mx, my] = args as number[];
        currentPath = [{ x: mx, y: my }];
        pathStarted = true;
        break;

      case pdfjs.OPS.lineTo: // l - line to
        const [lx, ly] = args as number[];
        if (pathStarted) {
          currentPath.push({ x: lx, y: ly });
        }
        break;

      case pdfjs.OPS.curveTo: // c - curve to
        const [c1x, c1y, c2x, c2y, cx, cy] = args as number[];
        if (pathStarted) {
          currentPath.push({ x: cx, y: cy });
        }
        break;

      case pdfjs.OPS.closePath: // h - close path
        if (pathStarted && currentPath.length > 0) {
          // Calculate bounds from path points
          const xs = currentPath.map(p => p.x);
          const ys = currentPath.map(p => p.y);
          
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          
          // Transform bounds
          const topLeft = transformPoint(minX, maxY, currentTransform);
          const bottomRight = transformPoint(maxX, minY, currentTransform);
          
          elements.push({
            type: 'path',
            bounds: {
              x: Math.min(topLeft.x, bottomRight.x),
              y: Math.min(topLeft.y, bottomRight.y),
              width: Math.abs(bottomRight.x - topLeft.x),
              height: Math.abs(topLeft.y - bottomRight.y),
            },
            transform: [...currentTransform],
            fill: currentFill ? { ...currentFill } : undefined,
            stroke: currentStroke ? { ...currentStroke } : undefined,
            strokeWidth: currentStrokeWidth,
          });
          
          currentPath = [];
          pathStarted = false;
        }
        break;

      // Note: pdf-lib's drawCircle uses SVG path, so it's captured as path type
    }
  }

  return elements;
}

/**
 * Find operators by name
 */
export function findOperators(
  operators: PDFOperator[],
  name: string
): PDFOperator[] {
  return operators.filter(op => op.name === name);
}

/**
 * Get transformation matrices from operators
 */
export function getTransformMatrices(
  operators: PDFOperator[]
): Array<{ args: number[]; index: number }> {
  return operators
    .filter(op => op.name === 'transform')
    .map(op => ({
      args: op.args as number[],
      index: op.index,
    }));
}

/**
 * Verify that two numbers are close (for floating point comparison)
 */
export function expectClose(
  actual: number,
  expected: number,
  tolerance = 0.01
): boolean {
  return Math.abs(actual - expected) < tolerance;
}

/**
 * Extract scale from transformation matrix
 */
export function extractScaleFromMatrix(
  matrix: number[]
): { scaleX: number; scaleY: number } {
  const [a, b, c, d] = matrix;
  return {
    scaleX: Math.sqrt(a * a + b * b),
    scaleY: Math.sqrt(c * c + d * d),
  };
}

/**
 * Extract rotation angle from transformation matrix (in degrees)
 */
export function extractRotationFromMatrix(matrix: number[]): number {
  const [a, b] = matrix;
  const angleRad = Math.atan2(b, a);
  const angleDeg = angleRad * (180 / Math.PI);
  return ((angleDeg % 360) + 360) % 360;
}
