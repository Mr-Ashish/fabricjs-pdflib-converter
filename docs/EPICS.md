# canvas-pdflib-converter — Epics & Subtasks

This document defines the sequenced execution plan for building the library. Epics are ordered by dependency — each epic builds on the completed work of previous epics. Subtasks within an epic are also ordered and should be executed in sequence unless explicitly marked as parallelizable.

**Status legend:**
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Complete

**Workflow rule:** This project follows strict TDD (see `docs/AGENTS.md` Section 7). Every subtask that produces runtime code (`src/`) must follow the Red-Green-Refactor cycle with separate commits:
1. `test(<scope>):` commit — write failing tests first
2. `feat(<scope>):` commit — implement to make tests pass
3. `refactor(<scope>):` commit — clean up (optional)

Subtasks that are config/tooling only use `chore(<scope>):` commits. Type-only subtasks use `feat(<scope>):` commits (no test commit needed for pure types).

---

## Epic 1: Project Scaffolding

**Goal:** Set up the project infrastructure so that code can be written, tested, built, and linted from the first commit.

**Depends on:** Nothing (first epic).

### Subtasks

#### 1.1 Initialize the npm package
- [x] Run `npm init` and configure `package.json` with:
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
- [x] Create `tsconfig.json` with `strict: true`, `target: ES2020`, `moduleResolution: bundler`, path aliases (`@/*` -> `src/*`).
- [x] Create `tsconfig.build.json` extending base, with `outDir`, `declaration: true`, `declarationDir`, `exclude: ["tests"]`.

#### 1.3 Configure build tooling
- [x] Install `tsup` as dev dependency.
- [x] Create `tsup.config.ts` producing ESM + CJS bundles with source maps and `.d.ts` generation.
- [x] Add `build` script to `package.json`.
- [x] Verify `npm run build` produces `dist/` with `.js`, `.cjs`, and type declarations.

#### 1.4 Configure linting and formatting
- [x] Install `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-import`.
- [x] Create `eslint.config.mjs` with strict type-checked rules, `import/no-cycle`.
- [x] Install `prettier`.
- [x] Create `.prettierrc` per AGENTS.md Section 4.
- [x] Add `lint`, `lint:fix`, `format`, `format:check` scripts to `package.json`.

#### 1.5 Configure testing
- [x] Install `vitest` and `@vitest/coverage-v8` as dev dependencies.
- [x] Create `vitest.config.ts` with coverage thresholds (90% line for `src/`).
- [x] Create directory structure: `tests/unit/`, `tests/integration/`, `tests/fixtures/`, `tests/visual/`.
- [x] Add `test`, `test:unit`, `test:int`, `test:visual`, `test:coverage`, `test:watch` scripts to `package.json`.
- [x] Write a trivial passing test to verify the setup works.

#### 1.6 Create source directory skeleton
- [x] Create all directories under `src/` per PLAN.md Section 3.2:
  - `src/types/`, `src/core/`, `src/transform/`, `src/fonts/`, `src/images/`, `src/renderers/`, `src/color/`, `src/utils/`, `src/errors/`
- [x] Create placeholder `index.ts` barrel files in each directory.
- [x] Root `src/index.ts` already created in 1.3.
- [x] Verify `npm run build`, `npm run lint`, `npm test` all pass.

#### 1.7 Install peer dependencies for development
- [x] Install `pdf-lib` and `@pdf-lib/fontkit` as dev dependencies (they are peer deps, but needed locally for development and testing).

**Commit pattern for this epic:** Each subtask is a `chore(build):` or `chore(setup):` commit. No TDD cycle for config/tooling.

**Exit criteria:** `npm run build`, `npm run lint`, and `npm test` all pass. Directory structure matches PLAN.md. ✅ **COMPLETE** Each subtask has its own commit.

---

## Epic 2: Type Definitions

**Goal:** Define all TypeScript types and interfaces that the rest of the codebase depends on. These are the contracts between modules.

**Depends on:** Epic 1 (project scaffolding).

### Subtasks

#### 2.1 Fabric.js JSON type definitions (`src/types/fabric.ts`)
- [x] Define `FabricCanvasJSON` — the top-level shape of `canvas.toJSON()` output:
  - `version: string`
  - `objects: FabricObject[]`
  - `background?: string`
  - `backgroundImage?: FabricImageObject`
- [x] Define `FabricObjectBase` — shared properties across all object types:
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
- [x] Define specific object types extending `FabricObjectBase`:
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
- [x] Define `FabricObject` as a discriminated union of all specific types (discriminated on `type` field).
- [x] Define helper types: `PathCommand`, `FabricGradient`, `FabricShadow`, `FabricTextStyle`, `FabricTextStyles`.

#### 2.2 Converter options types (`src/types/options.ts`)
- [x] Define `ConverterOptions`:
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
- [x] Define `FontRegistry` — map of font family name to `FontVariants`.
- [x] Define `FontVariants` — `{ regular?: ArrayBuffer | Uint8Array, bold?: ..., italic?: ..., boldItalic?: ... }`.
- [x] Define `ImageResolver` — `(src: string) => Promise<ArrayBuffer | Uint8Array>`.
- [x] Define `MarginConfig` — `{ top: number, right: number, bottom: number, left: number }`.
- [x] Define `PageOptions` — per-page overrides for the advanced API.

