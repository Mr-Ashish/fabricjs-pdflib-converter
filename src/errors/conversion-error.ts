/**
 * Typed error classes for the converter.
 * All errors extend native Error with additional context for debugging.
 */

/**
 * Base error class for conversion failures.
 * Includes context about which object caused the error.
 */
export class ConversionError extends Error {
  /**
   * Creates a new ConversionError.
   * @param message - Error description
   * @param objectIndex - Index of the object in the canvas objects array
   * @param objectType - Type of the Fabric.js object
   */
  constructor(
    message: string,
    public readonly objectIndex: number,
    public readonly objectType: string,
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

/**
 * Error thrown when a requested font cannot be found or loaded.
 */
export class FontNotFoundError extends ConversionError {
  /**
   * Creates a new FontNotFoundError.
   * @param fontFamily - The font family name that was requested
   * @param objectIndex - Index of the text object
   * @param objectType - Type of the object (usually 'text', 'i-text', or 'textbox')
   */
  constructor(
    fontFamily: string,
    objectIndex: number,
    objectType: string,
  ) {
    super(`Font not found: "${fontFamily}"`, objectIndex, objectType);
    this.name = 'FontNotFoundError';
  }
}

/**
 * Error thrown when an image cannot be loaded or embedded.
 */
export class ImageLoadError extends ConversionError {
  /**
   * Creates a new ImageLoadError.
   * @param src - The image source URL or data URL
   * @param objectIndex - Index of the image object
   * @param objectType - Type of the object (usually 'image')
   */
  constructor(
    src: string,
    objectIndex: number,
    objectType: string,
  ) {
    super(`Failed to load image: "${src}"`, objectIndex, objectType);
    this.name = 'ImageLoadError';
  }
}

/**
 * Error thrown when an unsupported feature is encountered.
 */
export class UnsupportedFeatureError extends ConversionError {
  /**
   * Creates a new UnsupportedFeatureError.
   * @param feature - Name of the unsupported feature
   * @param objectIndex - Index of the object with the feature
   * @param objectType - Type of the object
   */
  constructor(
    feature: string,
    objectIndex: number,
    objectType: string,
  ) {
    super(`Unsupported feature: "${feature}"`, objectIndex, objectType);
    this.name = 'UnsupportedFeatureError';
  }
}

/**
 * Error thrown for invalid input to the public API.
 * Used for validation failures at the API boundary.
 */
export class InvalidInputError extends Error {
  /**
   * Creates a new InvalidInputError.
   * @param message - Description of what is invalid
   */
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}
