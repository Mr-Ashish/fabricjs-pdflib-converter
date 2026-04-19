# Canvas-PDFLib Converter — Project Plan

## 1. Project Overview

**Name:** `canvas-pdflib-converter`

**Purpose:** A TypeScript library that converts Fabric.js canvas objects (serialized JSON or live instances) into pdf-lib drawing operations, producing high-fidelity vector PDF documents.

**Why this exists:** Today, the most common way to export a Fabric.js canvas to PDF is rasterization (`toDataURL` → embed as image). This produces blurry prints, unsearchable text, and bloated file sizes. This library bridges Fabric.js's interactive object model to pdf-lib's PDF generation API, preserving vector quality, selectable text, and small file sizes.

**Target users:**
- Developers building design editors, diagram tools, annotation tools, or report builders that use Fabric.js on the frontend and need PDF export.
- Applications that need server-side PDF generation from Fabric.js JSON (Node.js).

---

## 2. Goals and Non-Goals

### Goals
- Convert all standard Fabric.js object types to pdf-lib equivalents with high visual fidelity.
- Preserve vector quality — shapes remain paths, text remains selectable/searchable.
- Handle the coordinate system transformation (Canvas top-left Y-down → PDF bottom-left Y-up) correctly for all transform combinations (rotation, scale, skew, flip, nested groups).
- Support both browser and Node.js environments.
- Provide a simple, well-documented API that takes Fabric.js JSON and outputs PDF bytes.
- Ship as a zero-config library for simple cases, with rich configuration for advanced needs.
- Handle text rendering with font embedding, alignment, and multi-line support.
- Support images (PNG/JPG) with async loading.
- Provide clear warnings or fallback strategies for unsupported features.

### Non-Goals
- Full SVG renderer — we convert Fabric.js objects, not arbitrary SVG documents.
- PDF parsing or editing existing PDFs — this is a generation-only library.
- Replacing pdf-lib — we depend on it, not compete with it.
- Supporting Fabric.js custom subclasses out of the box (but provide an extensibility API for them).
- Pixel-perfect reproduction of every Canvas2D rendering quirk — we aim for high fidelity, not screenshot-level matching.
- Interactive PDF features (form fields, JavaScript actions) — output is static visual content.

---

## 3. Architecture

### 3.1 High-Level Pipeline

```
Input                    Processing                          Output
─────                    ──────────                          ──────
                    ┌──────────────────┐
Fabric.js JSON  ──▶│  1. Parser        │
  (canvas.toJSON()) │  Normalize coords │
                    │  Resolve origins  │
                    │  Build render tree│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  2. Font Manager  │
                    │  Resolve names    │
                    │  Embed TTF/OTF    │
                    │  Cache PDFFont    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  3. Image Loader  │
                    │  Resolve src URLs │
                    │  Detect format    │
                    │  Embed PNG/JPG    │
                    │  Cache PDFImage   │
                    └────────┬─────────┘
                             │
                    ┌────────▼──────────────┐
                    │  4. Renderer           │
                    │  Per-type renderers     │
                    │  Transform engine       │
                    │  Clip path handling     │
                    │  Graphics state mgmt    │
                    └────────┬──────────────┘
                             │
                    ┌────────▼─────────┐
                    │  5. PDFDocument   │──▶  PDF bytes
                    │  (pdf-lib)        │
                    └──────────────────┘
```

### 3.2 Module Breakdown