#### 2.3 Renderer interface types (`src/types/renderer.ts`)
- [x] Define `ObjectRenderer` interface per AGENTS.md Section 5.
- [x] Define `RenderContext` — the shared state passed to every renderer:
  - `pdfDoc: PDFDocument`
  - `page: PDFPage`
  - `fontManager: FontManager`
  - `imageLoader: ImageLoader`
  - `options: ResolvedConverterOptions`
  - `warnings: WarningCollector`
  - `renderObject: (obj: FabricObject) => Promise<void>` — callback for recursive group rendering
  - `currentDepth: number`
- [x] Define `ResolvedConverterOptions` — the fully resolved, defaults-applied version of `ConverterOptions`.
- [x] Define `ConversionWarning` — structured warning type per PLAN.md Section 7.
- [x] Define `ConversionResult` — `{ pdfBytes: Uint8Array, warnings: ConversionWarning[] }`.

#### 2.4 Internal utility types
- [x] Define `TransformMatrix` as `[number, number, number, number, number, number]` (6-element affine matrix).
- [x] Define `Point` as `{ x: number, y: number }`.
- [x] Define `ColorResult` as `{ r: number, g: number, b: number, a: number }` (0-1 range).
- [x] Define `ResolvedColor` as `{ pdfColor: RGB | null, opacity: number }`.

#### 2.5 Export all types
- [x] Re-export all public types from `src/types/index.ts`.
- [x] Re-export from `src/index.ts` the types users need.

**Commit pattern for this epic:** `feat(types):` commits (no TDD for pure type definitions). One commit per subtask or logical group.

**Exit criteria:** `npm run build` succeeds. All types compile. No `any` usage. Types are importable from the package entry point. Each subtask has its own commit. ✅ **COMPLETE**

---

## Epic 3: Core Utilities

**Goal:** Build the foundational utility modules that all renderers depend on: coordinate transforms, color parsing, error handling, and unit conversion.

**Depends on:** Epic 2 (type definitions).

### Subtasks

#### 3.1 Error classes (`src/errors/conversion-error.ts`)
- [x] Implement `ConversionError` base class extending `Error` with `objectIndex` and `objectType` fields.
- [x] Implement `FontNotFoundError` extending `ConversionError`.
- [x] Implement `ImageLoadError` extending `ConversionError`.
- [x] Implement `UnsupportedFeatureError` extending `ConversionError`.
- [x] Implement `InvalidInputError` extending `Error` for public API input validation failures.
- [x] Write unit tests for each error class (verify properties, instanceof checks, message formatting).

#### 3.2 Warning collector (`src/errors/warnings.ts`)
- [x] Implement `WarningCollector` class:
  - `add(warning: ConversionWarning): void`
  - `getAll(): ConversionWarning[]`
  - `hasWarnings(): boolean`
  - `clear(): void`
- [x] Integrate with `onWarning` callback from options (call callback on each `add` if provided).
- [x] Write unit tests.

#### 3.3 Matrix math utilities (`src/transform/matrix.ts`)
- [x] Implement `identityMatrix(): TransformMatrix`.
- [x] Implement `multiplyMatrices(a: TransformMatrix, b: TransformMatrix): TransformMatrix`.
- [x] Implement `composeMatrix(options: { translateX, translateY, scaleX, scaleY, angle, skewX, skewY }): TransformMatrix` — replicates Fabric.js's matrix composition order.
- [x] Implement `transformPoint(point: Point, matrix: TransformMatrix): Point`.
- [x] Implement `invertMatrix(matrix: TransformMatrix): TransformMatrix`.
- [x] Implement `degreesToRadians(degrees: number): number`.
- [x] Write comprehensive unit tests: identity, simple translate, simple rotate, simple scale, combined transforms, multiply associativity, inverse round-trip. **100% coverage required.**

#### 3.4 Origin resolution (`src/transform/origin.ts`)
- [x] Implement `resolveOriginOffset(originX, originY, width, height): Point` — returns the pixel offset from top-left corner based on the origin setting.
- [x] Handle all 9 combinations (3 x 3).
- [x] Write unit tests for all combinations.

#### 3.5 Coordinate conversion (`src/transform/coordinate.ts`)
- [x] Implement `fabricToMatrix(obj: FabricObjectBase): TransformMatrix` — builds the full object-space-to-canvas-space matrix from Fabric properties (left, top, scaleX, scaleY, angle, skewX, skewY, flipX, flipY, originX, originY, width, height).
- [x] Implement `fabricToPdfMatrix(fabricMatrix: TransformMatrix, pageHeight: number, scale: number): TransformMatrix` — applies Y-flip and scaling to convert a Fabric-space matrix to PDF-space.
- [x] Implement `fabricYToPdfY(fabricY: number, objectHeight: number, pageHeight: number, scale: number): number` — simple Y coordinate flip for non-matrix cases.
- [x] Write unit tests: no transform, translate only, rotate 90/180/270, scale, flip, skew, combined, with different origins. **100% coverage required.**

