# canvas-pdflib-converter — Epics & Subtasks

This document defines the sequenced execution plan for building the library. Epics are ordered by dependency — each epic builds on the completed work of previous epics. Subtasks within an epic are also ordered and should be executed in sequence unless explicitly marked as parallelizable.

**Status legend:**
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Complete

---

## Epic 1: Project Scaffolding

**Goal:** Set up the project infrastructure so that code can be written, tested, built, and linted from the first commit.

**Depends on:** Nothing (first epic).

### Subtasks

#### 1.1 Initialize the npm package
- [ ] Run `npm init` and configure `package.json` with:
  - `name`: `canvas-pdflib-converter`
  - `version`: `0.1.0`
  - `description`: Converts Fabric.js canvas objects to pdf-lib PDF documents
  - `license`: MIT
  - `main`, `module`, `types`, `exports`, `files`, `sideEffects` fields per AGENTS.md Section 8
  - `peerDependencies`: `pdf-lib ^1.17.1`, `@pdf-lib/fontkit ^1.1.1`
  - `engines`: `node >=18`
- [ ] Create `.gitignore` with: `node_modules/`, `dist/`, `.env`, `.DS_Store`, `coverage/`, `*.tgz`
- [ ] Create `.npmignore` or verify `files` field excludes non-dist content.

#### 1.2 Configure TypeScript
- [ ] Create `tsconfig.json` with `strict: true`, `target: ES2020`, `moduleResolution: bundler`, path aliases (`@/*` -> `src/*`).
- [ ] Create `tsconfig.build.json` extending base, with `outDir`, `declaration: true`, `declarationDir`, `exclude: ["tests"]`.

#### 1.3 Configure build tooling
- [ ] Install `tsup` as dev dependency.
- [ ] Create `tsup.config.ts` producing ESM + CJS bundles with source maps and `.d.ts` generation.
- [ ] Add `build` script to `package.json`.
- [ ] Verify `npm run build` produces `dist/esm/`, `dist/cjs/`, and type declarations.

#### 1.4 Configure linting and formatting
- [ ] Install `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-import`.
- [ ] Create `eslint.config.mjs` with strict type-checked rules, `import/no-cycle`, import ordering.
- [ ] Install `prettier`.
- [ ] Create `.prettierrc` per AGENTS.md Section 4.
- [ ] Add `lint`, `lint:fix`, `format` scripts to `package.json`.

#### 1.5 Configure testing
- [ ] Install `vitest` as dev dependency.
- [ ] Create `vitest.config.ts` with coverage thresholds (90% line for `src/`, 100% for `src/transform/` and `src/color/`).
- [ ] Create directory structure: `tests/unit/`, `tests/integration/`, `tests/fixtures/`, `tests/visual/`.
- [ ] Add `test`, `test:unit`, `test:int`, `test:visual`, `test:coverage` scripts to `package.json`.
- [ ] Write a trivial passing test to verify the setup works.

#### 1.6 Create source directory skeleton
- [ ] Create all directories under `src/` per PLAN.md Section 3.2:
  - `src/types/`, `src/core/`, `src/transform/`, `src/fonts/`, `src/images/`, `src/renderers/`, `src/color/`, `src/utils/`, `src/errors/`
- [ ] Create placeholder `index.ts` barrel files in each directory (empty named exports).
- [ ] Create root `src/index.ts` that re-exports from submodules.
- [ ] Verify `npm run build` still succeeds with the skeleton.

#### 1.7 Install peer dependencies for development
- [ ] Install `pdf-lib` and `@pdf-lib/fontkit` as dev dependencies (they are peer deps, but needed locally for development and testing).

**Exit criteria:** `npm run build`, `npm run lint`, and `npm test` all pass. Directory structure matches PLAN.md.

---

## Epic 2: Type Definitions

**Goal:** Define all TypeScript types and interfaces that the rest of the codebase depends on. These are the contracts between modules.

**Depends on:** Epic 1 (project scaffolding).

### Subtasks

#### 2.1 Fabric.js JSON type definitions (`src/types/fabric.ts`)
- [ ] Define `FabricCanvasJSON` — the top-level shape of `canvas.toJSON()` output:
  - `version: string`
  - `objects: FabricObject[]`
  - `background?: string`
  - `backgroundImage?: FabricImageObject`
- [ ] Define `FabricObjectBase` — shared properties across all object types:
  - `type: string`
  - `left`, `top`, `width`, `height`: `number`
  - `scaleX`, `scaleY`: `number`
  - `angle`: `number`
  - `skewX`, `skewY`: `number`
  - `flipX`, `flipY`: `boolean`
  - `originX`: `'left' | 'center' | 'right'`
  - `originY`: `'top' | 'center' | 'bottom'`
  - `fill`: `string | FabricGradient | null`
  - `stroke`: `string | null`
  - `strokeWidth`: `number`
  - `strokeDashArray`: `number[] | null`
  - `strokeLineCap`: `'butt' | 'round' | 'square'`
  - `strokeLineJoin`: `'miter' | 'round' | 'bevel'`
  - `opacity`: `number`
  - `visible`: `boolean`
  - `clipPath?: FabricObject`
  - `globalCompositeOperation?: string`
  - `shadow?: FabricShadow | null`
  - `strokeUniform?: boolean`
