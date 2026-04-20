import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type {
  FabricCanvasJSON,
  FabricObject,
  ConverterOptions,
  ResolvedConverterOptions,
  ConversionResult,
  MarginConfig,
  RenderContext,
  FabricRectObject,
} from '../types';
import { InvalidInputError } from '../errors';
import { createDefaultRegistry } from '../renderers/registry';
import { FontManager } from '../fonts/font-manager';
import { ImageLoader } from '../images/image-loader';
import { WarningCollector } from '../errors/warnings';
import { applyTransformations } from '../transform';

// A4 dimensions in PDF points (72 points per inch)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

// Default margin configuration
const DEFAULT_MARGIN: MarginConfig = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * Parses and validates Fabric.js canvas JSON input.
 *
 * @param input - The canvas JSON (object or string)
 * @returns Validated FabricCanvasJSON object
 * @throws InvalidInputError if input is invalid
 */
export function parseCanvasJSON(input: unknown): FabricCanvasJSON {
  // Handle null/undefined
  if (input === null || input === undefined) {
    throw new InvalidInputError('Canvas JSON is null or undefined');
  }

  // Parse string input
  let parsed: unknown;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      throw new InvalidInputError('Invalid JSON string provided');
    }
  } else {
    parsed = input;
  }

  // Validate it's an object
  if (typeof parsed !== 'object' || parsed === null) {
    throw new InvalidInputError('Canvas JSON must be an object');
  }

  const canvasObj = parsed as Record<string, unknown>;

  // Validate objects array exists
  if (!('objects' in canvasObj)) {
    throw new InvalidInputError('Canvas JSON missing "objects" array');
  }

  const objects = canvasObj.objects;
  if (!Array.isArray(objects)) {
    throw new InvalidInputError('Canvas "objects" must be an array');
  }

  // Validate each object has a type
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (typeof obj !== 'object' || obj === null) {
      throw new InvalidInputError(`Object at index ${i} is not an object`);
    }
    if (!('type' in obj)) {
      throw new InvalidInputError(`Object at index ${i} missing "type" property`);
    }
  }

  return canvasObj as unknown as FabricCanvasJSON;
}

/**
 * Resolves user-provided options with defaults.
 *
 * @param options - User-provided options
 * @param canvasJSON - The parsed canvas JSON (for auto-detecting dimensions)
 * @returns Resolved options with all defaults applied
 */
export function resolveOptions(
  options: ConverterOptions = {},
  canvasJSON?: FabricCanvasJSON,
): ResolvedConverterOptions {
  // Determine page dimensions
  const pageWidth = options.pageWidth ?? canvasJSON?.width ?? A4_WIDTH;
  const pageHeight = options.pageHeight ?? canvasJSON?.height ?? A4_HEIGHT;

  // Resolve margin configuration
  const margin: MarginConfig = {
    top: options.margin?.top ?? DEFAULT_MARGIN.top,
    right: options.margin?.right ?? DEFAULT_MARGIN.right,
    bottom: options.margin?.bottom ?? DEFAULT_MARGIN.bottom,
    left: options.margin?.left ?? DEFAULT_MARGIN.left,
  };

  return {
    pageWidth,
    pageHeight,
    scale: options.scale ?? 1,
    fonts: options.fonts ?? {},
    defaultFont: options.defaultFont ?? 'Helvetica',
    imageResolver: options.imageResolver,
    onUnsupported: options.onUnsupported ?? 'warn',
    onWarning: options.onWarning,
    backgroundColor: options.backgroundColor,
    margin,
    maxGroupDepth: options.maxGroupDepth ?? 20,
  };
}

/**
 * Renders a single Fabric object to the PDF page.
 *
 * @param obj - The Fabric object to render
 * @param page - The PDF page
 * @param context - The render context
 * @param registry - The renderer registry
 */
async function renderObject(
  obj: FabricObject,
  page: PDFPage,
  context: RenderContext,
): Promise<void> {
  // Skip invisible objects
  if (obj.visible === false) {
    return;
  }

  // Find a renderer for this object type
  const renderer = context.registry.get(obj.type);
  if (!renderer) {
    if (context.options.onUnsupported === 'warn') {
      context.warnings.add({
        type: 'unsupported_feature',
        objectType: obj.type,
        objectIndex: -1,
        feature: 'object_type',
        message: `Unsupported object type: ${obj.type}`,
      });
    } else if (context.options.onUnsupported === 'error') {
      throw new InvalidInputError(`Unsupported object type: ${obj.type}`);
    }
    return;
  }

  // Apply transformations (position, scale, rotation, skew)
  // This modifies the page's transformation matrix
  applyTransformations(obj, page, context);

  // Render the object
  await renderer.render(obj, page, context);
}

/**
 * Converts a Fabric.js canvas JSON to a PDF document.
 *
 * @param canvasJSON - The parsed and validated canvas JSON
 * @param options - Resolved converter options
 * @returns Conversion result with PDF bytes and warnings
 */
export async function convertCanvasToPdf(
  canvasJSON: FabricCanvasJSON,
  options: ResolvedConverterOptions,
): Promise<ConversionResult> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Add a page with specified dimensions
  const page = pdfDoc.addPage([options.pageWidth, options.pageHeight]);

  // Set up font manager (fontRegistry, defaultFont, pdfDoc)
  const fontManager = new FontManager(options.fonts, options.defaultFont, pdfDoc);

  // Set up image loader (imageResolver, pdfDoc)
  const imageLoader = new ImageLoader(options.imageResolver, pdfDoc);

  // Set up warning collector
  const warnings = new WarningCollector();

  // Create renderer registry
  const registry = createDefaultRegistry();

  // Create render context
  const context: RenderContext = {
    pdfDoc,
    page,
    fontManager,
    imageLoader,
    options,
    warnings,
    registry,
    renderObject: async (obj: FabricObject) => {
      await renderObject(obj, page, context);
    },
    currentDepth: 0,
  };

  // Apply background color if specified
  if (options.backgroundColor) {
    const bgColor = parseColor(options.backgroundColor);
    if (bgColor) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: options.pageWidth,
        height: options.pageHeight,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }
  }

  // Render all objects in order
  // Note: Margins are handled by the transformation system
  for (const obj of canvasJSON.objects) {
    await renderObject(obj as FabricObject, page, context);
  }

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();

  return {
    pdfBytes,
    warnings: warnings.getAll(),
  };
}

// Helper function to parse color (imported from color module)
import { parseColor } from '../color';
