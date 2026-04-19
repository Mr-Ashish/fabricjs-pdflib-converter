# canvas-pdflib-converter — Development Rules & Guidelines

This file defines the rules, conventions, and quality standards for developing and maintaining the `canvas-pdflib-converter` library. All contributors and AI agents must follow these rules when working on any file in this repository.

---

## 1. Language & Runtime

- **TypeScript** is the only language for source code. No plain `.js` files in `src/`.
- Target **ES2020** for the TypeScript compiler. Output both ESM and CJS bundles.
- The library must run in **both browser and Node.js** (18+). Never use Node-only APIs (like `fs`, `path`, `Buffer`) in core library code. If Node-specific logic is needed, isolate it behind a runtime check or a separate entry point.
- Never use `any` type. Use `unknown` and narrow with type guards when the type is genuinely uncertain. If a third-party type is truly untyped, create a minimal type declaration.
- Enable `strict: true` in `tsconfig.json`. No exceptions.
- All public API types must be explicitly exported from `src/index.ts`.

---

## 2. Project Structure

```
canvas-pdflib-converter/
├── src/                    # All source code
│   ├── index.ts            # Public API — the only import users need
│   ├── types/              # Type definitions and interfaces
│   ├── core/               # Pipeline orchestrator, parser, render tree
│   ├── transform/          # Coordinate math, matrix utilities
│   ├── fonts/              # Font management, metrics, embedding
│   ├── images/             # Image loading, format detection
│   ├── renderers/          # One file per Fabric object type + registry
│   ├── color/              # Color string parsing
│   ├── utils/              # Pure utility functions
│   └── errors/             # Error classes, warning types
├── tests/
│   ├── unit/               # Unit tests (mirrors src/ structure)
│   ├── integration/        # End-to-end conversion tests
│   ├── fixtures/           # Fabric.js JSON fixtures, reference images
│   └── visual/             # Visual regression tests
├── docs/
│   ├── PLAN.md             # Project plan (do not modify without discussion)
│   ├── EPICS.md            # Epics and subtasks for sequenced execution
│   └── AGENTS.md           # This file — rules and guidelines
├── examples/               # Runnable example scripts
├── AGENTS.md               # Root pointer to docs/AGENTS.md
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── vitest.config.ts
```

**Rules:**
- Every directory under `src/` must have an `index.ts` barrel file that re-exports its public surface.
- Never place implementation code in the root `src/index.ts` — it only re-exports from submodules.
- Test file names must match source files: `src/renderers/rect.renderer.ts` → `tests/unit/renderers/rect.renderer.test.ts`.
- Fixture files live in `tests/fixtures/` only. Never commit test data inside `src/`.

---

## 3. Naming Conventions

### Files
- All file names: `kebab-case.ts` (e.g., `font-manager.ts`, `base-renderer.ts`).
- Renderer files: `{type}.renderer.ts` (e.g., `rect.renderer.ts`, `text.renderer.ts`).
- Test files: `{source-file-name}.test.ts`.
- Type-only files: placed in `types/` directory, named by domain (e.g., `fabric.ts`, `options.ts`).

### Code
- **Interfaces:** PascalCase, prefixed with `I` only when disambiguating from a class of the same name. Prefer no prefix: `ConverterOptions`, `RenderContext`, `ConversionWarning`.
- **Types:** PascalCase. `FabricObject`, `ColorValue`, `TransformMatrix`.
- **Classes:** PascalCase. `RectRenderer`, `FontManager`, `FabricToPdfConverter`.
- **Functions:** camelCase. `parseColor`, `resolveOrigin`, `composeMatrix`.
- **Constants:** UPPER_SNAKE_CASE for true constants. `DEFAULT_FONT_SIZE`, `PDF_POINTS_PER_INCH`.
- **Enums:** PascalCase for the enum, PascalCase for members. `UnsupportedStrategy.Warn`.
- **Private class members:** prefix with `_` only if needed for clarity. Prefer TypeScript `private` keyword.
- **Boolean variables/properties:** prefix with `is`, `has`, `should`, `can`. Examples: `isVisible`, `hasClipPath`, `shouldRasterize`.