- [ ] Define specific object types extending `FabricObjectBase`:
  - `FabricRectObject` — adds `rx`, `ry`
  - `FabricCircleObject` — adds `radius`, `startAngle`, `endAngle`
  - `FabricEllipseObject` — adds `rx`, `ry`
  - `FabricTriangleObject` — no extra fields (uses width/height)
  - `FabricLineObject` — adds `x1`, `y1`, `x2`, `y2`
  - `FabricPolylineObject` — adds `points: Array<{x: number, y: number}>`
  - `FabricPolygonObject` — extends polyline
  - `FabricPathObject` — adds `path: PathCommand[]`
  - `FabricTextObject` — adds `text`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `textAlign`, `lineHeight`, `underline`, `linethrough`, `overline`, `charSpacing`, `textBackgroundColor`, `styles`
  - `FabricImageObject` — adds `src`, `cropX`, `cropY`, `filters`
  - `FabricGroupObject` — adds `objects: FabricObject[]`
- [ ] Define `FabricObject` as a discriminated union of all specific types (discriminated on `type` field).
- [ ] Define helper types: `PathCommand`, `FabricGradient`, `FabricShadow`, `FabricTextStyle`, `FabricTextStyles`.

#### 2.2 Converter options types (`src/types/options.ts`)
- [ ] Define `ConverterOptions`:
  - `pageWidth?: number`
  - `pageHeight?: number`
  - `scale?: number`
  - `fonts?: FontRegistry`
  - `defaultFont?: string`
  - `imageResolver?: ImageResolver`
  - `onUnsupported?: 'warn' | 'skip' | 'error' | 'rasterize'`
  - `onWarning?: (warning: ConversionWarning) => void`
  - `backgroundColor?: string`
  - `margin?: MarginConfig`
  - `maxGroupDepth?: number`
- [ ] Define `FontRegistry` — map of font family name to `FontVariants`.
- [ ] Define `FontVariants` — `{ regular?: ArrayBuffer | Uint8Array, bold?: ..., italic?: ..., boldItalic?: ... }`.
- [ ] Define `ImageResolver` — `(src: string) => Promise<ArrayBuffer | Uint8Array>`.
- [ ] Define `MarginConfig` — `{ top: number, right: number, bottom: number, left: number }`.
- [ ] Define `PageOptions` — per-page overrides for the advanced API.

#### 2.3 Renderer interface types (`src/types/renderer.ts`)
- [ ] Define `ObjectRenderer` interface per AGENTS.md Section 5.
- [ ] Define `RenderContext` — the shared state passed to every renderer:
  - `pdfDoc: PDFDocument`
  - `page: PDFPage`
  - `fontManager: FontManager`
  - `imageLoader: ImageLoader`
  - `options: ResolvedConverterOptions`
  - `warnings: WarningCollector`
  - `renderObject: (obj: FabricObject) => Promise<void>` — callback for recursive group rendering
  - `currentDepth: number`
- [ ] Define `ResolvedConverterOptions` — the fully resolved, defaults-applied version of `ConverterOptions`.
- [ ] Define `ConversionWarning` — structured warning type per PLAN.md Section 7.
- [ ] Define `ConversionResult` — `{ pdfBytes: Uint8Array, warnings: ConversionWarning[] }`.

#### 2.4 Internal utility types
- [ ] Define `TransformMatrix` as `[number, number, number, number, number, number]` (6-element affine matrix).
- [ ] Define `Point` as `{ x: number, y: number }`.
- [ ] Define `ColorResult` as `{ r: number, g: number, b: number, a: number }` (0-1 range).
- [ ] Define `ResolvedColor` as `{ pdfColor: RGB | null, opacity: number }`.

#### 2.5 Export all types
- [ ] Re-export all public types from `src/types/index.ts`.
- [ ] Re-export from `src/index.ts` the types users need: `ConverterOptions`, `ConversionWarning`, `ConversionResult`, `FontRegistry`, `FontVariants`, `ImageResolver`, `ObjectRenderer`, `RenderContext`.

**Exit criteria:** `npm run build` succeeds. All types compile. No `any` usage. Types are importable from the package entry point.

---

## Epic 3: Core Utilities

**Goal:** Build the foundational utility modules that all renderers depend on: coordinate transforms, color parsing, error handling, and unit conversion.

**Depends on:** Epic 2 (type definitions).

### Subtasks

#### 3.1 Error classes (`src/errors/conversion-error.ts`)
- [ ] Implement `ConversionError` base class extending `Error` with `objectIndex` and `objectType` fields.
- [ ] Implement `FontNotFoundError` extending `ConversionError`.
- [ ] Implement `ImageLoadError` extending `ConversionError`.
- [ ] Implement `UnsupportedFeatureError` extending `ConversionError`.
- [ ] Implement `InvalidInputError` extending `Error` for public API input validation failures.
- [ ] Write unit tests for each error class (verify properties, instanceof checks, message formatting).

#### 3.2 Warning collector (`src/errors/warnings.ts`)
- [ ] Implement `WarningCollector` class:
  - `add(warning: ConversionWarning): void`
  - `getAll(): ConversionWarning[]`
  - `hasWarnings(): boolean`
  - `clear(): void`
- [ ] Integrate with `onWarning` callback from options (call callback on each `add` if provided).
- [ ] Write unit tests.

#### 3.3 Matrix math utilities (`src/transform/matrix.ts`)
- [ ] Implement `identityMatrix(): TransformMatrix`.
- [ ] Implement `multiplyMatrices(a: TransformMatrix, b: TransformMatrix): TransformMatrix`.
- [ ] Implement `composeMatrix(options: { translateX, translateY, scaleX, scaleY, angle, skewX, skewY }): TransformMatrix` — replicates Fabric.js's matrix composition order.
- [ ] Implement `transformPoint(point: Point, matrix: TransformMatrix): Point`.
- [ ] Implement `invertMatrix(matrix: TransformMatrix): TransformMatrix`.
- [ ] Implement `degreesToRadians(degrees: number): number`.
- [ ] Write comprehensive unit tests: identity, simple translate, simple rotate, simple scale, combined transforms, multiply associativity, inverse round-trip. **100% coverage required.**

