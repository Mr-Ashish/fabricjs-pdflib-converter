/**
 * Visual Regression Testing Utilities
 * 
 * These utilities convert PDFs to PNG images and compare them pixel-by-pixel
 * to verify visual correctness of generated PDFs.
 */

import { pdf } from 'pdf-to-img';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests-external', 'visual', 'temp');
const FIXTURES_DIR = join(process.cwd(), 'tests-external', 'visual', 'fixtures');

// Ensure directories exist
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
if (!existsSync(FIXTURES_DIR)) mkdirSync(FIXTURES_DIR, { recursive: true });

export interface VisualComparisonResult {
  matched: boolean;
  diffPixels: number;
  totalPixels: number;
  diffPercentage: number;
  diffImagePath?: string;
}

export interface PDFToPNGOptions {
  width?: number;
  height?: number;
  page?: number;
}

/**
 * Convert PDF bytes to PNG buffer
 */
export async function pdfToPng(
  pdfBytes: Uint8Array,
  options: PDFToPNGOptions = {}
): Promise<Buffer> {
  const { page = 1 } = options;

  // pdf-to-img returns an async iterator of page images
  const document = await pdf(Buffer.from(pdfBytes), { 
    scale: 1, // 1:1 pixel mapping for easier coordinate verification
  });
  
  let currentPage = 0;
  for await (const image of document) {
    currentPage++;
    if (currentPage === page) {
      return Buffer.from(image);
    }
  }
  
  throw new Error(`Page ${page} not found in PDF`);
}

/**
 * Save PNG buffer to file for debugging
 */
export function savePng(buffer: Buffer, filename: string): string {
  const filepath = join(TEMP_DIR, filename);
  writeFileSync(filepath, buffer);
  return filepath;
}

/**
 * Load fixture PNG for comparison
 */
export function loadFixturePng(filename: string): Buffer | null {
  const filepath = join(FIXTURES_DIR, filename);
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath);
}

/**
 * Save fixture PNG
 */
export function saveFixturePng(buffer: Buffer, filename: string): string {
  const filepath = join(FIXTURES_DIR, filename);
  writeFileSync(filepath, buffer);
  return filepath;
}

/**
 * Compare two PNG buffers pixel-by-pixel
 */
export function comparePngs(
  actual: Buffer,
  expected: Buffer,
  options: { threshold?: number; diffOutputPath?: string } = {}
): VisualComparisonResult {
  const { threshold = 0.1 } = options;

  const actualPng = PNG.sync.read(actual);
  const expectedPng = PNG.sync.read(expected);

  // Ensure same dimensions
  if (actualPng.width !== expectedPng.width || actualPng.height !== expectedPng.height) {
    throw new Error(
      `Image size mismatch: actual ${actualPng.width}x${actualPng.height} vs expected ${expectedPng.width}x${expectedPng.height}`
    );
  }

  const { width, height } = actualPng;
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    actualPng.data,
    expectedPng.data,
    diff.data,
    width,
    height,
    { threshold }
  );

  const totalPixels = width * height;
  const diffPercentage = (diffPixels / totalPixels) * 100;

  let diffImagePath: string | undefined;
  if (diffPixels > 0 && options.diffOutputPath) {
    const diffBuffer = PNG.sync.write(diff);
    diffImagePath = options.diffOutputPath;
    writeFileSync(diffImagePath, diffBuffer);
  }

  return {
    matched: diffPixels === 0,
    diffPixels,
    totalPixels,
    diffPercentage,
    diffImagePath,
  };
}

/**
 * Compare a generated PDF against a fixture
 * If fixture doesn't exist, creates it (baseline mode)
 */
export async function comparePdfToFixture(
  pdfBytes: Uint8Array,
  fixtureName: string,
  options: { 
    threshold?: number; 
    width?: number; 
    height?: number;
    updateFixture?: boolean;
  } = {}
): Promise<VisualComparisonResult> {
  const { threshold = 0.1, width = 800, height = 600, updateFixture = false } = options;
  const fixtureFilename = `${fixtureName}.png`;

  // Convert PDF to PNG
  const actualPng = await pdfToPng(pdfBytes, { width, height });

  // Save actual for debugging
  savePng(actualPng, `${fixtureName}-actual.png`);

  // Check if fixture exists
  const expectedPng = loadFixturePng(fixtureFilename);

  if (!expectedPng || updateFixture) {
    // Create fixture (baseline mode)
    saveFixturePng(actualPng, fixtureFilename);
    return {
      matched: true,
      diffPixels: 0,
      totalPixels: 0,
      diffPercentage: 0,
    };
  }

  // Compare against fixture
  const diffPath = join(TEMP_DIR, `${fixtureName}-diff.png`);
  return comparePngs(actualPng, expectedPng, { threshold, diffOutputPath: diffPath });
}

/**
 * Get pixel color at specific coordinates from PNG buffer
 */
export function getPixelColor(
  pngBuffer: Buffer,
  x: number,
  y: number
): { r: number; g: number; b: number; a: number } | null {
  const png = PNG.sync.read(pngBuffer);
  
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) {
    return null;
  }

  const idx = (png.width * y + x) << 2;
  return {
    r: png.data[idx]!,
    g: png.data[idx + 1]!,
    b: png.data[idx + 2]!,
    a: png.data[idx + 3]!,
  };
}

/**
 * Check if a region has non-white pixels (indicates content)
 */
export function hasContentInRegion(
  pngBuffer: Buffer,
  x: number,
  y: number,
  width: number,
  height: number,
  threshold = 10
): boolean {
  const png = PNG.sync.read(pngBuffer);

  for (let py = y; py < y + height && py < png.height; py++) {
    for (let px = x; px < x + width && px < png.width; px++) {
      const idx = (png.width * py + px) << 2;
      const r = png.data[idx]!;
      const g = png.data[idx + 1]!;
      const b = png.data[idx + 2]!;

      // Check if pixel differs from white
      if (r < 255 - threshold || g < 255 - threshold || b < 255 - threshold) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find bounding box of non-white content in PNG
 */
export function findContentBounds(
  pngBuffer: Buffer,
  threshold = 10
): { x: number; y: number; width: number; height: number } | null {
  const png = PNG.sync.read(pngBuffer);
  let minX = png.width;
  let minY = png.height;
  let maxX = 0;
  let maxY = 0;
  let hasContent = false;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx]!;
      const g = png.data[idx + 1]!;
      const b = png.data[idx + 2]!;

      if (r < 255 - threshold || g < 255 - threshold || b < 255 - threshold) {
        hasContent = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasContent) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
