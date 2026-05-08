# Unhandled Fabric Attributes — Implementation Design
Date: 2026-05-08

## Overview

Implement six groups of Fabric.js attributes currently defined in types but silently ignored during PDF rendering. Also update the demo app to expose these features for manual testing, and add unit tests for each group.

Gradients and shadow blur are explicitly out of scope.

---

## Feature Groups

### 1. Text Layer (text.renderer.ts)

**charSpacing**
- Fabric stores it in 1/1000 em units. Convert: `charSpacingPt = (charSpacing / 1000) * fontSize`
- Push `setCharacterSpacing(charSpacingPt)` before each line's `drawTextInCanvas` call
- Reset to 0 after each line (so lines don't bleed into each other)
- When `styles` are active, the per-run effective charSpacing must also be applied per-run

**textBackgroundColor**
- Before drawing a line, measure `lineWidth = getTextWidth(font, line, fontSize)`
- Draw a filled rectangle at `(xOffset, baselineY - fontSize * FABRIC_FONT_SIZE_MULT)` with `width = lineWidth`, `height = lineHeightPx`
- Color = parsed `textBackgroundColor`
- For per-char style runs, draw background rect per run (width = run width)

**underline, linethrough, overline**
- After drawing each line, draw a thin filled rectangle:
  - `underline`: y = `baselineY + fontSize * 0.07`, thickness = `max(1, fontSize / 15)`
  - `linethrough`: y = `baselineY - fontSize * 0.35`, thickness = `max(1, fontSize / 15)`  
  - `overline`: y = `baselineY - fontSize * 0.9`, thickness = `max(1, fontSize / 15)`
- Width = measured line width, with same `xOffset` as the text
- Color = same as text fill color
- When `styles` override these per-char, draw decoration per run

**textAlign: 'justify'**
- Count spaces in line: `spaceCount = line.split(' ').length - 1`
- If `spaceCount > 0` and line is NOT the last line:
  - `extraSpace = obj.width - getTextWidth(font, line, fontSize)`
  - `wordSpacing = extraSpace / spaceCount`
  - Push `setWordSpacing(wordSpacing)` before `drawTextInCanvas`
  - Reset to 0 after
- Last line of text (or single-line) stays left-aligned

**styles (per-character run-based rendering)**
- Build style runs per line: iterate characters, group consecutive chars with identical effective style
- Effective style = merge object-level defaults with `styles[lineIndex][charIndex]`
- Per run: resolve font (fontFamily + fontWeight + fontStyle), apply charSpacing, textBackgroundColor, decorations
- Cache font resolutions by `"family:weight:style"` key to avoid redundant async calls
- Track x-cursor: advance by `getTextWidth(resolvedFont, runText, effectiveSize)` after each run
- Text alignment (center/right/justify) still applies to the full line width
- If `styles` is empty or all entries are empty objects, fall through to the existing single-pass path (no regression)

---

### 2. Opacity Layer (base-renderer.ts + new opacity-utils.ts)

**New utility: `applyOpacity(page, pdfDoc, opacity)`**
- If `opacity >= 1`, skip (no-op)
- Create ExtGState dict: `{ Type: 'ExtGState', ca: opacity, CA: opacity }`
- Register on the page's resource dict under a generated name (`GS_op_<n>`)
- Push `setGraphicsState(name)` operator
- Called in `BaseRenderer.render()` after `pushGraphicsState()` and before `renderObject()`

**Color alpha**
- `parseColor` already extracts `.a` but callers discard it
- In all renderers that call `parseColor(obj.fill)` or `parseColor(obj.stroke)`, if `color.a < 1`, apply via the same ExtGState mechanism combined with `obj.opacity` (combined = `color.a * obj.opacity`)

---

### 3. Shadow Layer (base-renderer.ts)

**Solid shadow only (no blur)**
- In `BaseRenderer.render()`, check `obj.shadow != null`
- If shadow exists, before the main render pass:
  1. Create a shallow clone of the object: `{ ...obj, left: obj.left + offsetX, top: obj.top + offsetY, fill: shadow.color, stroke: affectStroke ? shadow.color : null, shadow: null }`
  2. `pushGraphicsState()`
  3. Push opacity from shadow color's alpha via ExtGState
  4. Call `applyTransformations(shadowClone, page, context)` with the clone
  5. Call `this.renderObject(shadowClone, page, context)`
  6. `popGraphicsState()`
- Never mutate the original `obj` — always use the clone for the shadow pass
- Shadow always renders below main object (drawn first)

---

### 4. Blend Modes (base-renderer.ts + opacity-utils.ts)

- Extend `applyOpacity` into `applyGraphicsState(page, pdfDoc, { opacity, blendMode })`
- Map Fabric `globalCompositeOperation` → PDF `/BM` name:
  - `source-over` → `Normal`, `multiply` → `Multiply`, `screen` → `Screen`
  - `overlay` → `Overlay`, `darken` → `Darken`, `lighten` → `Lighten`
  - `color-dodge` → `ColorDodge`, `color-burn` → `ColorBurn`
  - `hard-light` → `HardLight`, `soft-light` → `SoftLight`
  - `difference` → `Difference`, `exclusion` → `Exclusion`
  - Unsupported values (xor, destination-over, etc.) → warn + use `Normal`
- Include `/BM` in the same ExtGState dict as `ca`/`CA`

---

### 5. ClipPath Layer (new clip-path.ts + all renderers)

**Path tracer functions** — produce a PDF path without filling/stroking:

| Shape | Trace method |
|-------|-------------|
| `rect` | `moveTo` four corners with optional arc for rx/ry |
| `circle` | 4-bezier approximation (κ = 0.5523) |
| `ellipse` | Same as circle but with rx/ry |
| `triangle` | 3 `lineTo` calls |
| `line` | `moveTo` + `lineTo` |
| `path` | Re-use path-utils command interpreter |
| `polygon` | Points → lineTo sequence |
| `polyline` | Same as polygon |

**Application in BaseRenderer.render():**
- If `obj.clipPath` exists:
  1. `pushGraphicsState()`
  2. Apply clip path's own transform (applyTransformations for the clipPath object)
  3. Trace the clip path shape using the tracer
  4. Push `clip()` + `endPath()` operators
  5. `popGraphicsState()` of the clipPath subtree, then draw main object
- Group `clipPath` clips all children — apply before iterating group children

---

### 6. Image cropX/cropY (image.renderer.ts)

- Before `drawImageInCanvas`, establish a clip region:
  1. `pushGraphicsState()`
  2. Trace a rectangle of `(0, 0, obj.width, obj.height)` (the display bbox)
  3. Push `clip()` + `endPath()`
  4. Draw image at `(-cropX, -cropY)` offset — full unscaled image, clipped to display bbox
  5. `popGraphicsState()`
- Only applies when `cropX > 0 || cropY > 0`

---

## Demo App Changes

**New controls per object type:**

All objects:
- Opacity slider (already in UI, but needs to be wired through — currently UI exists but converter ignores it)
- Blend mode dropdown (`source-over`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `difference`)
- Shadow toggle + controls: color picker, offsetX, offsetY inputs

Text objects (additional):
- Underline / Strikethrough / Overline checkboxes
- Text Background Color picker
- Char Spacing input (number)
- Text Align: add Justify option to existing dropdown
- Bold / Italic toggles (already in font family select — add explicit bold/italic buttons)

**Demo preset objects**: Add a "Load Demo" button that populates the canvas with objects exercising all new features (a text with underline, a rect with opacity, a shape with shadow, etc.) so the user can test quickly without manually building.

---

## Test Strategy

**Location**: `tests/unit/renderers/` (new files) and additions to existing files

**New test files:**
- `tests/unit/renderers/text-decorations.test.ts` — underline, linethrough, overline, textBackgroundColor, charSpacing, justify
- `tests/unit/renderers/text-styles.test.ts` — per-character style runs, font resolution caching, x-cursor advance
- `tests/unit/renderers/opacity.test.ts` — ExtGState creation, opacity < 1 triggers it, opacity = 1 skips it, color alpha combination
- `tests/unit/renderers/shadow.test.ts` — shadow renders before main object, offsetX/offsetY applied, affectStroke respected
- `tests/unit/renderers/blend-mode.test.ts` — Fabric→PDF blend mode mapping, unsupported values warn
- `tests/unit/renderers/clip-path.test.ts` — clip operator emitted, each shape tracer produces correct path

**Approach**: Follow the mock pattern in existing tests — mock `page.pushOperators`, inspect calls to verify correct operators are pushed in correct order.

---

## Files Changed

| File | Change |
|------|--------|
| `src/renderers/text.renderer.ts` | Add charSpacing, decorations, textBackgroundColor, justify, style runs |
| `src/renderers/base-renderer.ts` | Add opacity, shadow, blend mode, clipPath hooks |
| `src/renderers/image.renderer.ts` | Add cropX/cropY clip |
| `src/renderers/clip-path.ts` | New — path tracer per shape type |
| `src/renderers/graphics-state.ts` | New — ExtGState builder for opacity + blend mode |
| `demo/src/main.ts` | Add new property controls + demo preset |
| `demo/index.html` | New CSS for decoration/shadow controls |

---

## Out of Scope

- Gradient fills (linear, radial)
- Shadow blur (Gaussian approximation or raster)
- Pattern fills
- Image filters (brightness, contrast, etc.)
- `resizeFilter`, `crossOrigin`