#### 3.4 Origin resolution (`src/transform/origin.ts`)
- [ ] Implement `resolveOriginOffset(originX, originY, width, height): Point` — returns the pixel offset from top-left corner based on the origin setting.
- [ ] Handle all 9 combinations (3 x 3).
- [ ] Write unit tests for all combinations.

#### 3.5 Coordinate conversion (`src/transform/coordinate.ts`)
- [ ] Implement `fabricToMatrix(obj: FabricObjectBase): TransformMatrix` — builds the full object-space-to-canvas-space matrix from Fabric properties (left, top, scaleX, scaleY, angle, skewX, skewY, flipX, flipY, originX, originY, width, height).
- [ ] Implement `fabricToPdfMatrix(fabricMatrix: TransformMatrix, pageHeight: number, scale: number): TransformMatrix` — applies Y-flip and scaling to convert a Fabric-space matrix to PDF-space.
- [ ] Implement `fabricYToPdfY(fabricY: number, objectHeight: number, pageHeight: number, scale: number): number` — simple Y coordinate flip for non-matrix cases.
- [ ] Write unit tests: no transform, translate only, rotate 90/180/270, scale, flip, skew, combined, with different origins. **100% coverage required.**

#### 3.6 Color parser (`src/color/color.ts`)
- [ ] Implement `parseColor(input: string | FabricGradient | null | undefined): ColorResult` returning `{ r, g, b, a }` in 0-1 range.
- [ ] Support formats:
  - Hex 3-digit: `#f00`
  - Hex 6-digit: `#ff0000`
  - Hex 8-digit: `#ff000080` (with alpha)
  - `rgb(255, 0, 0)`
  - `rgba(255, 0, 0, 0.5)`
  - `hsl(0, 100%, 50%)`
  - `hsla(0, 100%, 50%, 0.5)`
  - Named CSS colors (full set: `red`, `blue`, `transparent`, etc.)
  - `transparent` -> `{ r: 0, g: 0, b: 0, a: 0 }`
  - `null` / `undefined` / `''` -> `null` (no color / transparent)
- [ ] Implement `colorToPdfRgb(color: ColorResult): { pdfColor: RGB; opacity: number }` — converts to pdf-lib `rgb()` call format.
- [ ] Gradient/pattern input: return first color stop (if gradient) or fallback, and flag for warning.
- [ ] Implement named color lookup map (all 148 CSS named colors).
- [ ] Implement `hslToRgb(h, s, l): { r, g, b }` helper.
- [ ] Write unit tests for every format, edge cases (whitespace, caps), invalid input. **100% coverage required.**

#### 3.7 Unit conversion (`src/utils/units.ts`)
- [ ] Implement `pxToPt(px: number, scale: number): number`.
- [ ] Implement `ptToPx(pt: number, scale: number): number`.
- [ ] Define constant `PDF_POINTS_PER_INCH = 72`.
- [ ] Write unit tests.

#### 3.8 SVG path utilities (`src/utils/svg-path.ts`)
- [ ] Implement `fabricPathToSvgString(pathCommands: PathCommand[]): string` — converts Fabric's path array format (e.g., `[['M', 0, 0], ['L', 100, 100]]`) to an SVG path string (`"M 0 0 L 100 100"`).
- [ ] Implement `pointsToSvgPath(points: Point[], closed: boolean): string` — converts a points array to SVG path (for polyline/polygon).
- [ ] Implement `triangleToSvgPath(width: number, height: number): string` — generates the isoceles triangle path.
- [ ] Implement `roundedRectToSvgPath(width: number, height: number, rx: number, ry: number): string` — generates rounded rect path with arc commands.
- [ ] Implement `validateSvgPath(path: string): boolean` — basic validation of SVG path command structure for security.
- [ ] Write unit tests for each function with known inputs/outputs.

#### 3.9 Dash pattern utilities (`src/utils/dash-pattern.ts`)
- [ ] Implement `fabricDashToPdfDash(strokeDashArray: number[], strokeWidth: number): { dashArray: number[], dashPhase: number }`.
- [ ] Write unit tests.

**Exit criteria:** All utility modules compile, pass tests, have required coverage. No external dependencies used. Every function is a pure function with no side effects.

---

## Epic 4: Base Renderer & Renderer Registry

**Goal:** Build the abstract base renderer class and the registry that maps Fabric.js type strings to renderer instances. This is the scaffold that all concrete renderers plug into.

**Depends on:** Epic 3 (core utilities).

### Subtasks

#### 4.1 Base renderer (`src/renderers/base-renderer.ts`)
- [ ] Implement abstract `BaseRenderer` class implementing `ObjectRenderer`:
  - `abstract readonly type: string`
  - `abstract renderObject(obj: FabricObject, page: PDFPage, context: RenderContext): void | Promise<void>` — type-specific drawing logic.
  - `render(obj, page, context)` — template method that:
    1. Checks `obj.visible !== false` (skip if not visible).
    2. Calls `pushGraphicsState`.
    3. Applies the object's transformation matrix via `concatTransformationMatrix`.
    4. Applies opacity via graphics state if `obj.opacity < 1`.
    5. Calls `this.renderObject(obj, page, context)`.
    6. Calls `popGraphicsState`.
  - `canRender(obj)` — returns `obj.type === this.type`.
  - Protected helpers:
    - `applyFill(page, fill, context)` — parse color, handle null/transparent.
    - `applyStroke(page, stroke, strokeWidth, dashArray, lineCap, lineJoin, context)` — apply stroke properties via operators.
    - `applyClipPath(page, clipPath, context)` — if object has clipPath, render clip operators before main draw.
- [ ] Write unit tests with a mock concrete renderer that extends `BaseRenderer`.

