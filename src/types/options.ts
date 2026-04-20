/**
 * Type definitions for converter configuration and options.
 */

import type { FabricObject } from './fabric';

// ============================================================================
// Font Types
// ============================================================================

/**
 * Font variant bytes for different weights/styles.
 */
export interface FontVariants {
  regular?: ArrayBuffer | Uint8Array;
  bold?: ArrayBuffer | Uint8Array;
  italic?: ArrayBuffer | Uint8Array;
  boldItalic?: ArrayBuffer | Uint8Array;
}

/**
 * Registry mapping font family names to their variant files.
 */
export type FontRegistry = Record<string, FontVariants>;

// ============================================================================
// Image Resolution
// ============================================================================

/**
 * Function to resolve image URLs to byte arrays.
 * Called for each image object to fetch its source data.
 */
export type ImageResolver = (src: string) => Promise<ArrayBuffer | Uint8Array>;

// ============================================================================
// Margin Configuration
// ============================================================================

/**
 * Page margin configuration.
 */
export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ============================================================================
// Warning Types
// ============================================================================

/**
 * Types of conversion warnings.
 */
export type WarningType =
  | 'unsupported_feature'
  | 'fallback_applied'
  | 'font_missing'
  | 'image_failed';

/**
 * Strategy for handling unsupported features.
 */
export type UnsupportedStrategy = 'warn' | 'skip' | 'error' | 'rasterize';

/**
 * Structured warning from the conversion process.
 */
export interface ConversionWarning {
  /** Category of warning */
  type: WarningType;

  /** Fabric object type that triggered the warning */
  objectType: string;

  /** Index of the object in the canvas objects array */
  objectIndex: number;

  /** Specific feature that is unsupported or caused the warning */
  feature: string;

  /** Human-readable description */
  message: string;
}

/**
 * Callback function for handling warnings during conversion.
 */
export type WarningHandler = (warning: ConversionWarning) => void;

// ============================================================================
// Converter Options
// ============================================================================

/**
 * Options for the Fabric to PDF converter.
 */
export interface ConverterOptions {
  /**
   * Page width in PDF points (1/72 inch).
   * @default Auto-detected from canvas width or 595.28 (A4)
   */
  pageWidth?: number;

  /**
   * Page height in PDF points (1/72 inch).
   * @default Auto-detected from canvas height or 841.89 (A4)
   */
  pageHeight?: number;

  /**
   * Scale factor for converting pixels to PDF points.
   * @default 1
   */
  scale?: number;

  /**
   * Font registry for custom font embedding.
   * Maps font family names to TTF/OTF file bytes.
   */
  fonts?: FontRegistry;

  /**
   * Default font family to use when a requested font is not found.
   * @default 'Helvetica'
   */
  defaultFont?: string;

  /**
   * Function to resolve image URLs to byte arrays.
   * Required for converting image objects with external URLs.
   */
  imageResolver?: ImageResolver;

  /**
   * Strategy for handling unsupported features.
   * - 'warn': Emit warning and skip the feature (default)
   * - 'skip': Silently skip the feature
   * - 'error': Throw an error
   * - 'rasterize': Fall back to rasterizing the object
   */
  onUnsupported?: UnsupportedStrategy;

  /**
   * Callback for handling conversion warnings.
   * Called whenever a warning is generated during conversion.
   */
  onWarning?: WarningHandler;

  /**
   * Background color for the PDF page.
   * Applied before rendering canvas objects.
   */
  backgroundColor?: string;

  /**
   * Page margins in PDF points.
   * Shifts the rendering origin by the margin amounts.
   */
  margin?: Partial<MarginConfig>;

  /**
   * Maximum recursion depth for nested groups.
   * Prevents stack overflow from malicious or deeply nested JSON.
   * @default 20
   */
  maxGroupDepth?: number;
}

// ============================================================================
// Resolved Options (Internal)
// ============================================================================

/**
 * Converter options with all defaults applied.
 * Used internally after resolving user-provided options.
 */
export interface ResolvedConverterOptions
  extends Required<
    Pick<
      ConverterOptions,
      | 'pageWidth'
      | 'pageHeight'
      | 'scale'
      | 'defaultFont'
      | 'onUnsupported'
      | 'maxGroupDepth'
    >
  > {
  fonts: FontRegistry;
  imageResolver?: ImageResolver;
  onWarning?: WarningHandler;
  backgroundColor?: string;
  margin: MarginConfig;
}

// ============================================================================
// Page Options (Advanced API)
// ============================================================================

/**
 * Per-page options for the advanced converter API.
 */
export interface PageOptions {
  /** Page width in PDF points */
  width?: number;

  /** Page height in PDF points */
  height?: number;

  /** Background color for this specific page */
  backgroundColor?: string;

  /** Scale factor for this page */
  scale?: number;
}

// ============================================================================
// Conversion Result
// ============================================================================

/**
 * Result of a successful conversion.
 */
export interface ConversionResult {
  /** The generated PDF as a byte array */
  pdfBytes: Uint8Array;

  /** All warnings generated during conversion */
  warnings: ConversionWarning[];
}