```
src/
├── index.ts                    # Public API entry point
├── types/
│   ├── fabric.ts               # Fabric.js JSON type definitions
│   ├── options.ts              # Converter options / config types
│   └── renderer.ts             # Renderer interface types
├── core/
│   ├── parser.ts               # JSON parser and normalizer
│   ├── render-tree.ts          # Build ordered render tree from objects
│   └── converter.ts            # Main orchestrator (pipeline controller)
├── transform/
│   ├── matrix.ts               # Matrix math utilities
│   ├── coordinate.ts           # Fabric → PDF coordinate conversion
│   └── origin.ts               # originX/originY resolution
├── fonts/
│   ├── font-manager.ts         # Font registry, embedding, caching
│   ├── font-metrics.ts         # Text measurement helpers
│   └── standard-fonts.ts       # PDF standard font mappings
├── images/
│   ├── image-loader.ts         # Async image resolution and caching
│   └── format-detector.ts      # PNG vs JPG detection from bytes/URL
├── renderers/
│   ├── base-renderer.ts        # Abstract base with shared transform logic
│   ├── rect.renderer.ts        # Rect → drawRectangle
│   ├── circle.renderer.ts      # Circle → drawCircle
│   ├── ellipse.renderer.ts     # Ellipse → drawEllipse
│   ├── triangle.renderer.ts    # Triangle → drawSvgPath (3-point polygon)
│   ├── line.renderer.ts        # Line → drawLine
│   ├── polyline.renderer.ts    # Polyline → drawSvgPath
│   ├── polygon.renderer.ts     # Polygon → drawSvgPath (closed)
│   ├── path.renderer.ts        # Path → drawSvgPath
│   ├── text.renderer.ts        # Text/IText/Textbox → drawText (complex)
│   ├── image.renderer.ts       # Image → embedPng/embedJpg + drawImage
│   └── group.renderer.ts       # Group → recursive render with matrix
├── renderers/registry.ts       # Maps type strings to renderer classes
├── color/
│   └── color.ts                # Fabric color string → pdf-lib rgb/cmyk
├── utils/
│   ├── units.ts                # px ↔ pt conversion
│   ├── svg-path.ts             # Points array → SVG path string
│   ├── dash-pattern.ts         # Stroke dash array conversion
│   └── clip-path.ts            # ClipPath → PDF clip operators
└── errors/
    ├── conversion-error.ts     # Typed error classes
    └── warnings.ts             # Warning collector for unsupported features
```

---

## 4. Coordinate System Transformation

### 4.1 The Y-Axis Flip

Fabric.js: origin at top-left, Y increases downward.
PDF: origin at bottom-left, Y increases upward.

Base conversion:
```
pdfX = fabricX * scale
pdfY = pageHeight - (fabricY * scale)
```

### 4.2 Full Transformation Matrix

Fabric.js stores per-object transforms as: `left`, `top`, `scaleX`, `scaleY`, `angle` (degrees), `skewX`, `skewY` (degrees), `flipX`, `flipY`, `originX`, `originY`.

Fabric's `calcTransformMatrix()` composes these into a 6-element affine matrix `[a, b, c, d, e, f]`. The equivalent in PDF is the `cm` operator via `concatTransformationMatrix(a, b, c, d, e, f)`.

**Conversion strategy:**

