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

### Canvas-to-PDF coordinate contract (mandatory)

All conversion assumes **one local space** for geometry inside each object’s transform:

- **Origin:** bounding-box **top-left** (same convention as Fabric’s box for `left` / `top`).
- **Axes:** **X right, Y down** (canvas / Fabric-style), **1 unit = 1 Fabric pixel** before global `options.scale`.
- **World → PDF:** `applyTransformations` in `src/transform/index.ts` is the **only** place that should combine global scale, page Y-flip, placement from `left`/`top`, origin offset, skew, object scale/flip, and rotation. Renderers must **not** reimplement page-level flips or “PDF Y-up” rotation matrices.

**pdf-lib quirks (do not bypass):**

- `PDFPage.drawSvgPath` applies an **internal Y-flip** (SVG vs PDF). Paths authored in canvas-Y-down must go through **`drawSvgPathInCanvas`** in `src/renderers/draw-helpers.ts`, which cancels that flip so local geometry matches the contract.
- Text in the same local frame must use **`drawTextInCanvas`** from the same module (baseline math stays canvas-Y-down; glyphs stay upright).

**Fabric serialization details:**

- **`fabric.Line`** endpoints (`x1`, `y1`, `x2`, `y2`) are **center-normalized** relative to the line center; convert to bbox-top-left locals (e.g. add `width/2`, `height/2`) before drawing.

**Going forward:** new renderers and path-based features use this contract and the helpers above; new tests should assert observable PDF/canvas alignment (see `scripts/verify-core-fixes.ts` for sanity checks on triangle orientation, line rotation, and scale anchoring).

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

## 7. Test-Driven Development (TDD)

This project follows **strict TDD**. No implementation code is written without a failing test first. This is a non-negotiable workflow rule.

### The Red-Green-Refactor Cycle

Every unit of work follows this exact sequence:

1. **Red — Write a failing test first.**
   - Before writing any implementation code, write a test that describes the expected behavior.
   - Run the test. It **must fail**. If it passes, the test is not testing new behavior — revise it.
   - The failing test defines the contract the implementation must satisfy.

2. **Green — Write the minimum code to make the test pass.**
   - Write only enough implementation code to make the failing test pass.
   - Do not add extra logic, handle edge cases not yet tested, or optimize.
   - Run the test. It must pass. All previously passing tests must still pass.

3. **Refactor — Clean up while tests stay green.**
   - Improve the implementation: rename, extract, simplify, remove duplication.
   - Run all tests after every refactor step. They must remain green.
   - Do not add new behavior during refactoring. Behavior changes require a new Red step.

### TDD Rules

- **No implementation without a test.** Every function, method, and class must have its test written before the implementation. If you find yourself writing implementation code without a corresponding test, stop and write the test first.
- **Test the interface, not the implementation.** Tests should assert observable behavior (return values, state changes, thrown errors, method calls on collaborators). Never test private methods directly or assert on internal data structures.
- **One assertion focus per test.** Each test should verify one logical behavior. Multiple `expect()` calls are fine if they assert different facets of the same behavior, but do not test unrelated behaviors in one test.
- **Tests are first-class code.** Apply the same quality standards (naming, readability, no duplication) to test code as to production code. Use factory functions and helpers to keep tests clean.
- **Keep tests fast.** Unit tests must not perform I/O, network calls, or real PDF generation. Mock external dependencies. A single unit test should complete in under 50ms.
- **Test edge cases explicitly.** After the happy path passes, write dedicated tests for: null/undefined inputs, empty arrays, zero values, boundary conditions, error paths. Each edge case gets its own test.
- **Tests must be independent.** No test may depend on the execution order or side effects of another test. Each test sets up its own state and tears it down.

### TDD Workflow Per Subtask

When working on any subtask from EPICS.md, follow this sequence:

```
1. Read the subtask requirements.
2. Write test file(s) for the subtask — all tests should fail.
3. Commit the failing tests:
   test(scope): add tests for <subtask description>
4. Implement the code to make tests pass — minimal, correct code only.
5. Run all tests — new tests pass, no regressions.
6. Commit the implementation:
   feat(scope): implement <subtask description>
7. Refactor if needed (rename, extract, simplify).
8. Run all tests — still green.
9. Commit the refactor (if any changes):
   refactor(scope): clean up <what was improved>
```

This produces a clear, auditable commit history: every feature has a test commit before its implementation commit.

### When to Skip the Full TDD Cycle

The strict Red-Green-Refactor cycle applies to all code in `src/`. The following are exceptions:

