// Transform utilities: matrix math, coordinate conversion, origin resolution

import { concatTransformationMatrix } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { FabricObject, RenderContext, TransformMatrix } from '../types';
import { multiplyMatrices } from './matrix';
import { resolveOriginOffset } from './origin';

/**
 * Applies Fabric.js object transformations to the PDF page.
 *
 * COORDINATE CONTRACT
 * -------------------
 * After this function runs, subsequent drawing operators execute in a
 * "canvas-local" coordinate frame with:
 *   - origin at the object's anchor point (resolved by originX/originY),
 *     expressed in Fabric canvas coordinates,
 *   - +X pointing right (same as Fabric/PDF),
 *   - +Y pointing DOWN (same as Fabric, OPPOSITE of PDF's default),
 *   - 1 unit = 1 Fabric pixel (the global `scale` option converts pixels to PDF points).
 *
 * Renderers MUST draw in this frame. Concretely:
 *   - A rectangle of `width × height` fills the local rect `(0,0) → (w,h)`,
 *     where `(0,0)` is the top-left of the object's bounding box.
 *   - Triangle tip at `y = 0`, base at `y = height`.
 *   - Positive Fabric angle rotates clockwise on screen (matches canvas).
 *
 * Why this frame:
 *   Fabric canvas is Y-down, PDF is Y-up. pdf-lib's primitives use mixed
 *   local conventions (e.g. `drawSvgPath` internally applies `scale(1,-1)`).
 *   Picking a single canvas-Y-down local frame makes every primitive
 *   consistent IF renderers use the provided helpers
 *   (see `src/renderers/draw-helpers.ts`).
 *
 * HOW THE CTM IS BUILT
 * --------------------
 * Combined transform applied to a local point `p` (column vector):
 *
 *   p_pdf =
 *     T(left·s,  H − top·s)        // translate local origin to canvas (left, top) in PDF
 *     × S(s, −s)                   // flip Y + apply global pixels-to-points scale
 *     × R(angle)                   // clockwise visually (in Y-down local frame)
 *     × S(flipX·scaleX, flipY·scaleY)
 *     × Skew(skewX, skewY)
 *     × T(originOffset)            // shift local drawing so object anchor sits at local (0,0)
 *     × p
 *
 *   `resolveOriginOffset` returns already-signed values: (-w/2, -h/2) for
 *   center origin, (0, 0) for left/top, (-w, -h) for right/bottom, etc.
 *   We apply them as a translation directly — that shift brings the
 *   anchor (the point Fabric measures `left`/`top` from) to local (0, 0).
 *
 * The outer chunk (T × S(s, −s)) is emitted as one `cm` op; the object-level
 * chunk (R × S × Skew × T(originOffset)) is built as a single matrix and
 * emitted as a second `cm` op. pdf-lib concatenates both onto the CTM.
 */
export function applyTransformations(
  obj: FabricObject,
  page: PDFPage,
  context: RenderContext,
): void {
  const globalScale = context.options.scale;
  const pageHeight = context.options.pageHeight;

  // Resolve intrinsic (pre-scale) bbox dimensions used for origin math.
  // Fabric's `width`/`height` already describe the object's intrinsic size;
  // object-level `scaleX`/`scaleY` are applied INSIDE the transform matrix.
  let objWidth = obj.width ?? 0;
  let objHeight = obj.height ?? 0;
  if (obj.type === 'circle') {
    const radius = (obj as { radius?: number }).radius ?? 0;
    objWidth = radius * 2;
    objHeight = radius * 2;
  } else if (obj.type === 'ellipse') {
    const rx = (obj as { rx?: number }).rx ?? 0;
    const ry = (obj as { ry?: number }).ry ?? 0;
    objWidth = rx * 2;
    objHeight = ry * 2;
  }

  // Fabric.js defaults object origins to 'left'/'top'.
  const originX = obj.originX ?? 'left';
  const originY = obj.originY ?? 'top';
  const originOffset = resolveOriginOffset(originX, originY, objWidth, objHeight);

  // --------------------------------------------------------------------------
  // Outer CTM: canvas-local (Y-down, pixel units) → PDF (Y-up, point units)
  //
  //   |  s      0     left·s           |
  //   |  0     −s     H − top·s        |
  //   |  0      0     1                |
  //
  // After this push, drawing at local (0,0) produces a mark at PDF
  // (left·s, H − top·s), which is Fabric canvas (left, top).
  // Drawing at local (0, h) produces a mark at PDF (left·s, H − top·s − h·s),
  // which is Fabric canvas (left, top + h) — the bottom of the object.
  // --------------------------------------------------------------------------
  page.pushOperators(
    concatTransformationMatrix(
      globalScale,
      0,
      0,
      -globalScale,
      obj.left * globalScale,
      pageHeight - obj.top * globalScale,
    ),
  );

  // --------------------------------------------------------------------------
  // Inner object transform, built IN canvas-local space (Y-down, pixels).
  //
  // Point-transform order (first applied to the point is rightmost):
  //   p' = R · S_obj · Skew · T(−origin) · p
  //
  // Built with `multiplyMatrices(m1, m2) = m2 × m1` (i.e. m1 is applied
  // first to the point, so we start with T(−origin) and left-multiply).
  // --------------------------------------------------------------------------

  let matrix: TransformMatrix = [1, 0, 0, 1, originOffset.x, originOffset.y];

  const skewX = obj.skewX ?? 0;
  const skewY = obj.skewY ?? 0;
  if (skewX !== 0 || skewY !== 0) {
    const tanSkewX = Math.tan((skewX * Math.PI) / 180);
    const tanSkewY = Math.tan((skewY * Math.PI) / 180);
    matrix = multiplyMatrices(matrix, [1, tanSkewY, tanSkewX, 1, 0, 0]);
  }

  const scaleXRaw = obj.scaleX ?? 1;
  const scaleYRaw = obj.scaleY ?? 1;
  const scaleX = obj.flipX ? -scaleXRaw : scaleXRaw;
  const scaleY = obj.flipY ? -scaleYRaw : scaleYRaw;
  if (scaleX !== 1 || scaleY !== 1) {
    matrix = multiplyMatrices(matrix, [scaleX, 0, 0, scaleY, 0, 0]);
  }

  const angle = obj.angle ?? 0;
  if (angle !== 0) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Standard math rotation matrix.
    // In a Y-UP frame this is CCW; in our Y-DOWN local frame it is CW visually,
    // which matches Fabric.js's positive-angle-is-clockwise convention.
    matrix = multiplyMatrices(matrix, [cos, sin, -sin, cos, 0, 0]);
  }

  const [a, b, c, d, e, f] = matrix;
  page.pushOperators(concatTransformationMatrix(a, b, c, d, e, f));
}

// Re-export all transform utilities
export * from './matrix';
export * from './coordinate';
export * from './origin';
