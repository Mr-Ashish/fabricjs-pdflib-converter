import type { TransformMatrix, Point } from '../types';

/**
 * Returns the identity transformation matrix.
 * [1, 0, 0, 1, 0, 0] represents no transformation.
 */
export function identityMatrix(): TransformMatrix {
  return [1, 0, 0, 1, 0, 0];
}

/**
 * Multiplies two transformation matrices.
 * The result represents applying m1 first, then m2 to a point.
 * Mathematically: result = m2 × m1 (m1 applied first, then m2)
 */
export function multiplyMatrices(
  m1: TransformMatrix,
  m2: TransformMatrix,
): TransformMatrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;

  // result = m2 × m1 (apply m1 first, then m2)
  return [
    a2 * a1 + c2 * b1, // a
    b2 * a1 + d2 * b1, // b
    a2 * c1 + c2 * d1, // c
    b2 * c1 + d2 * d1, // d
    a2 * e1 + c2 * f1 + e2, // e
    b2 * e1 + d2 * f1 + f2, // f
  ];
}

/**
 * Options for composing a transformation matrix.
 */
export interface ComposeMatrixOptions {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  skewX?: number;
  skewY?: number;
  flipX?: boolean;
  flipY?: boolean;
}

/**
 * Composes a transformation matrix from individual transform properties.
 * Applies transforms in Fabric.js order: skew -> scale -> rotate -> translate
 */
export function composeMatrix(options: ComposeMatrixOptions): TransformMatrix {
  const {
    translateX = 0,
    translateY = 0,
    scaleX = 1,
    scaleY = 1,
    angle = 0,
    skewX = 0,
    skewY = 0,
    flipX = false,
    flipY = false,
  } = options;

  // Apply flips as negative scale
  const effectiveScaleX = flipX ? -scaleX : scaleX;
  const effectiveScaleY = flipY ? -scaleY : scaleY;

  // Convert angle to radians
  const rad = degreesToRadians(angle);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Skew values (tan of skew angle)
  const skewXRad = degreesToRadians(skewX);
  const skewYRad = degreesToRadians(skewY);
  const tanSkewX = Math.tan(skewXRad);
  const tanSkewY = Math.tan(skewYRad);

  // Transform order applied to point: skewX -> skewY -> scale -> rotate -> translate
  // Point transform: p' = T × R × S × skewY × skewX × p
  // Build matrix: M = T × R × S × skewY × skewX
  // Using multiplyMatrices(a, b) = b × a, we left-multiply each new transform

  // Start with identity
  let matrix: TransformMatrix = identityMatrix();

  // Left-multiply by translate (applied last)
  if (translateX !== 0 || translateY !== 0) {
    matrix = multiplyMatrices([1, 0, 0, 1, translateX, translateY], matrix);
  }

  // Left-multiply by rotate
  if (angle !== 0) {
    matrix = multiplyMatrices([cos, sin, -sin, cos, 0, 0], matrix);
  }

  // Left-multiply by scale
  if (effectiveScaleX !== 1 || effectiveScaleY !== 1) {
    matrix = multiplyMatrices([effectiveScaleX, 0, 0, effectiveScaleY, 0, 0], matrix);
  }

  // Left-multiply by skewY
  if (skewY !== 0) {
    matrix = multiplyMatrices([1, tanSkewY, 0, 1, 0, 0], matrix);
  }

  // Left-multiply by skewX (applied first to point)
  if (skewX !== 0) {
    matrix = multiplyMatrices([1, 0, tanSkewX, 1, 0, 0], matrix);
  }

  return matrix;
}

/**
 * Transforms a point using a transformation matrix.
 * Returns a new point without mutating the input.
 */
export function transformPoint(point: Point, matrix: TransformMatrix): Point {
  const [a, b, c, d, e, f] = matrix;
  const { x, y } = point;

  return {
    x: a * x + c * y + e,
    y: b * x + d * y + f,
  };
}

/**
 * Inverts a transformation matrix.
 * The inverse of matrix M is M^-1 such that M × M^-1 = I (identity).
 */
export function invertMatrix(matrix: TransformMatrix): TransformMatrix {
  const [a, b, c, d, e, f] = matrix;

  // Calculate determinant: ad - bc
  const det = a * d - b * c;

  if (Math.abs(det) < 1e-10) {
    // Singular matrix (not invertible), return identity as fallback
    return identityMatrix();
  }

  const invDet = 1 / det;

  // Inverse of 2x3 affine matrix:
  // [a c e]^-1   [ d/det  -c/det  (cf - de)/det]
  // [b d f]    = [-b/det   a/det  (bf - ae)/det]
  return [
    d * invDet, // a'
    -b * invDet, // b'
    -c * invDet, // c'
    a * invDet, // d'
    (c * f - d * e) * invDet, // e'
    (b * e - a * f) * invDet, // f'
  ];
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
