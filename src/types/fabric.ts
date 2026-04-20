/**
 * Type definitions for Fabric.js JSON serialization format.
 * These types represent the output of canvas.toJSON() and object.toObject() methods.
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Supported origin values for object positioning.
 */
export type OriginX = 'left' | 'center' | 'right';
export type OriginY = 'top' | 'center' | 'bottom';

/**
 * Stroke line cap styles.
 */
export type StrokeLineCap = 'butt' | 'round' | 'square';

/**
 * Stroke line join styles.
 */
export type StrokeLineJoin = 'miter' | 'round' | 'bevel';

/**
 * Text alignment options.
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * Font weight values.
 */
export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | number;

/**
 * Font style values.
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';

// ============================================================================
// Gradient and Pattern Types
// ============================================================================

/**
 * Color stop for gradients.
 */
export interface GradientColorStop {
  offset: number;
  color: string;
  opacity?: number;
}

/**
 * Linear gradient configuration.
 */
export interface LinearGradient {
  type: 'linear';
  coords: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  colorStops: GradientColorStop[];
  offsetX?: number;
  offsetY?: number;
  gradientTransform?: number[] | null;
}

/**
 * Radial gradient configuration.
 */
export interface RadialGradient {
  type: 'radial';
  coords: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    r1: number;
    r2: number;
  };
  colorStops: GradientColorStop[];
  offsetX?: number;
  offsetY?: number;
  gradientTransform?: number[] | null;
}

/**
 * Gradient type union.
 */
export type FabricGradient = LinearGradient | RadialGradient;

/**
 * Pattern fill configuration.
 */
export interface FabricPattern {
  type: 'pattern';
  source: string;
  repeat: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
  offsetX?: number;
  offsetY?: number;
  patternTransform?: number[] | null;
}

// ============================================================================
// Shadow Type
// ============================================================================

/**
 * Shadow configuration for objects.
 */
export interface FabricShadow {
  color?: string;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
  affectStroke?: boolean;
  nonScaling?: boolean;
}

// ============================================================================
// Path Command Types
// ============================================================================

/**
 * SVG path command types.
 */
export type PathCommandType =
  | 'M' | 'L' | 'H' | 'V' | 'C' | 'S' | 'Q' | 'T' | 'A' | 'Z'
  | 'm' | 'l' | 'h' | 'v' | 'c' | 's' | 'q' | 't' | 'a' | 'z';

/**
 * SVG path command as array: [command, ...args].
 */
export type PathCommand = [PathCommandType, ...number[]];

// ============================================================================
// Text Style Types
// ============================================================================

/**
 * Per-character text style properties.
 */
export interface FabricTextStyle {
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  underline?: boolean;
  linethrough?: boolean;
  overline?: boolean;
  textBackgroundColor?: string;
}

/**
 * Text styles organized by line and character index.
 * Structure: { [lineIndex]: { [charIndex]: style } }
 */
export interface FabricTextStyles {
  [lineIndex: string]: {
    [charIndex: string]: FabricTextStyle;
  };
}

// ============================================================================
// Base Object Properties
// ============================================================================

/**
 * Properties common to all Fabric.js objects.
 */
export interface FabricObjectBase {
  /** Object type identifier */
  type: string;

  // Position and dimensions
  left: number;
  top: number;
  width: number;
  height: number;

  // Transform properties
  scaleX: number;
  scaleY: number;
  angle: number;
  skewX: number;
  skewY: number;
  flipX: boolean;
  flipY: boolean;

  // Origin points
  originX: OriginX;
  originY: OriginY;

  // Appearance
  fill: string | FabricGradient | FabricPattern | null;
  stroke: string | null;
  strokeWidth: number;
  strokeDashArray: number[] | null;
  strokeLineCap: StrokeLineCap;
  strokeLineJoin: StrokeLineJoin;
  strokeMiterLimit: number;
  strokeUniform: boolean;

  // Opacity and visibility
  opacity: number;
  visible: boolean;

  // Effects
  shadow: FabricShadow | null;

  // Clipping
  clipPath?: FabricObject;

  // Compositing
  globalCompositeOperation: string;

  // Metadata
  id?: string;
  name?: string;
  data?: unknown;
}