#### 4.2 Renderer registry (`src/renderers/registry.ts`)
- [ ] Implement `RendererRegistry` class:
  - `register(renderer: ObjectRenderer): void` — registers by `renderer.type`.
  - `get(type: string): ObjectRenderer | undefined` — returns the renderer for a type.
  - `has(type: string): boolean`.
  - `getAll(): Map<string, ObjectRenderer>`.
- [ ] Implement `createDefaultRegistry(): RendererRegistry` — factory that registers all built-in renderers.
- [ ] Write unit tests for register, get, has, duplicate registration behavior.

**Exit criteria:** `BaseRenderer` can be subclassed. Registry correctly maps types. Template method correctly wraps draw calls in graphics state save/restore and transformation matrix application.

---

## Epic 5: Shape Renderers

**Goal:** Implement renderers for all basic geometric shapes. After this epic, the library can convert canvases containing rectangles, circles, ellipses, triangles, and lines.

**Depends on:** Epic 4 (base renderer).

### Subtasks

#### 5.1 Rect renderer (`src/renderers/rect.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'rect'`.
- [ ] Implement `renderObject`:
  - If `rx` and `ry` are both 0 or absent: use `page.drawRectangle()` with mapped position, dimensions, color, border.
  - If rounded corners: generate SVG path via `roundedRectToSvgPath` and use `page.drawSvgPath()`.
- [ ] Map properties: `width` -> `width`, `height` -> `height`, `fill` -> `color`, `stroke` -> `borderColor`, `strokeWidth` -> `borderWidth`.
- [ ] Handle `fill: null` (no fill, only stroke) and `stroke: null` (no stroke, only fill).
- [ ] Register in `registry.ts`.
- [ ] Write unit tests: basic rect, rounded rect, fill only, stroke only, fill+stroke, no fill no stroke, zero dimensions.

#### 5.2 Circle renderer (`src/renderers/circle.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'circle'`.
- [ ] Map `radius` to `page.drawCircle()` `size` parameter.
- [ ] Handle `startAngle` / `endAngle` for arcs (if both present and differ from 0/360, use SVG arc path instead).
- [ ] Register in `registry.ts`.
- [ ] Write unit tests: full circle, with stroke, partial arc.

#### 5.3 Ellipse renderer (`src/renderers/ellipse.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'ellipse'`.
- [ ] Map `rx`, `ry` to `page.drawEllipse()` `xScale`, `yScale` parameters.
- [ ] Register in `registry.ts`.
- [ ] Write unit tests.

#### 5.4 Triangle renderer (`src/renderers/triangle.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'triangle'`.
- [ ] Use `triangleToSvgPath(width, height)` to generate path.
- [ ] Render via `page.drawSvgPath()`.
- [ ] Register in `registry.ts`.
- [ ] Write unit tests.

