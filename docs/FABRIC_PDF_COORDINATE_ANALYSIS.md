# Fabric.js vs PDF-lib Coordinate System Analysis

## Goal
Make PDF output exactly match Fabric.js canvas rendering.

---

## 1. Fabric.js Coordinate System

### Canvas Coordinates
- **Origin (0, 0)**: Top-left corner of canvas
- **X-axis**: Increases to the right (0 → canvas.width)
- **Y-axis**: Increases downward (0 → canvas.height)
- **Units**: Pixels

### Object Positioning
```typescript
interface FabricObject {
  left: number;      // Distance from canvas left edge to object's originX point
  top: number;       // Distance from canvas top edge to object's originY point
  width: number;     // Object width in pixels
  height: number;    // Object height in pixels
  originX: 'left' | 'center' | 'right';
  originY: 'top' | 'center' | 'bottom';
}
```

### Origin System (CRITICAL)
The `originX`/`originY` properties determine **which point** of the object is at `(left, top)`.

**Default**: `originX: 'center'`, `originY: 'center'`

### Shape-Specific Rendering in Fabric.js

#### Rectangle
- Bounding box center at `(left, top)` for center origin

#### Circle
- Geometric center at `(left, top)`

#### Triangle
- **Centroid** (geometric center, 1/3 from base) at `(left, top)`
- **IMPORTANT**: Not bounding box center!

---

## 2. PDF-lib Coordinate System

### Page Coordinates
- **Origin (0, 0)**: Bottom-left corner of page
- **X-axis**: Increases to the right
- **Y-axis**: Increases upward
- **Units**: Points (1/72 inch)

### Drawing Methods Behavior

| Method | Positioning |
|--------|-------------|
| `drawRectangle` | From corner `(x, y)` extending right/up |
| `drawCircle` | **Centered** at `(x, y)` |
| `drawEllipse` | **Centered** at `(x, y)` |
| `drawSvgPath` | Absolute coordinates + optional offset |

---

## 3. Current Issues

### Issue 1: Triangle Centroid
Fabric.js places triangle's centroid at `(left, top)`, not bounding box center.
Our implementation was using bounding box center, causing Y-offset of `height/6`.

### Issue 2: Circle/Ellipse Centering
pdf-lib centers these shapes, but we apply origin offset in matrix.
This causes double-shifting.

### Issue 3: Inconsistent Drawing Conventions
Different renderers draw at different local coordinates.

---

## 4. Implementation Plan

### Phase 1: Fix Triangle Renderer
Draw from (0,0) with centroid at correct position:
```typescript
// Triangle: centroid at 1/3 from base
// Draw from (0,0), centroid at (width/2, 2*height/3)
const path = `M ${width/2} 0 L 0 ${height} L ${width} ${height} Z`;
```

### Phase 2: Fix Circle/Ellipse
Offset to account for pdf-lib's centering:
```typescript
// Circle: offset by radius so center is at origin after matrix
page.drawCircle({ x: radius, y: radius, size: radius * 2 });
```

### Phase 3: Standardize All Renderers
All renderers draw from (0,0) with shape-specific center offset.

### Phase 4: Visual Regression Tests
Verify exact match with Fabric.js canvas.

---

## Questions for Review

1. **Triangle**: Confirm we should use centroid (1/3 from base) not bbox center?
2. **Circle/Ellipse**: Preferred fix method?
3. **Text**: How does Fabric.js baseline work vs pdf-lib?

---

## Demo Update

Added "Copy JSON" button to demo. Use it to copy canvas JSON for testing.
