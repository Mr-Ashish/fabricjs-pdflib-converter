/**
 * Transformation Inspector
 * 
 * Captures and verifies transformation data for debugging positioning/scaling issues.
 * This tool records the complete transformation chain from Fabric.js properties
 * to PDF matrix to drawing commands.
 */

import type { FabricObject, TransformMatrix } from '../types';

export interface TransformationRecord {
  /** Object type (rect, circle, etc.) */
  objectType: string;
  /** Index in the render order */
  objectIndex: number;
  /** Original Fabric.js properties */
  fabricProps: {
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    skewX: number;
    skewY: number;
    originX: string;
    originY: string;
    flipX: boolean;
    flipY: boolean;
  };
  /** Calculated origin offset */
  originOffset: { x: number; y: number };
  /** PDF transformation matrix [a, b, c, d, e, f] */
  pdfMatrix: TransformMatrix;
  /** PDF drawing command */
  drawCommand: {
    method: string;
    args: Record<string, unknown>;
  };
  /** Expected PDF position (calculated) */
  expectedPdfPosition: {
    x: number;
    y: number;
  };
}

export class TransformationInspector {
  records: TransformationRecord[] = [];
  private currentIndex = 0;

  /**
   * Capture a transformation record
   */
  capture(
    obj: FabricObject,
    originOffset: { x: number; y: number },
    matrix: TransformMatrix,
    drawMethod: string,
    drawArgs: Record<string, unknown>,
    pageHeight: number
  ): void {
    // Calculate expected PDF position
    // PDF Y = pageHeight - Fabric Y (origin point)
    const expectedPdfY = pageHeight - obj.top;

    this.records.push({
      objectType: obj.type,
      objectIndex: this.currentIndex++,
      fabricProps: {
        left: obj.left,
        top: obj.top,
        width: obj.width || 0,
        height: obj.height || 0,
        scaleX: obj.scaleX ?? 1,
        scaleY: obj.scaleY ?? 1,
        angle: obj.angle ?? 0,
        skewX: obj.skewX ?? 0,
        skewY: obj.skewY ?? 0,
        originX: obj.originX ?? 'center',
        originY: obj.originY ?? 'center',
        flipX: obj.flipX ?? false,
        flipY: obj.flipY ?? false,
      },
      originOffset,
      pdfMatrix: [...matrix] as TransformMatrix,
      drawCommand: {
        method: drawMethod,
        args: drawArgs,
      },
      expectedPdfPosition: {
        x: obj.left,
        y: expectedPdfY,
      },
    });
  }

  /**
   * Get all recorded transformations
   */
  getRecords(): TransformationRecord[] {
    return [...this.records];
  }

  /**
   * Get a specific record by index
   */
  getRecord(index: number): TransformationRecord | undefined {
    return this.records[index];
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
    this.currentIndex = 0;
  }

  /**
   * Verify that a record's matrix produces the expected translation
   */
  verifyTranslation(
    index: number,
    expectedX: number,
    expectedY: number,
    tolerance = 0.01
  ): boolean {
    const record = this.records[index];
    if (!record) return false;

    const [, , , , tx, ty] = record.pdfMatrix;
    
    const xMatch = Math.abs(tx - expectedX) < tolerance;
    const yMatch = Math.abs(ty - expectedY) < tolerance;

    return xMatch && yMatch;
  }

  /**
   * Verify that a record has the expected scale in its matrix
   */
  verifyScale(
    index: number,
    expectedScaleX: number,
    expectedScaleY: number,
    tolerance = 0.01
  ): boolean {
    const record = this.records[index];
    if (!record) return false;

    const [a, b, c, d] = record.pdfMatrix;
    
    // For pure scale (no rotation): a = scaleX, d = scaleY
    // For scale + rotation: we need to check the determinant
    const actualScaleX = Math.sqrt(a * a + b * b);
    const actualScaleY = Math.sqrt(c * c + d * d);

    const xMatch = Math.abs(actualScaleX - expectedScaleX) < tolerance;
    const yMatch = Math.abs(actualScaleY - expectedScaleY) < tolerance;

    return xMatch && yMatch;
  }

  /**
   * Verify that a record has the expected rotation in its matrix
   */
  verifyRotation(
    index: number,
    expectedAngle: number,
    tolerance = 0.01
  ): boolean {
    const record = this.records[index];
    if (!record) return false;

    const [a, b] = record.pdfMatrix;
    
    // Extract angle from matrix
    // [cos(θ) sin(θ)] 
    // [-sin(θ) cos(θ)]
    const actualAngle = Math.atan2(b, a) * (180 / Math.PI);
    
    // Normalize angles to 0-360
    const normalizedExpected = ((expectedAngle % 360) + 360) % 360;
    const normalizedActual = ((actualAngle % 360) + 360) % 360;

    return Math.abs(normalizedActual - normalizedExpected) < tolerance;
  }

  /**
   * Print a detailed report of all transformations
   */
  printReport(): void {
    console.log('\n=== Transformation Inspector Report ===\n');
    
    for (const record of this.records) {
      console.log(`Object ${record.objectIndex}: ${record.objectType}`);
      console.log('  Fabric Properties:');
      console.log(`    left: ${record.fabricProps.left}, top: ${record.fabricProps.top}`);
      console.log(`    width: ${record.fabricProps.width}, height: ${record.fabricProps.height}`);
      console.log(`    scaleX: ${record.fabricProps.scaleX}, scaleY: ${record.fabricProps.scaleY}`);
      console.log(`    angle: ${record.fabricProps.angle}`);
      console.log(`    originX: ${record.fabricProps.originX}, originY: ${record.fabricProps.originY}`);
      console.log('  Origin Offset:');
      console.log(`    x: ${record.originOffset.x}, y: ${record.originOffset.y}`);
      console.log('  PDF Matrix [a, b, c, d, e, f]:');
      console.log(`    [${record.pdfMatrix.map(n => n.toFixed(4)).join(', ')}]`);
      console.log('  Expected PDF Position:');
      console.log(`    x: ${record.expectedPdfPosition.x}, y: ${record.expectedPdfPosition.y}`);
      console.log('  Draw Command:');
      console.log(`    ${record.drawCommand.method}(${JSON.stringify(record.drawCommand.args)})`);
      console.log('');
    }
    
    console.log('=== End Report ===\n');
  }

  /**
   * Export report as JSON for further analysis
   */
  toJSON(): string {
    return JSON.stringify({
      recordCount: this.records.length,
      records: this.records,
    }, null, 2);
  }
}