#### 3.6 Color parser (`src/color/color.ts`)
- [x] Implement `parseColor(input: string | FabricGradient | null | undefined): ColorResult` returning `{ r, g, b, a }` in 0-1 range.
- [x] Support formats:
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
- [x] Implement `colorToPdfRgb(color: ColorResult): { pdfColor: RGB; opacity: number }` — converts to pdf-lib `rgb()` call format.
- [x] Gradient/pattern input: return first color stop (if gradient) or fallback, and flag for warning.
- [x] Implement named color lookup map (all 148 CSS named colors).
- [x] Implement `hslToRgb(h, s, l): { r, g, b }` helper.
- [x] Write unit tests for every format, edge cases (whitespace, caps), invalid input. **100% coverage required.**

#### 3.7 Unit conversion (`src/utils/units.ts`)
- [x] Implement `pxToPt(px: number, scale: number): number`.
- [x] Implement `ptToPx(pt: number, scale: number): number`.
- [x] Define constant `PDF_POINTS_PER_INCH = 72`.
- [x] Write unit tests.

#### 3.8 SVG path utilities (`src/core/path-utils.ts`)
- [x] Implement `pathCommandsToSvg(pathCommands: PathCommand[]): string` — converts Fabric's path array format to an SVG path string.
- [x] Implement `svgPathToPdfOps(svgPath: string): PdfPathOp[]` — converts SVG path to PDF operations.
- [x] Implement `scalePath(commands: PathCommand[], scale: number): PathCommand[]` — scales path coordinates.
- [x] Write unit tests for each function with known inputs/outputs.

#### 3.9 Dash pattern utilities (`src/core/dash-pattern.ts`)
- [x] Implement `dashArrayToPdf(dashArray: number[] | null, scale: number): { dashArray: number[], dashPhase: number }`.
- [x] Write unit tests.

**Commit pattern for this epic:** Strict TDD. Each subtask (3.1 through 3.9) produces:
1. `test(<scope>): add tests for <module>` — failing tests committed first
2. `feat(<scope>): implement <module>` — implementation to make tests green
3. `refactor(<scope>): ...` — optional cleanup

Example sequence for subtask 3.3:
```
test(transform): add tests for matrix math utilities
feat(transform): implement matrix composition, multiplication, and inversion
```

**Exit criteria:** All utility modules compile, pass tests, have required coverage. No external dependencies used. Every function is a pure function with no side effects. Each subtask has a test commit followed by a feat commit. ✅ **COMPLETE** — 144 tests passing across all utility modules.

---

## Epic 4: Base Renderer & Renderer Registry

**Goal:** Build the abstract base renderer class and the registry that maps Fabric.js type strings to renderer instances. This is the scaffold that all concrete renderers plug into.

**Depends on:** Epic 3 (core utilities).

### Subtasks

#### 4.1 Base renderer (`src/renderers/base-renderer.ts`)
- [x] Implement abstract `BaseRenderer` class implementing `ObjectRenderer`:
  - `abstract readonly type: string`
  - `abstract renderObject(obj: FabricObject, page: PDFPage, context: RenderContext): void | Promise<void>` — type-specific drawing logic.
  - `render(obj, page, context)` — template method that:
    1. Checks `obj.visible !== false` (skip if not visible).
    2. Calls `renderObject` for actual drawing.
  - `canRender(obj)` — returns `obj.type === this.type`.
- [x] Write unit tests with a mock concrete renderer that extends `BaseRenderer`.

#### 4.2 Renderer registry (`src/renderers/registry.ts`)
- [x] Implement `RendererRegistry` class:
  - `register(renderer: ObjectRenderer): void` — registers by `renderer.type`.
  - `get(type: string): ObjectRenderer | undefined` — returns the renderer for a type.
  - `has(type: string): boolean`.
  - `getAll(): Map<string, ObjectRenderer>`.
- [x] Implement `createDefaultRegistry(): RendererRegistry` — factory that registers all built-in renderers.
- [x] Write unit tests for register, get, has, duplicate registration behavior.

**Commit pattern for this epic:** Strict TDD per subtask.
```
test(renderer): add tests for base renderer template method
feat(renderer): implement BaseRenderer with graphics state management
test(renderer): add tests for renderer registry
feat(renderer): implement RendererRegistry with type-based dispatch
```

**Exit criteria:** `BaseRenderer` can be subclassed. Registry correctly maps types. Template method handles visibility and delegates to renderObject. ✅ **COMPLETE** — 20 tests passing, BaseRenderer and RendererRegistry implemented.

---

## Epic 5: Shape Renderers

**Goal:** Implement renderers for all basic geometric shapes. After this epic, the library can convert canvases containing rectangles, circles, ellipses, triangles, and lines.

**Depends on:** Epic 4 (base renderer).

### Subtasks

#### 5.1 Rect renderer (`src/renderers/rect.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'rect'`.
- [x] Implement `renderObject`:
  - If `rx` and `ry` are both 0 or absent: use `page.drawRectangle()` with mapped position, dimensions, color, border.
  - If rounded corners: generate SVG path via `roundedRectToSvgPath` and use `page.drawSvgPath()`.
- [x] Map properties: `width` -> `width`, `height` -> `height`, `fill` -> `color`, `stroke` -> `borderColor`, `strokeWidth` -> `borderWidth`.
- [x] Handle `fill: null` (no fill, only stroke) and `stroke: null` (no stroke, only fill).
- [x] Register in `registry.ts`.
- [x] Write unit tests: basic rect, rounded rect, fill only, stroke only, fill+stroke, no fill no stroke, zero dimensions.

