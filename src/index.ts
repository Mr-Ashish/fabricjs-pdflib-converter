// Public API entry point — re-exports from submodules

// Type definitions
export * from './types';

// Error types
export { ConversionError, InvalidInputError, UnsupportedFeatureError } from './errors';

// Core converter functions
export {
  parseCanvasJSON,
  resolveOptions,
  convertCanvasToPdf,
} from './core/converter';

// Utility functions
export { parseColor } from './color';
export { ptToPx, pxToPt, mmToPt, inchToPt } from './utils/units';

// Font management
export { FontManager } from './fonts/font-manager';
export { STANDARD_FONT_MAP } from './fonts/standard-fonts';

// Renderer registry
export { createDefaultRegistry, RendererRegistryImpl } from './renderers/registry';
export { BaseRenderer } from './renderers/base-renderer';

// Transform utilities
export {
  composeMatrix,
  multiplyMatrices,
  transformPoint,
  invertMatrix,
  identityMatrix,
  degreesToRadians,
  applyTransformations,
} from './transform';

// Path utilities
export {
  pathCommandsToSvg,
  svgPathToPdfOps,
  pointsToSvgPath,
  scalePath,
} from './core/path-utils';