#### 5.5 Line renderer (`src/renderers/line.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'line'`.
- [ ] Map Fabric's `x1`, `y1`, `x2`, `y2` (relative to bounding box center) to `page.drawLine()`.
- [ ] Handle coordinate adjustment (Fabric Line positions x1/y1/x2/y2 relative to the object's center).
- [ ] Register in `registry.ts`.
- [ ] Write unit tests: horizontal line, vertical line, diagonal, with stroke color/width.

#### 5.6 Integration test: basic shapes
- [ ] Create a Fabric.js JSON fixture (`tests/fixtures/basic-shapes.json`) containing one of each shape type with various fills, strokes, and positions.
- [ ] Write an integration test that converts the fixture to PDF bytes and verifies:
  - PDF bytes are valid (non-empty, start with `%PDF`).
  - Correct number of content stream operators (rough check).
- [ ] Optional: render the PDF to an image and visually verify.

**Exit criteria:** All 5 shape renderers pass unit tests. Integration test produces a valid PDF. Shapes appear at correct positions with correct colors (verified via visual test or operator inspection).

---

## Epic 6: Vector Path Renderers

**Goal:** Support SVG paths, polylines, and polygons.

**Depends on:** Epic 5 (shape renderers — validates the base renderer works).

### Subtasks

#### 6.1 Path renderer (`src/renderers/path.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'path'`.
- [ ] Convert Fabric's `path` array to SVG string via `fabricPathToSvgString`.
- [ ] Validate the path string before passing to `drawSvgPath`.
- [ ] Render via `page.drawSvgPath()`.
- [ ] Handle all SVG path commands: M, L, H, V, C, S, Q, T, A, Z (and lowercase relative variants).
- [ ] Register in `registry.ts`.
- [ ] Write unit tests: simple path, cubic bezier, quadratic bezier, arc, complex multi-command path.

#### 6.2 Polyline renderer (`src/renderers/polyline.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'polyline'`.
- [ ] Convert `points` array to open SVG path via `pointsToSvgPath(points, false)`.
- [ ] Render via `page.drawSvgPath()`.
- [ ] Register in `registry.ts`.
- [ ] Write unit tests.

#### 6.3 Polygon renderer (`src/renderers/polygon.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'polygon'`.
- [ ] Convert `points` array to closed SVG path via `pointsToSvgPath(points, true)`.
- [ ] Render via `page.drawSvgPath()`.
- [ ] Register in `registry.ts`.
- [ ] Write unit tests.

#### 6.4 Stroke properties support
- [ ] Implement stroke dash array rendering in `BaseRenderer` using `setDashPattern` PDF operator via `pushOperators`.
- [ ] Implement `strokeLineCap` mapping (`butt` -> 0, `round` -> 1, `square` -> 2) via `setLineCap` operator.
- [ ] Implement `strokeLineJoin` mapping (`miter` -> 0, `round` -> 1, `bevel` -> 2) via `setLineJoin` operator.
- [ ] Add stroke property tests to all shape renderers.

#### 6.5 Integration test: vector paths
- [ ] Create fixture with complex paths, polylines, and polygons.
- [ ] Write integration test verifying valid PDF output.

**Exit criteria:** All path types render correctly. SVG path commands are faithfully translated. Stroke dash/cap/join properties work on all shape and path types.

---

## Epic 7: Image Rendering

**Goal:** Support Fabric.js image objects — loading, format detection, embedding, and drawing with transforms.

**Depends on:** Epic 5 (base renderer working).

### Subtasks

#### 7.1 Format detector (`src/images/format-detector.ts`)
- [ ] Implement `detectImageFormat(bytes: Uint8Array): 'png' | 'jpg' | 'unknown'` — check magic bytes.
  - PNG: bytes start with `[0x89, 0x50, 0x4E, 0x47]`
  - JPG: bytes start with `[0xFF, 0xD8, 0xFF]`
- [ ] Implement `detectFormatFromDataUrl(dataUrl: string): 'png' | 'jpg' | 'unknown'` — parse MIME type.
- [ ] Write unit tests with real PNG/JPG headers and edge cases.

#### 7.2 Image loader (`src/images/image-loader.ts`)
- [ ] Implement `ImageLoader` class:
  - Constructor takes `imageResolver` function and `PDFDocument`.
  - `async load(src: string): Promise<PDFImage>` — resolves, detects format, embeds, caches.
  - Cache by `src` string to avoid re-embedding the same image.
  - Handle data URLs: decode base64 to bytes, detect format from MIME or magic bytes.
  - Handle regular URLs: call user-provided `imageResolver`.
  - Throw `ImageLoadError` for unsupported formats or resolution failures.
- [ ] Write unit tests with mocked PDFDocument (verify `embedPng`/`embedJpg` calls).

#### 7.3 Image renderer (`src/renderers/image.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'image'`.
- [ ] In `renderObject`:
  - Load image via `context.imageLoader.load(obj.src)`.
  - Calculate draw dimensions from object width/height scaled.
  - Call `page.drawImage()`.
- [ ] Handle image cropping (`cropX`, `cropY`):
  - If crop properties are present, use clipping path operators to clip the drawn image.
- [ ] Handle missing/failed images gracefully (warn, skip object).
- [ ] Register in `registry.ts`.
- [ ] Write unit tests with mocked image loader.

#### 7.4 Integration test: images
- [ ] Create fixture with image objects (using base64 data URLs for self-contained testing).
- [ ] Write integration test verifying images are embedded in the output PDF.

**Exit criteria:** PNG and JPG images load, embed, and render at correct positions/sizes. Data URLs and external URLs both work. Crop via clip path works. Failed images produce warnings, not crashes.

---

## Epic 8: Font Management

**Goal:** Build the font resolution, embedding, and metrics system required by the text renderer.

**Depends on:** Epic 2 (types), Epic 3 (core utilities).

### Subtasks

#### 8.1 Standard font mappings (`src/fonts/standard-fonts.ts`)
- [ ] Define constant map of standard PDF font names to `pdf-lib` `StandardFonts` enum values:
  - `Helvetica`, `Helvetica-Bold`, `Helvetica-Oblique`, `Helvetica-BoldOblique`
  - `Times-Roman`, `Times-Bold`, `Times-Italic`, `Times-BoldItalic`
  - `Courier`, `Courier-Bold`, `Courier-Oblique`, `Courier-BoldOblique`
- [ ] Define map of common CSS font family names to standard font names:
  - `'Arial'` -> `Helvetica`, `'Times New Roman'` -> `Times-Roman`, `'Courier New'` -> `Courier`, `'sans-serif'` -> `Helvetica`, `'serif'` -> `Times-Roman`, `'monospace'` -> `Courier`.
- [ ] Write unit tests for mappings.

#### 8.2 Font manager (`src/fonts/font-manager.ts`)
- [ ] Implement `FontManager` class:
  - Constructor takes `FontRegistry`, `defaultFont` name, and `PDFDocument`.
  - `async resolve(fontFamily: string, fontWeight: string, fontStyle: string): Promise<PDFFont>`:
    1. Build variant key (e.g., `Arial:bold:italic`).
    2. Check cache for embedded font.
    3. If user-provided bytes exist in registry: embed via `pdfDoc.embedFont(bytes)`, cache, return.
    4. If standard font mapping exists: embed via `pdfDoc.embedFont(StandardFonts.X)`, cache, return.
    5. Fall back to `defaultFont`. Emit `font_missing` warning.
  - `getEmbeddedFont(key: string): PDFFont | undefined` — cache lookup.
  - Ensure fontkit is registered on the PDFDocument before embedding custom fonts.
- [ ] Write unit tests with mocked PDFDocument.

#### 8.3 Font metrics helpers (`src/fonts/font-metrics.ts`)
- [ ] Implement `getTextWidth(font: PDFFont, text: string, fontSize: number): number` — wraps `font.widthOfTextAtSize`.
- [ ] Implement `getTextHeight(font: PDFFont, fontSize: number): number` — wraps `font.heightAtSize`.
- [ ] Implement `getAscenderHeight(font: PDFFont, fontSize: number): number` — height without descender.
- [ ] Implement `getDescenderHeight(font: PDFFont, fontSize: number): number` — descender depth.
- [ ] Implement `getBaselineOffset(font: PDFFont, fontSize: number): number` — the Y offset from the top of the bounding box to the baseline.
- [ ] Write unit tests (with a real or well-mocked PDFFont).

**Exit criteria:** Fonts can be resolved from registry, standard mappings, or fallback. Metrics are correctly computed. Cache prevents duplicate embedding. Missing fonts produce warnings with fallback.

---

## Epic 9: Text Renderer

**Goal:** Render Fabric.js text objects (FabricText, IText, Textbox) into pdf-lib text draws with correct positioning, alignment, multi-line support, and styling.

**Depends on:** Epic 8 (font management), Epic 4 (base renderer).

### Subtasks

#### 9.1 Basic single-line text rendering (`src/renderers/text.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'text'`. Also register for types `'i-text'` and `'textbox'`.
- [ ] In `renderObject`:
  - Resolve font via `context.fontManager.resolve(fontFamily, fontWeight, fontStyle)`.
  - Calculate baseline Y position: `fabricTop + ascenderHeight` (in Fabric space), then transform to PDF space.
  - Call `page.drawText()` with `x`, `y`, `size`, `font`, `color`.
- [ ] Write unit tests for single-line text at various positions.

#### 9.2 Multi-line text
- [ ] Split `text` by `\n` into lines.
- [ ] Position each line: `lineY = firstLineBaselineY + (lineIndex * fontSize * lineHeight)` (in Fabric Y-down space).
- [ ] Render each line as a separate `drawText()` call.
- [ ] Write unit tests for 1, 2, 5 line texts with various line heights.

#### 9.3 Text alignment
- [ ] For each line, compute width via `getTextWidth`.
- [ ] Apply horizontal offset based on `textAlign`:
  - `'left'`: offset = 0.
  - `'center'`: offset = `(objectWidth - lineWidth) / 2`.
  - `'right'`: offset = `objectWidth - lineWidth`.
- [ ] Write unit tests for each alignment with known object widths and text widths.

#### 9.4 Text justify
- [ ] For `textAlign: 'justify'`: calculate extra space per word gap on each line except the last.
- [ ] Render word-by-word with adjusted x positions.
- [ ] Write unit tests.

#### 9.5 Textbox word wrapping
- [ ] Implement word-wrap algorithm:
  - Given the object's `width` and the font metrics, break text into lines.
  - Measure word-by-word, accumulate until line exceeds width, then break.
  - Handle long words that exceed the line width (break at character level).
- [ ] Apply the wrapped lines to the multi-line rendering logic from 9.2.
- [ ] Write unit tests: short text (no wrap), exact fit, wrap at word boundary, long single word.

#### 9.6 Text decorations
- [ ] Implement `underline`: draw a line from `(lineX, baselineY - descentOffset)` to `(lineX + lineWidth, ...)`.
- [ ] Implement `linethrough`: draw a line at vertical center of the text height.
- [ ] Implement `overline`: draw a line at ascender height.
- [ ] Line thickness: `fontSize / 20` (matching Fabric.js default).
- [ ] Line color: same as text fill color.
- [ ] Write unit tests verifying line operator positions.

#### 9.7 Character spacing
- [ ] If `charSpacing !== 0`, use the `Tc` (character spacing) PDF operator via `pushOperators`.
- [ ] Convert Fabric's charSpacing (1/1000 em) to PDF points: `charSpacing / 1000 * fontSize`.
- [ ] Write unit tests.

#### 9.8 Per-character styled text
- [ ] Parse Fabric's `styles` object into an array of "style runs" — segments of consecutive characters sharing the same style.
- [ ] For each run:
  - Resolve the run's font (may differ from object default).
  - Measure the run's width.
  - Draw the run at the current x position.
  - Advance x by the run's width.
- [ ] Handle style runs spanning line breaks.
- [ ] Write unit tests: no styles, single style override, multiple style runs, style with different font sizes.

#### 9.9 Text background color
- [ ] If `textBackgroundColor` is set, draw a filled rectangle behind each line of text.
- [ ] Rectangle dimensions: `lineWidth x lineHeight` at the line's position.
- [ ] Write unit tests.

#### 9.10 Integration test: text rendering
- [ ] Create fixture with: single-line text, multi-line text, centered text, right-aligned text, textbox with wrapping, styled text, text with decorations.
- [ ] Write integration test verifying valid PDF output with text content.

**Exit criteria:** All text types render with correct position, alignment, wrapping, decorations, and per-character styling. Font resolution and metrics produce visually accurate results.

---

## Epic 10: Group Renderer

**Goal:** Handle Fabric.js `Group` objects by recursively rendering child objects with composed transformation matrices.

**Depends on:** Epic 5, 6, 7, 9 (all object renderers).

### Subtasks

#### 10.1 Group renderer (`src/renderers/group.renderer.ts`)
- [ ] Extend `BaseRenderer` with `type = 'group'`.
- [ ] In `renderObject`:
  - Check `context.currentDepth < context.options.maxGroupDepth` (default 20). If exceeded, warn and skip.
  - Iterate `obj.objects` in order (back-to-front paint order).
  - For each child, call `context.renderObject(child)` — the context's dispatch function handles looking up the correct renderer.
  - Increment `currentDepth` for the recursive call.
- [ ] The base renderer's `render()` method already handles the group's own transform matrix (pushing graphics state and applying the group's CTM). Child objects apply their own transforms within that scope.
- [ ] Register in `registry.ts`.
- [ ] Write unit tests: group with 2 rects, nested groups (2 levels), empty group, group exceeding max depth.

#### 10.2 ClipPath support in base renderer
- [ ] In `BaseRenderer.render()`, after applying the transform matrix but before calling `renderObject`:
  - If `obj.clipPath` exists, render the clip path as PDF path operators and apply `clip()`.
  - The clipPath itself is a Fabric object (usually a Rect, Circle, or Path). Convert it to PDF path operators without filling/stroking, then call `clip()`.
- [ ] Write unit tests: rect with circular clip path, group with rect clip path.

#### 10.3 Integration test: groups
- [ ] Create fixture with nested groups, groups with clip paths, deeply nested groups.
- [ ] Write integration test.

**Exit criteria:** Groups render children at correct relative positions. Nested groups compose transforms correctly. ClipPaths clip child content. Depth limit prevents runaway recursion.

---

## Epic 11: Core Converter & Public API

**Goal:** Build the main orchestrator that ties the pipeline together, and expose the public API.

**Depends on:** Epic 10 (all renderers complete).

### Subtasks

#### 11.1 JSON parser and validator (`src/core/parser.ts`)
- [ ] Implement `parseCanvasJSON(input: unknown): FabricCanvasJSON`:
  - Validate input is an object with `objects` array.
  - Validate each object has a `type` string.
  - Strip `viewportTransform` (not needed).
  - Return typed result.
  - Throw `InvalidInputError` for malformed input with descriptive messages.
- [ ] Write unit tests: valid JSON, missing objects key, non-array objects, missing type on object, null input, string input (parse JSON string).

#### 11.2 Options resolver (`src/core/converter.ts` — internal)
- [ ] Implement `resolveOptions(userOptions?: ConverterOptions, canvasJSON?: FabricCanvasJSON): ResolvedConverterOptions`:
  - Apply defaults for all optional fields.
  - `pageWidth` defaults to canvas `width` or 595.28 (A4).
  - `pageHeight` defaults to canvas `height` or 841.89 (A4).
  - `scale` defaults to 1.
  - `defaultFont` defaults to `'Helvetica'`.
  - `onUnsupported` defaults to `'warn'`.
  - `maxGroupDepth` defaults to 20.
  - Margins default to `{ top: 0, right: 0, bottom: 0, left: 0 }`.
- [ ] Write unit tests: no options, partial options, full options.

#### 11.3 Main converter orchestrator (`src/core/converter.ts`)
- [ ] Implement `convertCanvasToPdf(canvasJSON: FabricCanvasJSON, options: ResolvedConverterOptions): Promise<ConversionResult>`:
  1. Create `PDFDocument`.
  2. Register fontkit on the document.
  3. Add a page with configured dimensions.
  4. Create `FontManager`, `ImageLoader`, `WarningCollector`.
  5. Create `RendererRegistry` with all built-in renderers.
  6. Create `RenderContext`.
  7. If `backgroundColor` is set, draw a full-page background rectangle.
  8. Iterate `canvasJSON.objects` in order:
     - Look up renderer from registry by `obj.type`.
     - If renderer found: call `renderer.render(obj, page, context)`.
     - If not found: handle per `onUnsupported` setting (warn/skip/error).
  9. Save document: `const pdfBytes = await pdfDoc.save()`.
  10. Return `{ pdfBytes, warnings: warningCollector.getAll() }`.
- [ ] Write unit tests with mocked renderers.

#### 11.4 Simple public API (`src/index.ts`)
- [ ] Implement the `FabricToPdf` namespace/class with static `convert` method:
  ```ts
  export class FabricToPdf {
    static async convert(
      input: string | object,
      options?: ConverterOptions,
    ): Promise<Uint8Array>;
  }
  ```
  - If `input` is string, parse as JSON first.
  - Validate input.
  - Resolve options.
  - Call `convertCanvasToPdf`.
  - Return PDF bytes.
- [ ] Write unit tests for the public API surface.

#### 11.5 Advanced public API
- [ ] Implement `FabricToPdfConverter` class:
  - `constructor(options?: ConverterOptions)`
  - `async addPage(canvasJSON: string | object, pageOptions?: PageOptions): Promise<void>` — add a page from a canvas JSON.
  - `getDocument(): PDFDocument` — expose the underlying document for custom operations.
  - `getWarnings(): ConversionWarning[]`
  - `async save(): Promise<Uint8Array>`
- [ ] Write unit tests: single page, multi-page, access to underlying document.

#### 11.6 Custom renderer registration
- [ ] Expose `registerRenderer` on `FabricToPdfConverter`:
  - `registerRenderer(renderer: ObjectRenderer): void` — adds to the instance's registry.
- [ ] Write unit tests with a mock custom renderer.

#### 11.7 Re-export public surface from `src/index.ts`
- [ ] Export: `FabricToPdf`, `FabricToPdfConverter`, `BaseRenderer`, all public types.
- [ ] Verify no internal types or utility functions leak through.
- [ ] Write a "public API shape" test that imports from the package entry and verifies expected exports exist.

**Exit criteria:** `FabricToPdf.convert(json)` produces a valid PDF. `FabricToPdfConverter` supports multi-page and custom renderers. All public API inputs are validated. Warnings are collected and returned.

---

## Epic 12: End-to-End Integration Tests

**Goal:** Validate the full pipeline with realistic Fabric.js JSON inputs covering all supported features.

**Depends on:** Epic 11 (public API complete).

### Subtasks

#### 12.1 Create comprehensive test fixtures
- [ ] `tests/fixtures/basic-shapes.json` — rect, circle, ellipse, triangle, line at various positions, sizes, colors.
- [ ] `tests/fixtures/transformed-shapes.json` — shapes with rotation (45, 90, 180), scale (2x, 0.5x), skew (15deg), flip.
- [ ] `tests/fixtures/paths-and-vectors.json` — SVG paths (bezier, arc), polylines, polygons.
- [ ] `tests/fixtures/text-simple.json` — single-line text, multi-line, centered, right-aligned.
- [ ] `tests/fixtures/text-complex.json` — textbox with wrapping, styled text, decorations, character spacing.
- [ ] `tests/fixtures/images.json` — image objects with data URL PNGs/JPGs.
- [ ] `tests/fixtures/groups.json` — flat group, nested groups, group with clip path.
- [ ] `tests/fixtures/mixed-canvas.json` — realistic canvas with multiple object types combined.
- [ ] `tests/fixtures/edge-cases.json` — zero-size objects, invisible objects, objects with no fill/stroke, empty canvas.

#### 12.2 Write integration tests
- [ ] For each fixture: convert to PDF, verify output is valid PDF bytes.
- [ ] Verify warning counts match expectations for each fixture.
- [ ] Verify page dimensions match configured values.
- [ ] Test the simple API (`FabricToPdf.convert`) and the advanced API (`FabricToPdfConverter`).

#### 12.3 Write multi-page integration test
- [ ] Convert 3 different canvas JSONs into a single multi-page PDF.
- [ ] Verify the PDF has 3 pages with correct dimensions.

#### 12.4 Write error handling integration tests
- [ ] Invalid JSON input -> `InvalidInputError`.
- [ ] Missing image (with warn mode) -> warning collected, PDF still produced.
- [ ] Unknown object type (with error mode) -> `UnsupportedFeatureError`.
- [ ] Deeply nested groups exceeding limit -> warning, no crash.

**Exit criteria:** All integration tests pass. The library handles realistic inputs without crashing. Error and warning paths are tested.

---

## Epic 13: Polish, Performance & Production Hardening

**Goal:** Address edge cases, optimize performance, finalize documentation, and prepare for release.

**Depends on:** Epic 12 (integration tests passing).

### Subtasks

#### 13.1 `strokeUniform` handling
- [ ] In base renderer: if `strokeUniform: true`, compute the effective scale from the transform matrix and adjust `borderWidth` by the inverse scale so the stroke appears uniform.
- [ ] Write unit tests.

#### 13.2 Canvas background rendering
- [ ] If `canvasJSON.background` is a color string, draw a full-page rectangle with that fill before rendering objects.
- [ ] If `canvasJSON.backgroundImage` exists, render it as an image behind all objects.
- [ ] Write unit tests.

#### 13.3 Margin support
- [ ] Apply margin offsets to the rendering origin (shift all objects by margin.left, margin.top).
- [ ] Adjust effective page dimensions for content area.
- [ ] Write unit tests.

#### 13.4 Blend mode mapping
- [ ] Map supported `globalCompositeOperation` values to pdf-lib `BlendMode`:
  - `'multiply'` -> `BlendMode.Multiply`
  - `'screen'` -> `BlendMode.Screen`
  - `'overlay'` -> `BlendMode.Overlay`
  - etc.
- [ ] For unsupported modes: warn and fall back to `BlendMode.Normal`.
- [ ] Write unit tests.

#### 13.5 Performance optimization
- [ ] Profile conversion of a 100-object canvas. Identify bottlenecks.
- [ ] Ensure font cache is working (same font embedded only once).
- [ ] Ensure image cache is working (same image embedded only once).
- [ ] Verify lazy embedding (unused fonts/images are not embedded).
- [ ] Add benchmark script (`benchmarks/convert.bench.ts`) runnable with Vitest bench.

#### 13.6 Bundle size verification
- [ ] Measure the built bundle size (ESM + CJS).
- [ ] Document the expected size in the README.
- [ ] Ensure tree-shaking works (importing only types does not pull in the full library).

#### 13.7 Cross-environment verification
- [ ] Verify the library works in Node.js 18+ (run integration tests in Node).
- [ ] Verify the library builds for browser (no Node-only APIs in the bundle).
- [ ] If possible, run a basic test in a browser environment (e.g., via Playwright or a simple HTML test page).

#### 13.8 Final documentation
- [ ] Write README.md: installation, quick start, configuration reference, known limitations, contributing guide link.
- [ ] Write CHANGELOG.md with initial `0.1.0` entry.
- [ ] Ensure all public APIs have TSDoc comments.
- [ ] Create `examples/basic.ts` — minimal Node.js example.
- [ ] Create `examples/multi-page.ts` — multi-page example.
- [ ] Create `examples/custom-renderer.ts` — custom renderer extension example.

#### 13.9 CI/CD pipeline
- [ ] Create GitHub Actions workflow (`.github/workflows/ci.yml`):
  - Lint, type check, unit test, integration test, build.
  - Run on push to `main` and on all PRs.
  - Report coverage.
- [ ] Create release workflow for npm publish on version tags.

#### 13.10 Pre-release verification
- [ ] Run the full release checklist from AGENTS.md Section 16.
- [ ] Verify `npm pack` produces a clean tarball.
- [ ] Test installing the package from tarball in a fresh project.
- [ ] Verify TypeScript types are usable from the installed package.

**Exit criteria:** Library is production-ready. All tests pass. Documentation is complete. CI/CD is configured. Bundle is optimized. Package is publishable.

---

## Execution Order Summary

```
Epic 1:  Project Scaffolding
  │
  ▼
Epic 2:  Type Definitions
  │
  ├──────────────────────┐
  ▼                      ▼
Epic 3:  Core Utilities  Epic 8: Font Management (parallel with Epic 3)
  │                      │
  ▼                      │
Epic 4:  Base Renderer   │
  │                      │
  ├──────────┬───────────┤
  ▼          ▼           ▼
Epic 5:   Epic 6:     Epic 7:     Epic 9: Text Renderer
Shapes    Vectors     Images      (needs Epic 8)
  │          │           │           │
  └──────────┴───────────┴───────────┘
                  │
                  ▼
            Epic 10: Group Renderer
                  │
                  ▼
            Epic 11: Public API & Converter
                  │
                  ▼
            Epic 12: Integration Tests
                  │
                  ▼
            Epic 13: Polish & Release
```

**Parallelizable work:**
- Epic 3 (Core Utilities) and Epic 8 (Font Management) can be worked in parallel after Epic 2.
- Epics 5, 6, 7 (Shape/Vector/Image renderers) can be worked in parallel after Epic 4.
- Epic 9 (Text Renderer) requires both Epic 4 and Epic 8.
- Everything after Epic 10 is sequential.