#### 5.2 Circle renderer (`src/renderers/circle.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'circle'`.
- [x] Map `radius` to `page.drawCircle()` `size` parameter.
- [x] Handle `startAngle` / `endAngle` for arcs (if both present and differ from 0/360, use SVG arc path instead).
- [x] Register in `registry.ts`.
- [x] Write unit tests: full circle, with stroke, partial arc.

#### 5.3 Ellipse renderer (`src/renderers/ellipse.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'ellipse'`.
- [x] Map `rx`, `ry` to `page.drawEllipse()` `xScale`, `yScale` parameters.
- [x] Register in `registry.ts`.
- [x] Write unit tests.

#### 5.4 Triangle renderer (`src/renderers/triangle.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'triangle'`.
- [x] Use `triangleToSvgPath(width, height)` to generate path.
- [x] Render via `page.drawSvgPath()`.
- [x] Register in `registry.ts`.
- [x] Write unit tests.

#### 5.5 Line renderer (`src/renderers/line.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'line'`.
- [x] Map Fabric's `x1`, `y1`, `x2`, `y2` (relative to bounding box center) to `page.drawLine()`.
- [x] Handle coordinate adjustment (Fabric Line positions x1/y1/x2/y2 relative to the object's center).
- [x] Register in `registry.ts`.
- [x] Write unit tests: horizontal line, vertical line, diagonal, with stroke color/width.

#### 5.6 Integration test: basic shapes
- [x] Create a Fabric.js JSON fixture (`tests/fixtures/basic-shapes.json`) containing one of each shape type with various fills, strokes, and positions.
- [x] Write an integration test that converts the fixture to PDF bytes and verifies:
  - PDF bytes are valid (non-empty, start with `%PDF`).
  - Correct number of content stream operators (rough check).
- [x] Optional: render the PDF to an image and visually verify.

**Commit pattern for this epic:** Strict TDD. Each renderer (5.1-5.5) is a test+feat commit pair. The integration test (5.6) is a standalone `test(renderer):` commit.
```
test(renderer): add tests for rect renderer
feat(renderer): implement rect renderer with rounded corner support
test(renderer): add tests for circle renderer
feat(renderer): implement circle renderer
...
test(renderer): add integration test for basic shapes
```

**Exit criteria:** All 5 shape renderers pass unit tests. Integration test produces a valid PDF. Shapes appear at correct positions with correct colors (verified via visual test or operator inspection). ✅ **COMPLETE** — 236 tests passing, all 5 shape renderers implemented and registered.

---

## Epic 6: Vector Path Renderers

**Goal:** Support SVG paths, polylines, and polygons.

**Depends on:** Epic 5 (shape renderers — validates the base renderer works).

### Subtasks

#### 6.1 Path renderer (`src/renderers/path.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'path'`.
- [x] Convert Fabric's `path` array to SVG string via `pathCommandsToSvg`.
- [x] Render via `page.drawSvgPath()`.
- [x] Handle all SVG path commands: M, L, C, Q, A, Z.
- [x] Register in `registry.ts`.
- [x] Write unit tests: simple path, cubic bezier, quadratic bezier, arc, complex multi-command path.

#### 6.2 Polyline renderer (`src/renderers/polyline.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'polyline'`.
- [x] Convert `points` array to open SVG path via `pointsToSvgPath(points, false)`.
- [x] Render via `page.drawSvgPath()`.
- [x] Register in `registry.ts`.
- [x] Write unit tests.

#### 6.3 Polygon renderer (`src/renderers/polygon.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'polygon'`.
- [x] Convert `points` array to closed SVG path via `pointsToSvgPath(points, true)`.
- [x] Render via `page.drawSvgPath()`.
- [x] Register in `registry.ts`.
- [x] Write unit tests.

#### 6.4 Stroke properties support
- [x] Implement stroke dash array rendering in `BaseRenderer` using `setDashPattern` PDF operator via `pushOperators`.
- [x] Implement `strokeLineCap` mapping (`butt` -> 0, `round` -> 1, `square` -> 2) via `setLineCap` operator.
- [x] Implement `strokeLineJoin` mapping (`miter` -> 0, `round` -> 1, `bevel` -> 2) via `setLineJoin` operator.
- [x] Add stroke property tests to base renderer.

#### 6.5 Integration test: vector paths
- [x] Create fixture with complex paths, polylines, and polygons.
- [x] Write integration test verifying valid PDF output.

**Commit pattern for this epic:** Strict TDD per subtask (6.1-6.5).

**Exit criteria:** All path types render correctly. SVG path commands are faithfully translated. Stroke dash/cap/join properties work on all shape and path types. ✅ **COMPLETE** — 293 tests passing, all vector path renderers implemented.

---

## Epic 7: Image Rendering

**Goal:** Support Fabric.js image objects — loading, format detection, embedding, and drawing with transforms.

**Depends on:** Epic 5 (base renderer working).

### Subtasks

#### 7.1 Format detector (`src/images/format-detector.ts`)
- [x] Implement `detectImageFormat(bytes: Uint8Array): 'png' | 'jpg' | 'unknown'` — check magic bytes.
  - PNG: bytes start with `[0x89, 0x50, 0x4E, 0x47]`
  - JPG: bytes start with `[0xFF, 0xD8, 0xFF]`
- [x] Implement `detectFormatFromDataUrl(dataUrl: string): 'png' | 'jpg' | 'unknown'` — parse MIME type.
- [x] Write unit tests with real PNG/JPG headers and edge cases.

#### 7.2 Image loader (`src/images/image-loader.ts`)
- [x] Implement `ImageLoader` class:
  - Constructor takes `imageResolver` function and `PDFDocument`.
  - `async load(src: string): Promise<PDFImage>` — resolves, detects format, embeds, caches.
  - Cache by `src` string to avoid re-embedding the same image.
  - Handle data URLs: decode base64 to bytes, detect format from MIME or magic bytes.
  - Handle regular URLs: call user-provided `imageResolver`.
  - Throw `ImageLoadError` for unsupported formats or resolution failures.
- [x] Write unit tests with mocked PDFDocument (verify `embedPng`/`embedJpg` calls).

#### 7.3 Image renderer (`src/renderers/image.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'image'`.
- [x] In `renderObject`:
  - Load image via `context.imageLoader.load(obj.src)`.
  - Calculate draw dimensions from object width/height scaled.
  - Call `page.drawImage()`.
- [x] Handle missing/failed images gracefully (warn, skip object).
- [x] Register in `registry.ts`.
- [x] Write unit tests with mocked image loader.

#### 7.4 Integration test: images
- [x] Create fixture with image objects (using base64 data URLs for self-contained testing).
- [x] Write integration test verifying images are embedded in the output PDF.

**Commit pattern for this epic:** Strict TDD per subtask (7.1-7.4).

**Exit criteria:** PNG and JPG images load, embed, and render at correct positions/sizes. Data URLs and external URLs both work. Failed images produce warnings, not crashes. ✅ **COMPLETE** — 334 tests passing, image rendering fully implemented.

---

## Epic 8: Font Management

**Goal:** Build the font resolution, embedding, and metrics system required by the text renderer.

**Depends on:** Epic 2 (types), Epic 3 (core utilities).

### Subtasks

#### 8.1 Standard font mappings (`src/fonts/standard-fonts.ts`)
- [x] Define constant map of standard PDF font names to `pdf-lib` `StandardFonts` enum values:
  - `Helvetica`, `Helvetica-Bold`, `Helvetica-Oblique`, `Helvetica-BoldOblique`
  - `Times-Roman`, `Times-Bold`, `Times-Italic`, `Times-BoldItalic`
  - `Courier`, `Courier-Bold`, `Courier-Oblique`, `Courier-BoldOblique`
- [x] Define map of common CSS font family names to standard font names:
  - `'Arial'` -> `Helvetica`, `'Times New Roman'` -> `Times-Roman`, `'Courier New'` -> `Courier`, `'sans-serif'` -> `Helvetica`, `'serif'` -> `Times-Roman`, `'monospace'` -> `Courier`.
- [x] Write unit tests for mappings.

#### 8.2 Font manager (`src/fonts/font-manager.ts`)
- [x] Implement `FontManager` class:
  - Constructor takes `FontRegistry`, `defaultFont` name, and `PDFDocument`.
  - `async resolve(fontFamily: string, fontWeight: string, fontStyle: string): Promise<PDFFont>`:
    1. Build variant key (e.g., `Arial:bold:italic`).
    2. Check cache for embedded font.
    3. If user-provided bytes exist in registry: embed via `pdfDoc.embedFont(bytes)`, cache, return.
    4. If standard font mapping exists: embed via `pdfDoc.embedFont(StandardFonts.X)`, cache, return.
    5. Fall back to `defaultFont`.
  - `getEmbeddedFont(key: string): PDFFont | undefined` — cache lookup.
- [x] Write unit tests with mocked PDFDocument.

#### 8.3 Font metrics helpers (`src/fonts/font-metrics.ts`)
- [x] Implement `getTextWidth(font: PDFFont, text: string, fontSize: number): number` — wraps `font.widthOfTextAtSize`.
- [x] Implement `getTextHeight(font: PDFFont, fontSize: number): number` — wraps `font.heightAtSize`.
- [x] Implement `getAscenderHeight(font: PDFFont, fontSize: number): number` — height without descender.
- [x] Implement `getDescenderHeight(font: PDFFont, fontSize: number): number` — descender depth.
- [x] Implement `getBaselineOffset(font: PDFFont, fontSize: number): number` — the Y offset from the top of the bounding box to the baseline.
- [x] Write unit tests (with a well-mocked PDFFont).

**Commit pattern for this epic:** Strict TDD per subtask (8.1-8.3).

**Exit criteria:** Fonts can be resolved from registry, standard mappings, or fallback. Metrics are correctly computed. Cache prevents duplicate embedding. Missing fonts fall back to default. ✅ **COMPLETE** — 383 tests passing, all font management implemented.

---

## Epic 9: Text Renderer

**Goal:** Render Fabric.js text objects (FabricText, IText, Textbox) into pdf-lib text draws with correct positioning, alignment, multi-line support, and styling.

**Depends on:** Epic 8 (font management), Epic 4 (base renderer).

### Subtasks

#### 9.1 Basic single-line text rendering (COMPLETE) (`src/renderers/text.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'text'`. Also register for types `'i-text'` and `'textbox'`.
- [x] In `renderObject`:
  - Resolve font via `context.fontManager.resolve(fontFamily, fontWeight, fontStyle)`.
  - Calculate baseline Y position: `fabricTop + ascenderHeight` (in Fabric space), then transform to PDF space.
  - Call `page.drawText()` with `x`, `y`, `size`, `font`, `color`.
- [x] Write unit tests for single-line text at various positions.

#### 9.2 Multi-line text (COMPLETE)
- [x] Split `text` by `\n` into lines.
- [x] Position each line: `lineY = firstLineBaselineY + (lineIndex * fontSize * lineHeight)` (in Fabric Y-down space).
- [x] Render each line as a separate `drawText()` call.
- [x] Write unit tests for 1, 2, 5 line texts with various line heights.

#### 9.3 Text alignment (COMPLETE)
- [x] For each line, compute width via `getTextWidth`.
- [x] Apply horizontal offset based on `textAlign`:
  - `'left'`: offset = 0.
  - `'center'`: offset = `(objectWidth - lineWidth) / 2`.
  - `'right'`: offset = `objectWidth - lineWidth`.
- [x] Write unit tests for each alignment with known object widths and text widths.

#### 9.4 Text justify (NOT IMPLEMENTED - Future Work)
- [ ] For `textAlign: 'justify'`: calculate extra space per word gap on each line except the last.
- [ ] Render word-by-word with adjusted x positions.
- [ ] Write unit tests.

#### 9.5 Textbox word wrapping (NOT IMPLEMENTED - Future Work)
- [ ] Implement word-wrap algorithm:
  - Given the object's `width` and the font metrics, break text into lines.
  - Measure word-by-word, accumulate until line exceeds width, then break.
  - Handle long words that exceed the line width (break at character level).
- [ ] Apply the wrapped lines to the multi-line rendering logic from 9.2.
- [ ] Write unit tests: short text (no wrap), exact fit, wrap at word boundary, long single word.

#### 9.6 Text decorations (NOT IMPLEMENTED - Future Work)
- [ ] Implement `underline`: draw a line from `(lineX, baselineY - descentOffset)` to `(lineX + lineWidth, ...)`.
- [ ] Implement `linethrough`: draw a line at vertical center of the text height.
- [ ] Implement `overline`: draw a line at ascender height.
- [ ] Line thickness: `fontSize / 20` (matching Fabric.js default).
- [ ] Line color: same as text fill color.
- [ ] Write unit tests verifying line operator positions.

#### 9.7 Character spacing (NOT IMPLEMENTED - Future Work)
- [ ] If `charSpacing !== 0`, use the `Tc` (character spacing) PDF operator via `pushOperators`.
- [ ] Convert Fabric's charSpacing (1/1000 em) to PDF points: `charSpacing / 1000 * fontSize`.
- [ ] Write unit tests.

#### 9.8 Per-character styled text (NOT IMPLEMENTED - Future Work)
- [ ] Parse Fabric's `styles` object into an array of "style runs" — segments of consecutive characters sharing the same style.
- [ ] For each run:
  - Resolve the run's font (may differ from object default).
  - Measure the run's width.
  - Draw the run at the current x position.
  - Advance x by the run's width.
- [ ] Handle style runs spanning line breaks.
- [ ] Write unit tests: no styles, single style override, multiple style runs, style with different font sizes.

#### 9.9 Text background color (NOT IMPLEMENTED - Future Work)
- [ ] If `textBackgroundColor` is set, draw a filled rectangle behind each line of text.
- [ ] Rectangle dimensions: `lineWidth x lineHeight` at the line's position.
- [ ] Write unit tests.

#### 9.10 Integration test: text rendering (COMPLETE)
- [x] Create fixture with: single-line text, multi-line text, centered text, right-aligned text.
- [x] Write integration test verifying valid PDF output with text content.

**Commit pattern for this epic:** Strict TDD. Each sub-feature (9.1-9.10) is a test+feat commit pair. This epic will produce the most commits due to its complexity.
```
test(text): add tests for basic single-line text rendering
feat(text): implement single-line text with font resolution and baseline
test(text): add tests for multi-line text positioning
feat(text): implement multi-line text rendering
test(text): add tests for text alignment (left, center, right)
feat(text): implement text alignment with width-based offsets
...
```

**Exit criteria:** ✅ **PARTIALLY COMPLETE** — Basic text (9.1), multi-line (9.2), and alignment (9.3) implemented. Advanced features (9.4-9.9) are future work.

---

## Epic 10: Group Renderer

**Goal:** Handle Fabric.js `Group` objects by recursively rendering child objects with composed transformation matrices.

**Depends on:** Epic 5, 6, 7, 9 (all object renderers).

### Subtasks

#### 10.1 Group renderer (COMPLETE) (`src/renderers/group.renderer.ts`)
- [x] Extend `BaseRenderer` with `type = 'group'`.
- [x] In `renderObject`:
  - Check `context.currentDepth < context.options.maxGroupDepth` (default 20). If exceeded, warn and skip.
  - Iterate `obj.objects` in order (back-to-front paint order).
  - For each child, call `context.renderObject(child)` — the context's dispatch function handles looking up the correct renderer.
  - Increment `currentDepth` for the recursive call.
- [x] The base renderer's `render()` method handles the group's own transform matrix.
- [x] Register in `registry.ts`.
- [x] Write unit tests: group with 2 rects, nested groups (2 levels), empty group, group exceeding max depth.

#### 10.2 ClipPath support in base renderer (NOT IMPLEMENTED - Future Work)
- [ ] In `BaseRenderer.render()`, after applying the transform matrix but before calling `renderObject`:
  - If `obj.clipPath` exists, render the clip path as PDF path operators and apply `clip()`.
  - The clipPath itself is a Fabric object (usually a Rect, Circle, or Path). Convert it to PDF path operators without filling/stroking, then call `clip()`.
- [ ] Write unit tests: rect with circular clip path, group with rect clip path.

#### 10.3 Integration test: groups (COMPLETE)
- [x] Create fixture with nested groups, deeply nested groups.
- [x] Write integration test.

**Commit pattern for this epic:** Strict TDD per subtask (10.1-10.3).

**Exit criteria:** ✅ **PARTIALLY COMPLETE** — Group rendering with depth limit implemented. ClipPath support (10.2) is future work.

---

## Epic 11: Core Converter & Public API

**Goal:** Build the main orchestrator that ties the pipeline together, and expose the public API.

**Depends on:** Epic 10 (all renderers complete).

### Subtasks

#### 11.1 JSON parser and validator (COMPLETE) (`src/core/parser.ts`)
- [x] Implement `parseCanvasJSON(input: unknown): FabricCanvasJSON`:
  - Validate input is an object with `objects` array.
  - Validate each object has a `type` string.
  - Strip `viewportTransform` (not needed).
  - Return typed result.
  - Throw `InvalidInputError` for malformed input with descriptive messages.
- [x] Write unit tests: valid JSON, missing objects key, non-array objects, missing type on object, null input, string input (parse JSON string).

#### 11.2 Options resolver (COMPLETE) (`src/core/converter.ts` — internal)
- [x] Implement `resolveOptions(userOptions?: ConverterOptions, canvasJSON?: FabricCanvasJSON): ResolvedConverterOptions`:
  - Apply defaults for all optional fields.
  - `pageWidth` defaults to canvas `width` or 595.28 (A4).
  - `pageHeight` defaults to canvas `height` or 841.89 (A4).
  - `scale` defaults to 1.
  - `defaultFont` defaults to `'Helvetica'`.
  - `onUnsupported` defaults to `'warn'`.
  - `maxGroupDepth` defaults to 20.
  - Margins default to `{ top: 0, right: 0, bottom: 0, left: 0 }`.
- [x] Write unit tests: no options, partial options, full options.

#### 11.3 Main converter orchestrator (COMPLETE) (`src/core/converter.ts`)
- [x] Implement `convertCanvasToPdf(canvasJSON: FabricCanvasJSON, options: ResolvedConverterOptions): Promise<ConversionResult>`:
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
- [x] Write unit tests with mocked renderers.

#### 11.4 Simple public API (COMPLETE) (`src/index.ts`)
- [x] Export core functions as public API:
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
- [x] Margin support.

#### 11.5 Advanced public API (NOT IMPLEMENTED - Future Work)
- [ ] Implement `FabricToPdfConverter` class:
  - `constructor(options?: ConverterOptions)`
  - `async addPage(canvasJSON: string | object, pageOptions?: PageOptions): Promise<void>` — add a page from a canvas JSON.
  - `getDocument(): PDFDocument` — expose the underlying document for custom operations.
  - `getWarnings(): ConversionWarning[]`
  - `async save(): Promise<Uint8Array>`
- [ ] Write unit tests: single page, multi-page, access to underlying document.

#### 11.6 Custom renderer registration (NOT IMPLEMENTED - Future Work)
- [ ] Expose `registerRenderer` on `FabricToPdfConverter`:
  - `registerRenderer(renderer: ObjectRenderer): void` — adds to the instance's registry.
- [ ] Write unit tests with a mock custom renderer.

#### 11.7 Re-export public surface from `src/index.ts` (COMPLETE)
- [x] Export: `parseCanvasJSON`, `resolveOptions`, `convertCanvasToPdf`, `BaseRenderer`, all public types.
- [x] Verify no internal types or utility functions leak through.
- [x] Write a "public API shape" test that imports from the package entry and verifies expected exports exist.

**Commit pattern for this epic:** Strict TDD for subtasks 11.1-11.6. Subtask 11.7 (re-exports) is a `feat(api):` commit.
```
test(core): add tests for JSON parser and input validation
feat(core): implement parseCanvasJSON with validation
test(core): add tests for options resolver with defaults
feat(core): implement resolveOptions with sensible defaults
test(core): add tests for main converter orchestrator
feat(core): implement convertCanvasToPdf pipeline
test(api): add tests for FabricToPdf.convert public API
feat(api): implement FabricToPdf static convert method
test(api): add tests for FabricToPdfConverter advanced API
feat(api): implement FabricToPdfConverter with multi-page support
test(api): add tests for custom renderer registration
feat(api): implement registerRenderer on FabricToPdfConverter
feat(api): export public API surface from index.ts
```

**Exit criteria:** ✅ **PARTIALLY COMPLETE** — Core converter (11.1-11.4, 11.7) implemented. Advanced API (11.5-11.6) is future work.

---

## Epic 12: End-to-End Integration Tests (COMPLETE)

**Goal:** Validate the full pipeline with realistic Fabric.js JSON inputs covering all supported features.

**Depends on:** Epic 11 (public API complete).

### Subtasks

#### 12.1 Create comprehensive test fixtures (COMPLETE)
- [x] `tests/fixtures/basic-shapes.json` — rect, circle, ellipse, triangle, line.
- [x] Fixtures created for shapes, images, and vector paths.
- [x] `tests/fixtures/paths-and-vectors.json` — SVG paths, polylines, polygons.
- [x] Text rendering covered in integration tests.
- [x] Multi-line text covered.
- [x] `tests/fixtures/images.json` — image objects with data URL PNGs/JPGs.
- [x] Groups covered in unit tests.
- [x] `tests/integration/complete.integration.test.ts` — realistic canvas with multiple object types.
- [x] Edge cases covered in unit and integration tests.

#### 12.2 Write integration tests (COMPLETE)
- [x] Integration tests for all major features.
- [x] Warning handling verified.
- [x] Page dimensions verified.
- [x] Simple API (`parseCanvasJSON`, `resolveOptions`, `convertCanvasToPdf`) tested.

#### 12.3 Write multi-page integration test (NOT IMPLEMENTED - Future Work)
- [ ] Convert 3 different canvas JSONs into a single multi-page PDF.
- [ ] Verify the PDF has 3 pages with correct dimensions.

#### 12.4 Write error handling integration tests (COMPLETE)
- [x] Invalid JSON input -> `InvalidInputError`.
- [x] Missing/unsupported objects (with warn mode) -> warning collected, PDF still produced.
- [x] Unknown object type (with error mode) -> error thrown.
- [x] Deeply nested groups exceeding limit -> warning, no crash.

**Commit pattern for this epic:** One `test(integration):` commit per subtask.

**Exit criteria:** ✅ **COMPLETE** — 7 end-to-end integration tests passing. Error and warning paths tested. Multi-page (12.3) is future work.

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

**Commit pattern for this epic:** Mix of TDD pairs for runtime subtasks (13.1-13.4) and `chore(...)` / `docs(...)` commits for config, CI, and documentation subtasks (13.5-13.10).

**Exit criteria:** Library is production-ready. All tests pass. Documentation is complete. CI/CD is configured. Bundle is optimized. Package is publishable.

---

## Epic 14: PDF Verification & Debugging Framework

**Goal:** Enable comprehensive verification of generated PDF output to catch positioning, scaling, and transformation bugs.

**Depends on:** Epic 13 (production-ready library).

**Motivation:** Current testing framework verifies that methods are called but doesn't verify actual PDF output. This epic adds tools to inspect and verify the generated PDF content.

### Subtasks

#### 14.1 Transformation Inspector (Unit Test Level)
- [x] Create `TransformationInspector` class to capture transformation chain
  - Records Fabric.js properties → Origin offset → PDF Matrix → Draw command
  - Provides verification methods for position, scale, rotation
  - Outputs detailed reports for debugging
- [x] Add debug script to generate test PDFs with various transformations
- [ ] Integrate inspector into all renderer tests
- [ ] Document usage in testing guide

#### 14.2 PDF.js Integration Tests (Integration Level)
- [ ] Install `pdfjs-dist` as dev dependency
- [ ] Create PDF operator parser to extract:
  - Transformation matrices (cm operator)
  - Rectangle positions (re operator)
  - Path coordinates
  - Text positions
- [ ] Write integration tests that verify actual PDF content:
  ```typescript
  const elements = await extractPageElements(pdfBytes);
  expect(elements[0].bounds.x).toBeCloseTo(75, 1);
  expect(elements[0].transform).toEqual([...]);
  ```

#### 14.3 Visual Regression Tests (Visual Level)
- [ ] Install `pdf2pic` and `pixelmatch` as dev dependencies
- [ ] Create visual test harness:
  - Convert PDF to PNG
  - Compare against expected reference images
  - Generate diff images for failures
- [ ] Create reference images for common scenarios:
  - Basic shapes (rect, circle, triangle)
  - Scaled shapes
  - Rotated shapes
  - Multi-object layouts

#### 14.4 Coordinate System Debugger
- [ ] Create visualization tool that shows:
  - Fabric.js canvas with object positions
  - PDF output with object positions
  - Side-by-side comparison
  - Transformation matrix breakdown
- [ ] Add to demo application for interactive debugging

#### 14.5 Position/Scale Bug Fixes
- [ ] Fix any identified positioning bugs using new verification tools
- [ ] Fix any identified scaling bugs
- [ ] Add regression tests for all fixed bugs

**Commit pattern for this epic:** 
- `test(<scope>):` for verification framework additions
- `fix(<scope>):` for bug fixes discovered during verification
- `docs(<scope>):` for debugging guide documentation

**Exit criteria:** 
- All three verification layers (unit, integration, visual) are operational
- Current positioning/scaling bugs are identified and fixed
- Regression tests prevent future positioning bugs
- Debugging tools are documented and usable

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
