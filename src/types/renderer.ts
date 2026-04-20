/**
 * Type definitions for renderer interfaces and context.
 */

import type { PDFDocument, PDFPage, PDFFont, PDFImage, RGB } from 'pdf-lib';
import type { FabricObject } from './fabric';
import type { ResolvedConverterOptions, ConversionWarning } from './options';

// ============================================================================
// Color Types
// ============================================================================

/**
 * Color result from parsing a Fabric color string.
 */
export interface ColorResult {
  /** Red component (0-1) */
  r: number;
  /** Green component (0-1) */
  g: number;
  /** Blue component (0-1) */
  b: number;
  /** Alpha component (0-1) */
  a: number;
}

/**
 * Resolved color ready for PDF rendering.
 */
export interface ResolvedColor {
  /** PDF color object or null for transparent */
  pdfColor: RGB | null;
  /** Opacity value (0-1) */
  opacity: number;
}

// ============================================================================
// Transform Types
// ============================================================================

/**
 * 6-element affine transformation matrix [a, b, c, d, e, f].
 * Represents the transformation:
 *   x' = a*x + c*y + e
 *   y' = b*x + d*y + f
 */
export type TransformMatrix = [number, number, number, number, number, number];

/**
 * 2D point coordinates.
 */
export interface Point {
  x: number;
  y: number;
}

// ============================================================================
// Font Manager Interface
// ============================================================================

/**
 * Interface for font resolution and embedding.
 */
export interface FontManager {
  /**
   * Resolve and embed a font for use in PDF rendering.
   * @param fontFamily - Font family name
   * @param fontWeight - Font weight (normal, bold, etc.)
   * @param fontStyle - Font style (normal, italic, etc.)
   * @returns Promise resolving to the embedded PDF font
   */
  resolve(
    fontFamily: string,
    fontWeight: string | number,
    fontStyle: string,
  ): Promise<PDFFont>;

  /**
   * Get an already-embedded font from the cache.
   * @param key - Cache key (family:weight:style)
   * @returns The cached PDF font or undefined
   */
  getEmbeddedFont(key: string): PDFFont | undefined;
}

// ============================================================================
// Image Loader Interface
// ============================================================================

/**
 * Interface for image loading and embedding.
 */
export interface ImageLoader {
  /**
   * Load and embed an image from a source URL.
   * @param src - Image source URL or data URL
   * @returns Promise resolving to the embedded PDF image
   */
  load(src: string): Promise<PDFImage>;
}

// ============================================================================
// Warning Collector Interface
// ============================================================================

/**
 * Interface for collecting conversion warnings.
 */
export interface WarningCollector {
  /**
   * Add a warning to the collection.
   * @param warning - The warning to add
   */
  add(warning: ConversionWarning): void;

  /**
   * Get all collected warnings.
   * @returns Array of all warnings
   */
  getAll(): ConversionWarning[];

  /**
   * Check if any warnings have been collected.
   * @returns True if warnings exist
   */
  hasWarnings(): boolean;
}

// ============================================================================
// Render Context
// ============================================================================

/**
 * Context passed to every renderer during conversion.
 * Provides access to shared state and utilities.
 */
export interface RenderContext {
  /** The PDF document being generated */
  pdfDoc: PDFDocument;

  /** The current PDF page being rendered to */
  page: PDFPage;

  /** Font manager for resolving and embedding fonts */
  fontManager: FontManager;

  /** Image loader for resolving and embedding images */
  imageLoader: ImageLoader;

  /** Resolved converter options with defaults applied */
  options: ResolvedConverterOptions;

  /** Warning collector for reporting non-fatal issues */
  warnings: WarningCollector;

  /**
   * Recursively render a Fabric object.
   * Used by group renderer to render child objects.
   * @param obj - The object to render
   */
  renderObject(obj: FabricObject): Promise<void>;

  /** Current nesting depth for group recursion tracking */
  currentDepth: number;
}

// ============================================================================
// Object Renderer Interface
// ============================================================================

/**
 * Interface that all object renderers must implement.
 * Each renderer handles one Fabric.js object type.
 */
export interface ObjectRenderer {
  /**
   * The Fabric.js object type this renderer handles.
   * Must match the `type` property on Fabric objects.
   */
  readonly type: string;

  /**
   * Check if this renderer can handle the given object.
   * @param obj - The Fabric object to check
   * @returns True if this renderer can render the object
   */
  canRender(obj: FabricObject): boolean;

  /**
   * Render the object to the PDF page.
   * @param obj - The Fabric object to render
   * @param page - The PDF page to render to
   * @param context - Shared rendering context
   */
  render(
    obj: FabricObject,
    page: PDFPage,
    context: RenderContext,
  ): void | Promise<void>;
}

// ============================================================================
// Renderer Registry Interface
// ============================================================================

/**
 * Interface for renderer registry.
 * Maps object type strings to their renderers.
 */
export interface RendererRegistry {
  /**
   * Register a renderer for its type.
   * @param renderer - The renderer to register
   */
  register(renderer: ObjectRenderer): void;

  /**
   * Get the renderer for a specific object type.
   * @param type - The object type string
   * @returns The renderer or undefined if not found
   */
  get(type: string): ObjectRenderer | undefined;

  /**
   * Check if a renderer exists for a type.
   * @param type - The object type string
   * @returns True if a renderer is registered
   */
  has(type: string): boolean;

  /**
   * Get all registered renderers.
   * @returns Map of type to renderer
   */
  getAll(): Map<string, ObjectRenderer>;
}