---

## 4. Code Style & Formatting

- Use **Prettier** for formatting. Configuration:
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "arrowParens": "always"
  }
  ```
- Use **ESLint** with `@typescript-eslint`. Enable recommended rules + strict type-checked rules.
- Maximum function length: **50 lines** (excluding type declarations). If a function exceeds this, decompose it.
- Maximum file length: **400 lines**. Split into multiple files if exceeded.
- Maximum function parameters: **3 positional parameters**. Beyond 3, use an options object.
- No default exports. Always use named exports.
- Import order (enforced by ESLint):
  1. Node/built-in modules (if any)
  2. External packages (`pdf-lib`, `@pdf-lib/fontkit`)
  3. Internal absolute imports (`@/core/...` or relative `../`)
  4. Type-only imports (`import type { ... }`)
- Use `import type` for type-only imports. This ensures types are erased at build time and do not bloat the bundle.

---

## 5. Architecture Rules

### Dependency Direction
```
index.ts (public API)
    ↓
core/ (orchestrator)
    ↓
renderers/ ←→ transform/, fonts/, images/, color/
    ↓
utils/, errors/, types/
```

- **No circular dependencies.** Enforce with ESLint `import/no-cycle`.
- `types/` and `utils/` must not import from any other `src/` directory. They are leaf modules.
- `renderers/` may import from `transform/`, `fonts/`, `images/`, `color/`, `utils/`, `types/`, and `errors/`. Never from `core/`.
- `core/` orchestrates everything. It is the only module that imports from `renderers/`.
- External dependencies (`pdf-lib`) should be accessed through thin wrapper functions where practical, to make testing easier and to insulate the codebase from API changes.

### Renderer Pattern
Every renderer must:
1. Implement the `ObjectRenderer` interface.
2. Declare a `readonly type: string` matching the Fabric.js object type.
3. Implement a `render(obj, page, context)` method.
4. Be registered in `renderers/registry.ts`.
5. Handle its own transform (wrap draw calls in `pushGraphicsState` / `popGraphicsState`).
6. Never directly import or depend on other renderers (groups use the registry to dispatch to child renderers).

```ts
interface ObjectRenderer {
  readonly type: string;
  render(obj: FabricObject, page: PDFPage, context: RenderContext): void | Promise<void>;
  canRender(obj: FabricObject): boolean;
}
```

### Immutability
- Never mutate input data (the Fabric.js JSON objects). Always create new objects or work with copies.
- Renderer methods must be side-effect-free except for their output (drawing to the PDFPage).
- Configuration objects must be treated as readonly after construction.

---

## 6. Error Handling

### Error Classes
Define typed error classes in `src/errors/`:
```ts
class ConversionError extends Error {
  constructor(message: string, public readonly objectIndex: number, public readonly objectType: string) { ... }
}

class FontNotFoundError extends ConversionError { ... }
class ImageLoadError extends ConversionError { ... }
class UnsupportedFeatureError extends ConversionError { ... }
```

### Rules
- Never throw generic `Error`. Always use a typed error class from `src/errors/`.
- Never swallow errors silently. Either handle them, re-throw, or report via the warning system.
- Async functions must use try/catch internally for operations that can fail (image loading, font embedding). Propagate structured errors, not raw exceptions.
- Validate all public API inputs at the boundary (`convert()` function). Use clear error messages that tell the user what's wrong and how to fix it.
- Internal functions may assume valid inputs (validated at the boundary).
- Use the warning collector for non-fatal issues (unsupported features, missing fonts with fallback). Use errors for fatal issues (no objects to render, corrupt JSON, invalid page dimensions).

---

## 7. Testing Rules

### Coverage Requirements
- **Minimum 90% line coverage** for `src/` code.
- **100% coverage** for `src/transform/` (math must be fully tested).
- **100% coverage** for `src/color/` (parsing must handle all formats).
- Every renderer must have tests for: basic rendering, with rotation, with scale, with opacity, with stroke, skip when `visible: false`.

### Test Conventions
- Use **Vitest** as the test framework.
- Each test file tests exactly one source module.
- Test names follow the pattern: `describe('ModuleName', () => { it('should do X when Y', ...) })`.
- Use factory functions for creating test fixtures, not raw object literals repeated across tests.
- Mock `PDFPage` and `PDFDocument` for unit tests. Do not perform real PDF generation in unit tests.
- Integration tests may generate real PDFs. Store expected outputs as fixtures.
- Never use `test.skip` or `test.todo` in committed code. Either write the test or remove the placeholder.
- Tests must be deterministic. No reliance on timing, network, or random values.

### Running Tests
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:int      # Integration tests only
npm run test:visual   # Visual regression tests
npm run test:coverage # With coverage report
```