- **Type definitions** (`src/types/`) — Types have no runtime behavior. They do not need tests. However, you must write a compile-time test (a file that imports and uses the types) to verify they are correctly exported.
- **Barrel files** (`index.ts` re-exports) — No tests needed for re-exports.
- **Configuration files** (`tsconfig.json`, `vitest.config.ts`, etc.) — Not tested via unit tests, but validated by the build and test pipeline passing.
- **Integration tests** — Integration tests test the assembled system, not individual units. They are not written in TDD style but are written after the units they exercise are complete.

### Test File Organization

Each source file gets a corresponding test file:

```
src/transform/matrix.ts         → tests/unit/transform/matrix.test.ts
src/color/color.ts              → tests/unit/color/color.test.ts
src/renderers/rect.renderer.ts  → tests/unit/renderers/rect.renderer.test.ts
src/core/converter.ts           → tests/unit/core/converter.test.ts
```

Test file structure:

```ts
import { describe, it, expect, vi } from 'vitest';
import { functionUnderTest } from '../../../src/module/file';

describe('functionUnderTest', () => {
  describe('when given valid input', () => {
    it('should return expected output', () => {
      const result = functionUnderTest(input);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('when given edge case input', () => {
    it('should handle null gracefully', () => {
      expect(() => functionUnderTest(null)).toThrow(SomeTypedError);
    });
  });
});
```

---

## 8. Testing Rules

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

## 9. Build & Distribution

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

## 10. API Design Rules

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

## 11. Documentation Rules

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

## 12. Performance Rules

- **No premature optimization.** Write clear code first. Optimize only when profiling identifies a bottleneck.
- **Cache expensive operations.** Font embedding, image embedding, and color parsing results must be cached within a single conversion run.
- **Avoid unnecessary object allocation** in hot paths (the render loop). Reuse transform matrix arrays where safe.
- **Lazy embed.** Only embed fonts and images into the PDF if they are actually referenced by objects. Do not pre-embed everything from the registry.
- **Benchmark critical paths.** Maintain benchmarks for: conversion of 100 objects, conversion with 50 text objects, conversion with 20 images. Run benchmarks in CI to catch regressions.

---

## 13. Security Rules

- **Never execute user-provided code.** The library processes data (JSON, font bytes, image bytes), not code.
- **Validate image URLs** if an image resolver is provided. The library itself must not make network requests — that is the user's responsibility via `imageResolver`.
- **Sanitize SVG path data** before passing to `drawSvgPathInCanvas` / `drawSvgPath`. Malformed path strings could cause pdf-lib to throw or produce corrupt PDFs. Validate command structure before rendering.
- **Limit recursion depth** for nested groups. Set a configurable maximum (default: 20 levels) to prevent stack overflow from malicious or cyclic JSON.
- **Do not eval or parse executable content** from Fabric.js JSON. Only read declared data properties.
- **Sanitize text content.** PDF text operators can be affected by certain control characters. Strip or escape characters that are not valid in PDF text streams.

---

## 14. Git & Commit Conventions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) strictly:

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]

[optional footer — e.g., BREAKING CHANGE: ...]
```

**Types:**
- `feat` — New functionality (a new renderer, a new API method, a new utility function).
- `test` — Adding or updating tests (no production code changes).
- `fix` — Bug fix in existing functionality.
- `refactor` — Code restructuring with no behavior change. All tests must remain green.
- `chore` — Tooling, config, dependency updates. No production code changes.
- `docs` — Documentation changes only.

**Scopes** (match the `src/` module):
- `transform`, `color`, `renderer`, `text`, `image`, `font`, `core`, `api`, `types`, `errors`, `build`, `ci`.

**Examples:**
```
test(transform): add tests for matrix composition with skew and flip
feat(transform): implement composeMatrix with full Fabric.js transform order
refactor(transform): extract degreesToRadians into standalone helper

test(color): add tests for HSL and HSLA color parsing
feat(color): implement parseColor with hex, rgb, rgba, hsl, named colors

test(renderer): add tests for rect renderer with rounded corners
feat(renderer): implement rect renderer with drawRectangle and SVG path fallback

chore(build): configure tsup for dual ESM/CJS output
docs: add quick start guide to README
```

### Commit-Per-Feature Workflow

**Every completed subtask from EPICS.md results in at least two commits** following the TDD cycle:

```
Step 1: test(<scope>): add tests for <feature>
        └── Contains ONLY test files. Tests must fail at this point.
           (The test runner may error on missing imports — that is expected.)

Step 2: feat(<scope>): implement <feature>
        └── Contains ONLY implementation files. All tests pass after this commit.

Step 3: refactor(<scope>): <description>     [optional, only if refactoring occurs]
        └── Contains code improvements. All tests still pass.
