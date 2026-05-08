import { PDFOperator, PDFNumber } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type {
  FabricObject,
  FabricCircleObject,
  FabricEllipseObject,
  FabricPolygonObject,
  FabricPolylineObject,
  FabricRectObject,
} from '../types';

// Bezier approximation constant for circles: (4/3) * tan(π/8)
const KAPPA = 0.5523;

function op(name: string, ...nums: number[]): PDFOperator {
  return PDFOperator.of(name, nums.map((n) => PDFNumber.of(n)));
}

function traceRect(obj: FabricRectObject, page: PDFPage): void {
  const { left: x, top: y, width: w, height: h } = obj;
  page.pushOperators(
    op('m', x, y),
    op('l', x + w, y),
    op('l', x + w, y + h),
    op('l', x, y + h),
    PDFOperator.of('h', []),
  );
}

function traceCircle(obj: FabricCircleObject, page: PDFPage): void {
  const cx = obj.left + obj.radius;
  const cy = obj.top + obj.radius;
  const r = obj.radius;
  const k = r * KAPPA;
  page.pushOperators(
    op('m', cx, cy - r),
    op('c', cx + k, cy - r, cx + r, cy - k, cx + r, cy),
    op('c', cx + r, cy + k, cx + k, cy + r, cx, cy + r),
    op('c', cx - k, cy + r, cx - r, cy + k, cx - r, cy),
    op('c', cx - r, cy - k, cx - k, cy - r, cx, cy - r),
    PDFOperator.of('h', []),
  );
}

function traceEllipse(obj: FabricEllipseObject, page: PDFPage): void {
  const rx = obj.rx;
  const ry = obj.ry;
  const cx = obj.left + rx;
  const cy = obj.top + ry;
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  page.pushOperators(
    op('m', cx, cy - ry),
    op('c', cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy),
    op('c', cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry),
    op('c', cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy),
    op('c', cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry),
    PDFOperator.of('h', []),
  );
}

function tracePolygon(obj: FabricPolygonObject | FabricPolylineObject, page: PDFPage): void {
  const points = obj.points;
  if (points.length === 0) return;
  const ox = obj.left;
  const oy = obj.top;
  page.pushOperators(op('m', ox + points[0]!.x, oy + points[0]!.y));
  for (let i = 1; i < points.length; i++) {
    page.pushOperators(op('l', ox + points[i]!.x, oy + points[i]!.y));
  }
  page.pushOperators(PDFOperator.of('h', []));
}

export function traceClipPath(clipObj: FabricObject, page: PDFPage): void {
  switch (clipObj.type) {
    case 'rect':
      traceRect(clipObj as FabricRectObject, page);
      break;
    case 'circle':
      traceCircle(clipObj as FabricCircleObject, page);
      break;
    case 'ellipse':
      traceEllipse(clipObj as FabricEllipseObject, page);
      break;
    case 'polygon':
    case 'polyline':
      tracePolygon(clipObj as FabricPolygonObject, page);
      break;
    default:
      return; // Unsupported clip path shape — skip clipping silently
  }

  page.pushOperators(
    PDFOperator.of('W', []),  // clip using nonzero winding rule
    PDFOperator.of('n', []),  // end path without painting
  );
}