---

## 8. Build & Distribution

### Build Output
- **ESM** (`dist/esm/`) — for modern bundlers and Node.js with `"type": "module"`.
- **CJS** (`dist/cjs/`) — for legacy Node.js and bundlers.
- **Type declarations** (`dist/types/`) — `.d.ts` files.
- Source maps included for both formats.

### package.json Requirements
```json
{
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "sideEffects": false,
  "peerDependencies": {
    "pdf-lib": "^1.17.1",
    "@pdf-lib/fontkit": "^1.1.1"
  }
}
```

### Rules
- `pdf-lib` and `@pdf-lib/fontkit` are **peer dependencies**, not bundled dependencies.
- Zero runtime dependencies beyond peer deps. Every utility we need, we write ourselves.
- The built bundle must be tree-shakeable. Use `"sideEffects": false` and avoid top-level side effects.
- Never import from `dist/`. All source imports use `src/` paths.
- Run `npm run build` before every publish. CI must build and verify the output.

---

## 9. API Design Rules

- **Minimal surface area.** Export only what users need. Internal utilities stay internal.
- **Progressive disclosure.** Simple use case = one function call. Advanced use case = class with methods. Never force advanced configuration on simple users.
- **Options objects over positional arguments.** Any function with more than 3 parameters must use a single options object.
- **Sensible defaults for everything.** A call to `convert(json)` with no options must produce a reasonable PDF.
- **Async by default.** The main API is async (returns `Promise<Uint8Array>`) because image loading and font embedding are async. Do not provide sync variants.
- **No global state.** Each `convert()` call or `FabricToPdfConverter` instance is fully independent. No module-level singletons or caches that leak between calls.
- **Fail gracefully.** Unsupported features produce warnings, not crashes. Only throw on truly unrecoverable errors (corrupt input, missing required config).
- **Semantic versioning.** Public API changes require a major version bump. New features are minor. Bug fixes are patch.
- **Deprecation before removal.** Any public API being removed must be deprecated for at least one minor version with a console warning and migration guide.

---

## 10. Documentation Rules

- Every public function, class, method, and type must have a **TSDoc comment** with:
  - A one-line summary.
  - `@param` for each parameter.
  - `@returns` describing the return value.
  - `@throws` for functions that throw.
  - `@example` for non-obvious usage.