// ============================================================================
// Specific Object Types
// ============================================================================

/**
 * Rectangle object properties.
 */
export interface FabricRectObject extends FabricObjectBase {
  type: 'rect';
  rx: number;
  ry: number;
}

/**
 * Circle object properties.
 */
export interface FabricCircleObject extends FabricObjectBase {
  type: 'circle';
  radius: number;
  startAngle: number;
  endAngle: number;
}

/**
 * Ellipse object properties.
 */
export interface FabricEllipseObject extends FabricObjectBase {
  type: 'ellipse';
  rx: number;
  ry: number;
}

/**
 * Triangle object properties.
 */
export interface FabricTriangleObject extends FabricObjectBase {
  type: 'triangle';
}

/**
 * Line object properties.
 */
export interface FabricLineObject extends FabricObjectBase {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Point for polylines and polygons.
 */
export interface FabricPoint {
  x: number;
  y: number;
}

/**
 * Polyline object properties.
 */
export interface FabricPolylineObject extends FabricObjectBase {
  type: 'polyline';
  points: FabricPoint[];
}

/**
 * Polygon object properties.
 */
export interface FabricPolygonObject extends FabricObjectBase {
  type: 'polygon';
  points: FabricPoint[];
}

/**
 * Path object properties.
 */
export interface FabricPathObject extends FabricObjectBase {
  type: 'path';
  path: PathCommand[];
}

/**
 * Image filter (simplified representation).
 */
export interface FabricImageFilter {
  type: string;
  [key: string]: unknown;
}

/**
 * Image object properties.
 */
export interface FabricImageObject extends FabricObjectBase {
  type: 'image';
  src: string;
  cropX: number;
  cropY: number;
  filters: FabricImageFilter[];
  resizeFilter?: FabricImageFilter | null;
  crossOrigin?: string | null;
  alignX: 'none' | 'mid' | 'min' | 'max';
  alignY: 'none' | 'mid' | 'min' | 'max';
  meetOrSlice: 'meet' | 'slice';
}

/**
 * Base text object properties.
 */
export interface FabricTextBase extends FabricObjectBase {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  lineHeight: number;
  textAlign: TextAlign;
  textBackgroundColor: string | null;
  charSpacing: number;
  styles: FabricTextStyles;

  // Decorations
  underline: boolean;
  linethrough: boolean;
  overline: boolean;
}

/**
 * Static text object properties.
 */
export interface FabricTextObject extends FabricTextBase {
  type: 'text';
}

/**
 * Interactive text (IText) object properties.
 */
export interface FabricITextObject extends FabricTextBase {
  type: 'i-text';
}

/**
 * Textbox object properties.
 */
export interface FabricTextboxObject extends FabricTextBase {
  type: 'textbox';
  minWidth: number;
  dynamicMinWidth: number;
  splitByGrapheme: boolean;
}

/**
 * Group object properties.
 */
export interface FabricGroupObject extends FabricObjectBase {
  type: 'group';
  objects: FabricObject[];
  layout?: string;
  subTargetCheck?: boolean;
  interactive?: boolean;
}

// ============================================================================
// Object Union Type
// ============================================================================

/**
 * Discriminated union of all Fabric object types.
 */
export type FabricObject =
  | FabricRectObject
  | FabricCircleObject
  | FabricEllipseObject
  | FabricTriangleObject
  | FabricLineObject
  | FabricPolylineObject
  | FabricPolygonObject
  | FabricPathObject
  | FabricImageObject
  | FabricTextObject
  | FabricITextObject
  | FabricTextboxObject
  | FabricGroupObject;

// ============================================================================
// Canvas JSON Type
// ============================================================================

/**
 * Background image object for canvas.
 */
export interface FabricBackgroundImage extends FabricImageObject {
  overlay?: boolean;
}

/**
 * Top-level canvas JSON structure from canvas.toJSON().
 */
export interface FabricCanvasJSON {
  version: string;
  objects: FabricObject[];
  background?: string | FabricGradient | FabricPattern | null;
  backgroundImage?: FabricBackgroundImage | null;
  overlay?: string | FabricGradient | FabricPattern | null;
  overlayImage?: FabricBackgroundImage | null;
  width?: number;
  height?: number;
}