1. **From JSON (no live Fabric instance):** Reimplement the matrix composition:
   - Resolve origin offset (translate so that the anchor point sits at `left, top`).
   - Apply: Translate → Rotate → Scale → SkewX → SkewY (matching Fabric's internal order).
   - Compose flip as negative scale.

2. **Apply Y-flip globally:** Before rendering any object, apply a page-level transform that flips Y:
   ```
   concatTransformationMatrix(1, 0, 0, -1, 0, pageHeight)
   ```
   This converts the entire page to a top-left Y-down coordinate system, so Fabric coordinates can be used directly. All subsequent drawing happens in "Fabric space."

   This is the **preferred approach** — it avoids per-object Y-flipping and keeps the math simple. The tradeoff is that text will render upside down unless we counter-flip it (text rendering must apply a local Y-flip to each text draw call).

3. **Per-object approach (alternative):** Convert each object's matrix individually. More verbose but avoids the global text issue. Each renderer wraps its draw calls in:
   ```
   pushGraphicsState()
   concatTransformationMatrix(a, b, c, d, e, f)  // converted matrix
   // draw at local origin
   popGraphicsState()
   ```

**Decision:** Use the **per-object approach** for correctness and simplicity in text handling. The global flip is elegant but creates downstream complexity.

### 4.3 Origin Resolution

Before computing the transform matrix, resolve `originX`/`originY`:

```
originX: 'left'   → offsetX = 0
originX: 'center' → offsetX = -width/2
originX: 'right'  → offsetX = -width

originY: 'top'    → offsetY = 0
originY: 'center' → offsetY = -height/2
originY: 'bottom' → offsetY = -height
```

The object's position (`left`, `top`) refers to where the origin point sits on the canvas. The origin offset shifts the object's geometry relative to that point.

### 4.4 viewportTransform

The canvas may have a `viewportTransform` (zoom/pan). Object positions in `toJSON()` are in **object space** (unaffected by viewport). We ignore `viewportTransform` entirely — we want the true object positions, not the screen positions. This is the correct default. A configuration option can be provided to optionally apply it.

---

## 5. Object Rendering Details

### 5.1 Shapes (Rect, Circle, Ellipse, Triangle, Line)

**Rect:**
- Map `width`, `height`, `rx`, `ry` (corner radius) to `drawRectangle`.
- pdf-lib's `drawRectangle` does not support rounded corners natively → generate an SVG path with arc commands for rounded rects.

**Circle:**
- Map `radius` to `drawCircle`.

**Ellipse:**
- Map `rx`, `ry` to `drawEllipse`.

**Triangle:**
- Fabric's Triangle is an isoceles triangle centered in a bounding box.
- Convert to 3 points → SVG path → `drawSvgPath`.

**Line:**
- Fabric's Line has `x1`, `y1`, `x2`, `y2` relative to bounding box.
- Map to `drawLine`.

**Shared properties for all shapes:**
- `fill` → `color` (parse Fabric color string to `rgb()`)
- `stroke` → `borderColor`
- `strokeWidth` → `borderWidth`
- `opacity` → `opacity`
- `strokeDashArray` → low-level `setDashPattern` operator
- `visible: false` → skip rendering
- `strokeLineCap` → low-level `setLineCap` operator
- `strokeLineJoin` → low-level `setLineJoin` operator

### 5.2 Path, Polyline, Polygon

**Path:**
- Fabric's `path` property is an array of SVG path commands (e.g., `[['M', 0, 0], ['L', 100, 100], ['Q', ...]]`).
- Convert to SVG path string (e.g., `"M 0 0 L 100 100 Q ..."`) → `drawSvgPath`.

**Polyline:**
- Convert `points` array to SVG path: `M x0,y0 L x1,y1 L x2,y2 ...`

**Polygon:**
- Same as polyline but close the path: `... Z`

### 5.3 Text (FabricText, IText, Textbox)

This is the most complex renderer. Broken into sub-problems:

#### 5.3.1 Font Resolution
1. Read `fontFamily` from the Fabric object.
2. Look up in the font registry (user-provided map of name → TTF/OTF bytes).
3. If not found, fall back to `defaultFont` (a PDF standard font like Helvetica).
4. Embed the font via `pdfDoc.embedFont(bytes)` (with fontkit registered).
5. Cache the `PDFFont` instance by family+weight+style key.

#### 5.3.2 Font Style Mapping
- `fontWeight: 'bold'` + `fontStyle: 'italic'` → need the bold-italic variant of the font file.
- The font registry must support variant keys: `{ 'Arial': regular, 'Arial:bold': boldBytes, 'Arial:italic': italicBytes, 'Arial:bold:italic': boldItalicBytes }`.
- If variant not found, fall back to regular (with a warning).

#### 5.3.3 Position & Baseline
- Fabric positions text from the **top of the bounding box** (`top` property).
- pdf-lib positions text from the **baseline** (`y` parameter).
- Conversion: `pdfBaselineY = pageHeight - (fabricTop + ascenderHeight)`.
- `ascenderHeight` comes from `font.heightAtSize(fontSize, { descender: false })`.

#### 5.3.4 Text Alignment
- `textAlign: 'left'` → no offset (default).
- `textAlign: 'center'` → offset each line by `(objectWidth - lineWidth) / 2`.
- `textAlign: 'right'` → offset each line by `(objectWidth - lineWidth)`.
- `textAlign: 'justify'` → complex: calculate extra spacing per word gap. Can be approximated with per-word positioning.

#### 5.3.5 Multi-line Text
- Split text by `\n`.
- Position each line: `lineY = firstLineY - (lineIndex * fontSize * lineHeight)`.
- For `Textbox` with auto-wrapping: re-implement word wrapping using `font.widthOfTextAtSize()` and the object's `width`.

#### 5.3.6 Styled Text (Per-character styles)
- Fabric's `styles` property: `{ "0": { "0": { fill: "red", fontSize: 24 }, "1": { ... } } }` — keyed by `[lineIndex][charIndex]`.
- Parse into "style runs" — consecutive characters with identical styles.
- Render each run as a separate `drawText()` call.
- Track x-position: after each run, advance by `font.widthOfTextAtSize(runText, runFontSize)`.
- Each run may need a different embedded font.

#### 5.3.7 Text Decorations
- `underline: true` → draw a line at baseline - descent offset.
- `linethrough: true` → draw a line at vertical center of text.
- `overline: true` → draw a line at ascender height.
- Line thickness: proportional to fontSize (e.g., fontSize / 20).

#### 5.3.8 Character Spacing
- Fabric's `charSpacing` is in 1/1000 em units.
- pdf-lib has no character spacing option → render each character individually with computed x-offsets, or use the `Tc` PDF operator via `pushOperators`.

### 5.4 Images

#### 5.4.1 Loading
1. Read `src` from the Fabric image object.
2. If data URL: decode base64 to bytes, detect format from MIME type.
3. If URL: use the user-provided `imageResolver` function to fetch bytes.
4. Detect format: check magic bytes (PNG: `\x89PNG`, JPG: `\xFF\xD8\xFF`).

#### 5.4.2 Embedding
- PNG → `pdfDoc.embedPng(bytes)`
- JPG → `pdfDoc.embedJpg(bytes)`
- Other formats (WebP, SVG, GIF) → not supported by pdf-lib. Warn and skip, or require pre-conversion.

#### 5.4.3 Cropping
- Fabric supports `cropX`, `cropY`, `width`, `height` for image cropping.
- pdf-lib has no crop → implement via clipping path:
  ```
  pushGraphicsState → define rect path → clip → drawImage → popGraphicsState
  ```

#### 5.4.4 Filters
- Fabric image filters (brightness, contrast, grayscale, etc.) have no pdf-lib equivalent.
- Strategy: if the input is from a live canvas, the user can call `canvas.toDataURL()` on individual filtered images to get pre-rendered rasters. The converter can accept pre-rendered image bytes as overrides.
- From JSON only: warn that filters are not applied.

### 5.5 Groups

1. Push graphics state.
2. Apply the group's transformation matrix.
3. Iterate `objects` array in order (Fabric renders back-to-front, same as PDF paint order).
4. Recursively render each child object.
5. Pop graphics state.

Groups can have their own `clipPath`, `opacity`, fill/stroke (though group fill/stroke is uncommon).

Group `opacity` applies to the group as a whole (all children). In PDF, this requires a transparency group (Form XObject with `/Group` dictionary). This is complex but achievable via low-level pdf-lib operators.

---

## 6. Color Handling

Fabric.js accepts colors as:
- Named colors: `'red'`, `'blue'`, etc.
- Hex: `'#ff0000'`, `'#f00'`
- RGB: `'rgb(255, 0, 0)'`
- RGBA: `'rgba(255, 0, 0, 0.5)'`
- HSL: `'hsl(0, 100%, 50%)'`
- Gradients: `{ type: 'linear', ... }` or `{ type: 'radial', ... }`
- Patterns: `{ type: 'pattern', ... }`

pdf-lib accepts: `rgb(r, g, b)` (0-1 range), `cmyk(c,m,y,k)`, `grayscale(g)`.

**Conversion:**
- Parse all color string formats into `{ r, g, b, a }` (0-1 range).
- Use a lightweight color parser (write our own — no dependency needed for hex/rgb/named).
- Map to `rgb(r, g, b)`. Apply `a` as the object's opacity.
- Gradients and patterns: **not supported** → warn and fall back to the first color stop or a default color.
- `fill: ''` or `fill: null` → no fill (transparent).
- `fill: 'transparent'` → no fill.

---

## 7. Unsupported Feature Strategy

Each unsupported feature must be handled explicitly, never silently ignored:

| Strategy | Behavior |
|---|---|
| `'warn'` (default) | Skip the feature, emit a structured warning via callback. |
| `'skip'` | Skip silently. |
| `'error'` | Throw a typed error. |
| `'rasterize'` | Fall back to rasterizing the individual object as a PNG and embedding it. Requires access to a Canvas context (browser or node-canvas). |

Unsupported features to track:
- Gradients (linear/radial) → fall back to first color stop
- Shadows → skip
- Image filters → skip (unless pre-rendered)
- Pattern fills → skip
- Eraser paths → skip
- Complex blend modes without PDF equivalent → fall back to Normal
- Unsupported image formats → skip with warning
- Custom Fabric subclasses without registered renderer → skip with warning

The warning collector produces a structured report:
```ts
interface ConversionWarning {
  type: 'unsupported_feature' | 'fallback_applied' | 'font_missing' | 'image_failed';
  objectType: string;
  objectIndex: number;
  feature: string;
  message: string;
}
```

---

## 8. Public API Design

### 8.1 Primary API

```ts
import { FabricToPdf } from 'canvas-pdflib-converter';

// Simple usage
const pdfBytes = await FabricToPdf.convert(canvasJSON);

// With options
const pdfBytes = await FabricToPdf.convert(canvasJSON, {
  pageWidth: 595.28,          // A4 width in points (default: auto from canvas)
  pageHeight: 841.89,         // A4 height in points (default: auto from canvas)
  scale: 1,                   // px-to-pt scale factor (default: 1)
  
  fonts: {
    'Arial': { regular: arialBytes, bold: arialBoldBytes },
    'Times New Roman': { regular: timesBytes },
  },
  defaultFont: 'Helvetica',
  
  imageResolver: async (src: string) => fetch(src).then(r => r.arrayBuffer()),
  
  onUnsupported: 'warn',
  onWarning: (warning: ConversionWarning) => console.warn(warning),
  
  backgroundColor: '#ffffff',
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
```

### 8.2 Advanced / Incremental API

For users who want more control:

```ts
import { FabricToPdfConverter } from 'canvas-pdflib-converter';

const converter = new FabricToPdfConverter({
  fonts: { ... },
  imageResolver: async (src) => { ... },
});

// Add pages from multiple canvases
await converter.addPage(canvasJSON1, { width: 595, height: 842 });
await converter.addPage(canvasJSON2, { width: 842, height: 595 }); // landscape

// Access the underlying PDFDocument for custom operations
const pdfDoc = converter.getDocument();
// ... add watermarks, page numbers, metadata, etc.

const pdfBytes = await converter.save();
```

### 8.3 Extensibility — Custom Renderers

```ts
import { FabricToPdfConverter, BaseRenderer } from 'canvas-pdflib-converter';

class CustomShapeRenderer extends BaseRenderer {
  readonly type = 'custom-shape';
  
  render(obj: FabricObject, page: PDFPage, context: RenderContext): void {
    // Custom rendering logic using context.pushGraphicsState, etc.
  }
}

const converter = new FabricToPdfConverter({ ... });
converter.registerRenderer(new CustomShapeRenderer());
```

---

## 9. Implementation Phases

### Phase 1 — Foundation (MVP)
**Goal:** Render basic shapes with solid colors and simple transforms.

- [ ] Project scaffolding (TypeScript, build, test setup)
- [ ] Type definitions for Fabric.js JSON structure
- [ ] Coordinate system transformation engine (Y-flip + per-object matrix)
- [ ] Origin resolution (`originX`/`originY` → absolute offset)
- [ ] Color parser (hex, rgb, rgba, named colors → pdf-lib `rgb()`)
- [ ] Base renderer class with shared transform/draw logic
- [ ] Renderers: Rect, Circle, Ellipse, Line, Triangle
- [ ] Main converter orchestrator (parse JSON → render objects → output bytes)
- [ ] Basic public API (`FabricToPdf.convert()`)
- [ ] Unit tests for each renderer and transform math
- [ ] Visual regression tests (render known JSON → compare PDF output)

### Phase 2 — Vectors & Images
**Goal:** Support all vector shapes and static images.

- [ ] Path renderer (SVG path command array → path string → `drawSvgPath`)
- [ ] Polyline renderer (points → SVG path)
- [ ] Polygon renderer (points → closed SVG path)
- [ ] Image loader (URL + data URL resolution, format detection)
- [ ] Image renderer (embed + draw with transform)
- [ ] Image cropping via clipping path
- [ ] Stroke dash arrays (`strokeDashArray` → `setDashPattern`)
- [ ] Stroke line cap and line join
- [ ] Rounded rectangle support (rx/ry → SVG arc path)
- [ ] `visible: false` handling (skip rendering)
- [ ] `opacity` handling

### Phase 3 — Text
**Goal:** Render text with font embedding, alignment, and multi-line support.

- [ ] Font manager (registry, embedding via fontkit, caching)
- [ ] Standard font fallbacks (Helvetica, Times, Courier)
- [ ] Font style variant resolution (bold, italic, bold-italic)
- [ ] Basic text rendering (single line, single style)
- [ ] Baseline position calculation (Fabric top → PDF baseline)
- [ ] Multi-line text rendering
- [ ] Text alignment (left, center, right)
- [ ] Line height handling
- [ ] Text decorations (underline, linethrough, overline)
- [ ] Character spacing via PDF `Tc` operator
- [ ] Textbox word wrapping (re-implement wrapping with font metrics)
- [ ] Styled text (per-character styles in IText/Textbox)
- [ ] Text justify alignment

### Phase 4 — Groups & Composition
**Goal:** Handle nested objects and advanced composition.

- [ ] Group renderer (recursive, with matrix composition)
- [ ] Nested group support (arbitrary depth)
- [ ] ClipPath support (object clipPath → PDF clip operators)
- [ ] Group opacity (transparency group via Form XObject)
- [ ] Multi-page support (multiple canvases → multiple pages)
- [ ] Advanced API (`FabricToPdfConverter` class)
- [ ] Custom renderer registration

### Phase 5 — Polish & Edge Cases
**Goal:** Production hardening and advanced features.

- [ ] Warning collector and structured reporting
- [ ] Rasterization fallback for unsupported features (requires Canvas context)
- [ ] Gradient support via low-level PDF shading operators (best-effort)
- [ ] `strokeUniform` handling (adjust stroke width by inverse scale)
- [ ] Background color/image rendering
- [ ] Canvas `backgroundColor` / `backgroundImage`
- [ ] Performance optimization (object caching, lazy font embedding)
- [ ] Bundle size optimization (tree-shakeable renderer imports)
- [ ] Comprehensive documentation and examples
- [ ] CI/CD pipeline

---

## 10. Testing Strategy

### 10.1 Unit Tests
- **Transform math:** Matrix composition, Y-flip, origin resolution — pure functions with known inputs/outputs.
- **Color parsing:** Every supported format → expected `rgb()` output.
- **SVG path generation:** Points/commands → expected SVG path string.
- **Font metrics:** Text width/height calculations (mocked font).
- **Each renderer in isolation:** Given a Fabric object JSON, assert the correct pdf-lib method calls are made (using mocked `PDFPage`).

### 10.2 Integration Tests
- **End-to-end conversion:** Load a Fabric.js JSON fixture → convert to PDF bytes → parse the PDF and assert content streams contain expected operators.
- **Round-trip validation:** Render known Fabric objects → open the PDF in a headless PDF renderer → compare visual output to a reference image.

### 10.3 Visual Regression Tests
- Maintain a set of Fabric.js JSON fixtures (one per feature: rotated rect, styled text, grouped objects, etc.).
- Convert each to PDF → render to PNG (using `pdf.js` or `poppler`) → pixel-diff against reference screenshots.
- Threshold-based comparison (allow small anti-aliasing differences).

### 10.4 Manual Test Page
- A browser-based test page that shows a Fabric.js canvas side-by-side with the generated PDF (embedded via `<iframe>` or `<embed>`).
- Useful for development and visual QA.

---

## 11. Dependencies

| Dependency | Purpose | Required? |
|---|---|---|
| `pdf-lib` | PDF generation | Yes (peer dependency) |
| `@pdf-lib/fontkit` | Custom font embedding | Yes (peer dependency) |
| `typescript` | Language | Dev |
| `vitest` | Test runner | Dev |
| `tsup` or `rollup` | Bundle/build | Dev |
| `eslint` + `prettier` | Linting/formatting | Dev |

**No runtime dependencies** beyond the peer dependencies (`pdf-lib`, `@pdf-lib/fontkit`). The library must be lightweight.

---

## 12. Known Limitations (Documented)

These are hard limitations of the target (PDF format / pdf-lib) that cannot be fully worked around:

1. **Gradients** — PDF supports gradients natively, but pdf-lib has no high-level API for them. Possible via raw operators but complex and fragile. Documented as partial/experimental support.

2. **Shadows** — PDF has no shadow primitive. Would require rasterizing a blurred duplicate. Not planned for initial release.

3. **Image filters** — Cannot be applied during conversion. Must be pre-applied to source images.

4. **Pattern fills** — Not supported in pdf-lib. Would require manual PDF pattern dictionary construction.

5. **Complex blend modes** — PDF supports some (Multiply, Screen, Overlay, etc.) but Canvas modes like `source-in`, `destination-out` have no PDF equivalent.

6. **Text rendering differences** — Font metrics between browser Canvas and pdf-lib/fontkit will never match exactly. Slight differences in character width, kerning, and line breaks are expected. Using the same TTF file minimizes this.

7. **WebP/GIF/SVG images** — pdf-lib only supports PNG and JPG. Other formats must be pre-converted.

8. **Eraser tool results** — Fabric's eraser uses Canvas compositing. No PDF equivalent. Would need rasterization.

9. **Very large canvases** — PDF has practical size limits. Extremely large canvases may need to be split across pages or scaled.

---

## 13. Performance Considerations

- **Font embedding:** Embed each font only once, even if used by many objects. Cache `PDFFont` instances keyed by family+weight+style.
- **Image embedding:** Embed each unique image only once (dedup by src URL or content hash). Reuse `PDFImage` instances.
- **Operator batching:** Group sequential objects that share the same graphics state to minimize `pushGraphicsState`/`popGraphicsState` overhead.
- **Lazy loading:** Only embed fonts and images that are actually used by objects on the page.
- **Streaming (future):** For very large documents, consider a streaming architecture that doesn't hold all page operators in memory.

---

## 14. Deliverables

1. **npm package** — `canvas-pdflib-converter`, published to npm.
2. **TypeScript definitions** — Full type safety, exported types for configuration and extensibility.
3. **Documentation** — README with quick start, API reference, examples, and known limitations.
4. **Examples** — Working examples for browser and Node.js, covering common use cases.
5. **Test suite** — Unit, integration, and visual regression tests with CI.