- Internal functions: a one-line comment is sufficient if the name is descriptive. No TSDoc required.
- Never add comments that restate what the code does. Comments explain **why**, not **what**.
- Keep the README focused on: installation, quick start, configuration, known limitations, and a link to full API docs.
- Changelog follows [Keep a Changelog](https://keepachangelog.com/) format.

---

## 11. Performance Rules

- **No premature optimization.** Write clear code first. Optimize only when profiling identifies a bottleneck.
- **Cache expensive operations.** Font embedding, image embedding, and color parsing results must be cached within a single conversion run.
- **Avoid unnecessary object allocation** in hot paths (the render loop). Reuse transform matrix arrays where safe.
- **Lazy embed.** Only embed fonts and images into the PDF if they are actually referenced by objects. Do not pre-embed everything from the registry.
- **Benchmark critical paths.** Maintain benchmarks for: conversion of 100 objects, conversion with 50 text objects, conversion with 20 images. Run benchmarks in CI to catch regressions.

---

## 12. Security Rules

- **Never execute user-provided code.** The library processes data (JSON, font bytes, image bytes), not code.
- **Validate image URLs** if an image resolver is provided. The library itself must not make network requests — that is the user's responsibility via `imageResolver`.
- **Sanitize SVG path data** before passing to `drawSvgPath`. Malformed path strings could cause pdf-lib to throw or produce corrupt PDFs. Validate command structure before rendering.
- **Limit recursion depth** for nested groups. Set a configurable maximum (default: 20 levels) to prevent stack overflow from malicious or cyclic JSON.
- **Do not eval or parse executable content** from Fabric.js JSON. Only read declared data properties.
- **Sanitize text content.** PDF text operators can be affected by certain control characters. Strip or escape characters that are not valid in PDF text streams.

---

## 13. Git & Commit Conventions

- **Branch naming:** `feature/{name}`, `fix/{name}`, `refactor/{name}`, `docs/{name}`.
- **Commit messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/):
  ```
  feat(renderer): add circle renderer with full transform support
  fix(text): correct baseline calculation for fonts with large descenders
  refactor(transform): extract matrix composition into standalone utility
  test(path): add visual regression test for cubic bezier paths
  docs: add API reference for FabricToPdfConverter class
  chore: update dev dependencies
  ```
- **One logical change per commit.** Do not mix feature work with refactoring.
- **Never commit:** `node_modules/`, `dist/`, `.env`, editor config files, OS files (`.DS_Store`).
- **PR requirements:** All PRs must pass CI (build, lint, test). PRs must have a description explaining what and why.

---

## 14. Dependency Management

- **Minimize dependencies.** Every new dependency must be justified in the PR description.
- **No dependencies for trivial utilities.** Color parsing, matrix math, SVG path construction — write these ourselves. They are core to the library and must be fast, correct, and dependency-free.
- **Pin dev dependency versions** in `package.json` (exact versions, not ranges) to ensure reproducible builds.
- **Audit dependencies** for vulnerabilities before adding. Run `npm audit` in CI.
- **Keep peer dependency ranges wide.** `"pdf-lib": "^1.17.1"` — support the widest range that works.
- **No optional dependencies.** If a feature requires a dependency, it is either a peer dep or we implement it ourselves.

---

## 15. CI/CD Pipeline

The CI pipeline must run on every push and PR:

1. **Lint** — `eslint` with zero warnings allowed.
2. **Type check** — `tsc --noEmit` must pass.
3. **Unit tests** — `vitest run` must pass with coverage thresholds met.
4. **Integration tests** — must pass.
5. **Build** — `npm run build` must produce valid ESM, CJS, and type declaration outputs.
6. **Bundle size check** — report bundle size and fail if it exceeds a configured limit.
7. **Visual regression tests** — run on main branch merges (optional on PRs due to cost).

---

## 16. Release Checklist

Before every npm publish:

- [ ] All tests pass (unit, integration, visual).
- [ ] Build succeeds and outputs are correct.
- [ ] Bundle size is within acceptable limits.
- [ ] CHANGELOG.md is updated.
- [ ] Version is bumped according to semver.
- [ ] README reflects any API changes.
- [ ] No `console.log` or debug statements in source code.
- [ ] TypeScript types are correctly exported and usable.
- [ ] Peer dependency compatibility is verified.

---

## 17. Code Review Checklist

When reviewing PRs, verify:

- [ ] Does it follow the naming conventions in this document?
- [ ] Is the code covered by tests?
- [ ] Are new types properly exported if they are part of the public API?
- [ ] Does it introduce any circular dependencies?
- [ ] Does it handle errors correctly (typed errors, not generic throws)?
- [ ] Does it mutate input data? (It must not.)
- [ ] Is the function under 50 lines? Is the file under 400 lines?
- [ ] Are there any `any` types? (There must not be.)
- [ ] Does it work in both browser and Node.js?
- [ ] Is the commit message following Conventional Commits?