```

**Rules:**
- **Test commit first, always.** The `test(...)` commit is made before the `feat(...)` commit. This is enforced by the TDD workflow. The failing tests prove the feature did not exist before.
- **One logical unit per commit pair.** A test+feat pair covers one subtask or one logically cohesive piece of functionality. Do not bundle multiple unrelated features into one commit.
- **Never mix test and implementation in the same commit.** A `feat(...)` commit must not contain test file changes. A `test(...)` commit must not contain implementation file changes. This rule makes the TDD workflow auditable from the git log.
- **All tests must pass after every `feat(...)` and `refactor(...)` commit.** Run `npm test` before committing. If tests fail, fix the code before committing. Never commit broken code.
- **Commit early and often.** Do not accumulate large uncommitted changes. Smaller, focused commits are easier to review, revert, and bisect.

### Commit Frequency Guidelines

| Work Type | Commit Frequency |
|---|---|
| Type definitions (Epic 2) | One commit per file or related group of types |
| Utility functions (Epic 3) | test + feat commit pair per function/module |
| Each renderer (Epics 5-7) | test + feat commit pair per renderer |
| Text renderer features (Epic 9) | test + feat pair per sub-feature (alignment, wrapping, etc.) |
| Integration tests (Epic 12) | One commit per test suite/fixture |
| Config/tooling (Epic 1) | One `chore(...)` commit per tool configured |

### Branch Strategy

- **`main`** — Always stable. All tests pass. This is the release branch.
- **`feature/{name}`** — Active development for a feature or epic.
- **`fix/{name}`** — Bug fixes.
- **`refactor/{name}`** — Refactoring work.
- **`docs/{name}`** — Documentation changes.

### General Git Rules

- **One logical change per commit.** Do not mix feature work with refactoring or tooling.
- **Never commit:** `node_modules/`, `dist/`, `.env`, editor config files, OS files (`.DS_Store`), `coverage/`.
- **Never use `--no-verify`** to bypass pre-commit hooks.
- **Write meaningful commit messages.** The subject line must make sense when read in `git log --oneline`. A reviewer should understand what changed without reading the diff.
- **PR requirements:** All PRs must pass CI (build, lint, test). PRs must have a description explaining what and why.

---

## 15. Dependency Management

- **Minimize dependencies.** Every new dependency must be justified in the PR description.
- **No dependencies for trivial utilities.** Color parsing, matrix math, SVG path construction — write these ourselves. They are core to the library and must be fast, correct, and dependency-free.
- **Pin dev dependency versions** in `package.json` (exact versions, not ranges) to ensure reproducible builds.
- **Audit dependencies** for vulnerabilities before adding. Run `npm audit` in CI.
- **Keep peer dependency ranges wide.** `"pdf-lib": "^1.17.1"` — support the widest range that works.
- **No optional dependencies.** If a feature requires a dependency, it is either a peer dep or we implement it ourselves.

---

## 16. CI/CD Pipeline

The CI pipeline must run on every push and PR:

1. **Lint** — `eslint` with zero warnings allowed.
2. **Type check** — `tsc --noEmit` must pass.
3. **Unit tests** — `vitest run` must pass with coverage thresholds met.
4. **Integration tests** — must pass.
5. **Build** — `npm run build` must produce valid ESM, CJS, and type declaration outputs.
6. **Bundle size check** — report bundle size and fail if it exceeds a configured limit.
7. **Visual regression tests** — run on main branch merges (optional on PRs due to cost).

---

## 17. Release Checklist

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

## 18. Code Review Checklist

When reviewing PRs, verify:

- [ ] Does it follow the naming conventions in this document?
- [ ] Is the code covered by tests?
- [ ] Were tests written before implementation? (Check commit order: `test(...)` before `feat(...)`.)
- [ ] Are test and implementation changes in separate commits?
- [ ] Do tests assert behavior, not implementation details?
- [ ] Are new types properly exported if they are part of the public API?
- [ ] Does it introduce any circular dependencies?
- [ ] Does it handle errors correctly (typed errors, not generic throws)?
- [ ] Does it mutate input data? (It must not.)
- [ ] Is the function under 50 lines? Is the file under 400 lines?
- [ ] Are there any `any` types? (There must not be.)
- [ ] Does it work in both browser and Node.js?
- [ ] Does rendering respect the **Canvas-to-PDF coordinate contract** (Section 5): local geometry in canvas-Y-down at bbox top-left; SVG paths and text via `draw-helpers`; no duplicate page flips outside `applyTransformations`?
- [ ] Is the commit message following Conventional Commits?
- [ ] Do all tests pass at every commit in the PR? (No broken intermediate commits.)
