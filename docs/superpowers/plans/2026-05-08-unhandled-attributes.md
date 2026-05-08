# Unhandled Fabric Attributes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement opacity, blend modes, shadow, text decorations, charSpacing, textBackgroundColor, justify, per-character styles, clipPath, and image cropX/cropY in the PDF converter, with demo app controls and unit tests for each.

**Architecture:** Each feature is layered: graphics-state utility first (opacity/blend mode ExtGState), then BaseRenderer hooks (opacity, shadow, clipPath), then text renderer enhancements (decorations, spacing, style runs), then image renderer (crop), finally demo app wiring. No gradients or shadow blur.

**Tech Stack:** pdf-lib 1.17.1, Fabric.js 5.x, Vitest, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/renderers/graphics-state.ts` | **CREATE** | ExtGState builder: opacity + blend mode |
| `src/renderers/clip-path.ts` | **CREATE** | Path tracer: converts FabricObject to clip region |
| `src/renderers/base-renderer.ts` | **MODIFY** | Add opacity, shadow, blend mode, clipPath hooks in `render()` |
| `src/renderers/text.renderer.ts` | **MODIFY** | charSpacing, decorations, textBackgroundColor, justify, style runs |
| `src/renderers/image.renderer.ts` | **MODIFY** | cropX/cropY clip region |
| `src/core/converter.ts` | **MODIFY** | Shadow pre-render pass |
| `tests/unit/renderers/graphics-state.test.ts` | **CREATE** | Tests for ExtGState builder |
| `tests/unit/renderers/text-decorations.test.ts` | **CREATE** | Tests for decorations + charSpacing + textBg + justify |
| `tests/unit/renderers/text-styles.test.ts` | **CREATE** | Tests for per-character style runs |
| `tests/unit/renderers/shadow.test.ts` | **CREATE** | Tests for shadow pre-render |
| `tests/unit/renderers/clip-path.test.ts` | **CREATE** | Tests for path tracer + clip integration |
| `demo/src/main.ts` | **MODIFY** | New property controls for all features |
| `demo/index.html` | **MODIFY** | CSS for new controls |

---

## Task 1: Graphics State Utility (opacity + blend modes)

**Files:**
- Create: `src/renderers/graphics-state.ts`
- Create: `tests/unit/renderers/graphics-state.test.ts`

- [ ] **Step 1.1: Write failing tests**

Create `tests/unit/renderers/graphics-state.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyGraphicsState, resetGsCounter } from '../../../src/renderers/graphics-state';
import type { PDFPage, PDFDocument } from 'pdf-lib';

function createMockPage() {
  const extGStateDict = { set: vi.fn() };
  const resourcesDict = {
    lookup: vi.fn().mockReturnValue(extGStateDict),
    set: vi.fn(),
  };
  return {
    page: {
      pushOperators: vi.fn(),
      node: {
        Resources: vi.fn().mockReturnValue(resourcesDict),
      },
    } as unknown as PDFPage,
    extGStateDict,
    resourcesDict,
  };
}

function createMockPdfDoc() {
  return {
    context: {
      obj: vi.fn().mockImplementation((entries) => ({ _entries: entries, set: vi.fn() })),
    },
  } as unknown as PDFDocument;
}

describe('applyGraphicsState', () => {
  beforeEach(() => { resetGsCounter(); });

  it('does nothing when opacity is 1 and blendMode is source-over', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: 'source-over' });
    expect(page.pushOperators).not.toHaveBeenCalled();
  });

  it('emits gs operator when opacity < 1', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    expect(page.pushOperators).toHaveBeenCalledTimes(1);
  });

  it('creates ExtGState dict with ca and CA set to opacity', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    const contextObj = vi.mocked(pdfDoc.context.obj).mock.calls[0]![0] as Record<string, unknown>;
    expect(contextObj['ca']).toBe(0.5);
    expect(contextObj['CA']).toBe(0.5);
  });

  it('emits gs operator when blendMode is multiply', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: 'multiply' });
    expect(page.pushOperators).toHaveBeenCalledTimes(1);
  });

  it('maps Fabric blend mode names to PDF BM values', () => {
    const cases: Array<[string, string]> = [
      ['multiply', 'Multiply'],
      ['screen', 'Screen'],
      ['overlay', 'Overlay'],
      ['darken', 'Darken'],
      ['lighten', 'Lighten'],
      ['color-dodge', 'ColorDodge'],
      ['color-burn', 'ColorBurn'],
      ['hard-light', 'HardLight'],
      ['soft-light', 'SoftLight'],
      ['difference', 'Difference'],
      ['exclusion', 'Exclusion'],
    ];
    for (const [fabricBm, pdfBm] of cases) {
      resetGsCounter();
      const { page } = createMockPage();
      const pdfDoc = createMockPdfDoc();
      applyGraphicsState(page, pdfDoc, { opacity: 1, blendMode: fabricBm });
      const contextObj = vi.mocked(pdfDoc.context.obj).mock.calls[0]![0] as Record<string, unknown>;
      expect(contextObj['BM']).toBe(pdfBm);
    }
  });

  it('creates ExtGState with no-repeat resources when ExtGState dict already exists', () => {
    const { page, extGStateDict } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    applyGraphicsState(page, pdfDoc, { opacity: 0.3 });
    // Both calls should register entries on the extGStateDict
    expect(extGStateDict.set).toHaveBeenCalledTimes(2);
  });

  it('uses unique gs names for successive calls', () => {
    const { page } = createMockPage();
    const pdfDoc = createMockPdfDoc();
    applyGraphicsState(page, pdfDoc, { opacity: 0.5 });
    applyGraphicsState(page, pdfDoc, { opacity: 0.3 });
    const calls = vi.mocked(page.pushOperators).mock.calls;
    // Each call should push a different gs name
    const op0 = calls[0]![0] as { args: Array<{ decodeText: () => string }> };
    const op1 = calls[1]![0] as { args: Array<{ decodeText: () => string }> };
    expect(op0).not.toEqual(op1);
  });
});
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd /Users/ashishmishra/Documents/personal/pdfmake/canvas-pdflib-converter
npx vitest run tests/unit/renderers/graphics-state.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 1.3: Create the graphics-state utility**

Create `src/renderers/graphics-state.ts`:

```typescript
import { PDFName, PDFDict, PDFOperator } from 'pdf-lib';
import type { PDFPage, PDFDocument } from 'pdf-lib';

const BLEND_MODE_MAP: Record<string, string> = {
  'multiply': 'Multiply',
  'screen': 'Screen',
  'overlay': 'Overlay',
  'darken': 'Darken',
  'lighten': 'Lighten',
  'color-dodge': 'ColorDodge',
  'color-burn': 'ColorBurn',
  'hard-light': 'HardLight',
  'soft-light': 'SoftLight',
  'difference': 'Difference',
  'exclusion': 'Exclusion',
};

let gsCounter = 0;

export function resetGsCounter(): void {
  gsCounter = 0;
}

export function applyGraphicsState(
  page: PDFPage,
  pdfDoc: PDFDocument,
  options: { opacity?: number; blendMode?: string },
): void {
  const opacity = options.opacity ?? 1;
  const blendMode = options.blendMode ?? 'source-over';

  const isOpaque = opacity >= 0.999;
  const isNormal = blendMode === 'source-over' || blendMode === 'normal' || blendMode === '';

  if (isOpaque && isNormal) return;

  const gsName = `GS_${String(gsCounter++).padStart(4, '0')}`;

  const entries: Record<string, unknown> = { Type: 'ExtGState' };
  if (!isOpaque) {
    entries['ca'] = opacity;
    entries['CA'] = opacity;
  }
  if (!isNormal) {
    entries['BM'] = BLEND_MODE_MAP[blendMode] ?? 'Normal';
  }

  const gsDict = pdfDoc.context.obj(entries);

  // Get or create ExtGState dict in page resources
  const resourcesDict = (page.node as unknown as { Resources: () => PDFDict }).Resources();
  let extGState = resourcesDict.lookup(PDFName.of('ExtGState')) as PDFDict | undefined;
  if (!extGState) {
    extGState = pdfDoc.context.obj({}) as PDFDict;
    resourcesDict.set(PDFName.of('ExtGState'), extGState);
  }
  extGState.set(PDFName.of(gsName), gsDict);

  page.pushOperators(PDFOperator.of('gs', [PDFName.of(gsName)]));
}
```

- [ ] **Step 1.4: Run tests to confirm they pass**

```bash
npx vitest run tests/unit/renderers/graphics-state.test.ts
```
Expected: all PASS.

- [ ] **Step 1.5: Commit**

```bash
git add src/renderers/graphics-state.ts tests/unit/renderers/graphics-state.test.ts
git commit -m "feat(graphics-state): add ExtGState builder for opacity and blend modes"
```

---

## Task 2: Opacity and Blend Mode in BaseRenderer

**Files:**
- Modify: `src/renderers/base-renderer.ts`
- Modify: `tests/unit/renderers/base-renderer.test.ts`

- [ ] **Step 2.1: Add failing tests to base-renderer.test.ts**

Open `tests/unit/renderers/base-renderer.test.ts` and add the following describe block at the end of the file (before the final `}`):

```typescript
  describe('opacity and blend mode', () => {
    it('calls applyGraphicsState when opacity < 1', async () => {
      // Arrange: renderer with a concrete renderObject
      class TestRenderer extends BaseRenderer {
        readonly type = 'rect';
        renderObject = vi.fn();
      }
      const renderer = new TestRenderer();

      const obj = createMockObject({ opacity: 0.5 });
      const page = createMockPage();
      const context = createMockContext(page);

      // Act
      await renderer.render(obj as unknown as FabricObject, page, context);

      // Assert: pushOperators was called (for the gs operator)
      const allOpCalls = vi.mocked(page.pushOperators).mock.calls.flat();
      // The gs PDFOperator has name 'gs'
      const hasGsOp = allOpCalls.some(
        (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'gs',
      );
      expect(hasGsOp).toBe(true);
    });

    it('does not emit gs operator when opacity is 1 and blendMode is source-over', async () => {
      class TestRenderer extends BaseRenderer {
        readonly type = 'rect';
        renderObject = vi.fn();
      }
      const renderer = new TestRenderer();
      const obj = createMockObject({ opacity: 1, globalCompositeOperation: 'source-over' });
      const page = createMockPage();
      const context = createMockContext(page);

      await renderer.render(obj as unknown as FabricObject, page, context);

      const allOpCalls = vi.mocked(page.pushOperators).mock.calls.flat();
      const hasGsOp = allOpCalls.some(
        (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'gs',
      );
      expect(hasGsOp).toBe(false);
    });
  });
```

Also update the `createMockContext` helper in that file to include `pdfDoc` with context mock if not already present. Look at the existing helper and add:
```typescript
pdfDoc: {
  context: {
    obj: vi.fn().mockImplementation(() => ({ set: vi.fn(), lookup: vi.fn() })),
  },
} as unknown as RenderContext['pdfDoc'],
```
And add to the page mock:
```typescript
node: {
  Resources: vi.fn().mockReturnValue({
    lookup: vi.fn().mockReturnValue({ set: vi.fn() }),
    set: vi.fn(),
  }),
},
```

- [ ] **Step 2.2: Run failing tests**

```bash
npx vitest run tests/unit/renderers/base-renderer.test.ts
```
Expected: new tests FAIL.

- [ ] **Step 2.3: Modify base-renderer.ts to apply opacity and blend mode**

In `src/renderers/base-renderer.ts`, add import and update `render()`:

```typescript
import type { PDFPage } from 'pdf-lib';
import { setDashPattern, setLineCap, setLineJoin, pushGraphicsState, popGraphicsState } from 'pdf-lib';
import type { FabricObject, RenderContext, ObjectRenderer, StrokeLineCap, StrokeLineJoin } from '../types';
import { applyGraphicsState } from './graphics-state';

// ... (keep abstract class declaration as-is)

  async render(obj: FabricObject, page: PDFPage, context: RenderContext): Promise<void> {
    if (obj.visible === false) {
      return;
    }

    page.pushOperators(pushGraphicsState());

    try {
      // Apply opacity and blend mode via PDF ExtGState
      const opacity = obj.opacity ?? 1;
      const blendMode = obj.globalCompositeOperation ?? 'source-over';
      applyGraphicsState(page, context.pdfDoc, { opacity, blendMode });

      await Promise.resolve(this.renderObject(obj, page, context));
    } finally {
      page.pushOperators(popGraphicsState());
    }
  }
```

- [ ] **Step 2.4: Run tests**

```bash
npx vitest run tests/unit/renderers/base-renderer.test.ts
npx vitest run tests/unit/renderers/rect.renderer.test.ts
```
Expected: all PASS (existing tests must not regress).

- [ ] **Step 2.5: Commit**

```bash
git add src/renderers/base-renderer.ts tests/unit/renderers/base-renderer.test.ts
git commit -m "feat(opacity): apply ExtGState opacity and blend mode in BaseRenderer"
```

---

## Task 3: Shadow Pre-Render in Converter

**Files:**
- Modify: `src/core/converter.ts`
- Create: `tests/unit/renderers/shadow.test.ts`

- [ ] **Step 3.1: Write failing shadow tests**

Create `tests/unit/renderers/shadow.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { convertCanvasToPdf } from '../../../src/core/converter';
import type { ResolvedConverterOptions, FabricCanvasJSON } from '../../../src/types';

function makeOptions(): ResolvedConverterOptions {
  return {
    pageWidth: 400,
    pageHeight: 300,
    scale: 1,
    fonts: {},
    defaultFont: 'Helvetica',
    onUnsupported: 'warn',
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    maxGroupDepth: 20,
  };
}

describe('shadow rendering', () => {
  it('produces a PDF without error when shadow is set on a rect', async () => {
    const canvas: FabricCanvasJSON = {
      version: '5.3.0',
      objects: [
        {
          type: 'rect',
          left: 100, top: 100, width: 80, height: 60,
          scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
          flipX: false, flipY: false,
          originX: 'left', originY: 'top',
          fill: '#ff0000', stroke: null, strokeWidth: 0,
          strokeDashArray: null, strokeLineCap: 'butt',
          strokeLineJoin: 'miter', strokeMiterLimit: 4,
          strokeUniform: false, opacity: 1, visible: true,
          shadow: { color: 'rgba(0,0,0,0.5)', blur: 0, offsetX: 5, offsetY: 5, affectStroke: false, nonScaling: false },
          globalCompositeOperation: 'source-over',
          rx: 0, ry: 0,
        },
      ],
    };
    const result = await convertCanvasToPdf(canvas, makeOptions());
    expect(result.pdfBytes.length).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('produces a larger PDF bytes output when shadow is present vs absent (shadow adds content)', async () => {
    const baseObj = {
      type: 'rect' as const,
      left: 100, top: 100, width: 80, height: 60,
      scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
      flipX: false, flipY: false,
      originX: 'left' as const, originY: 'top' as const,
      fill: '#ff0000', stroke: null, strokeWidth: 0,
      strokeDashArray: null, strokeLineCap: 'butt' as const,
      strokeLineJoin: 'miter' as const, strokeMiterLimit: 4,
      strokeUniform: false, opacity: 1, visible: true,
      shadow: null,
      globalCompositeOperation: 'source-over',
      rx: 0, ry: 0,
    };

    const noShadow = await convertCanvasToPdf({ version: '5.3.0', objects: [baseObj] }, makeOptions());
    const withShadow = await convertCanvasToPdf({
      version: '5.3.0',
      objects: [{ ...baseObj, shadow: { color: 'rgba(0,0,0,0.5)', blur: 0, offsetX: 5, offsetY: 5, affectStroke: false, nonScaling: false } }],
    }, makeOptions());

    expect(withShadow.pdfBytes.length).toBeGreaterThan(noShadow.pdfBytes.length);
  });

  it('does not render shadow when shadow is null', async () => {
    const canvas: FabricCanvasJSON = {
      version: '5.3.0',
      objects: [
        {
          type: 'rect',
          left: 100, top: 100, width: 80, height: 60,
          scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
          flipX: false, flipY: false,
          originX: 'left', originY: 'top',
          fill: '#ff0000', stroke: null, strokeWidth: 0,
          strokeDashArray: null, strokeLineCap: 'butt',
          strokeLineJoin: 'miter', strokeMiterLimit: 4,
          strokeUniform: false, opacity: 1, visible: true,
          shadow: null,
          globalCompositeOperation: 'source-over',
          rx: 0, ry: 0,
        },
      ],
    };
    const result = await convertCanvasToPdf(canvas, makeOptions());
    expect(result.pdfBytes.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3.2: Run failing tests**

```bash
npx vitest run tests/unit/renderers/shadow.test.ts
```
Expected: "produces a larger PDF" test FAIL (shadow currently ignored).

- [ ] **Step 3.3: Add shadow pre-render to converter.ts**

In `src/core/converter.ts`, modify the `renderObject` function:

```typescript
async function renderObject(
  obj: FabricObject,
  page: PDFPage,
  context: RenderContext,
): Promise<void> {
  if (obj.visible === false) {
    return;
  }

  const renderer = context.registry.get(obj.type);
  if (!renderer) {
    if (context.options.onUnsupported === 'warn') {
      context.warnings.add({
        type: 'unsupported_feature',
        objectType: obj.type,
        objectIndex: -1,
        feature: 'object_type',
        message: `Unsupported object type: ${obj.type}`,
      });
    } else if (context.options.onUnsupported === 'error') {
      throw new InvalidInputError(`Unsupported object type: ${obj.type}`);
    }
    return;
  }

  // Shadow pre-pass: render a clone at the offset position before the main object
  if (obj.shadow) {
    const shadow = obj.shadow;
    const shadowColor = shadow.color ?? 'rgba(0,0,0,0.5)';
    const parsedShadowColor = parseColor(shadowColor);
    const shadowOpacity = parsedShadowColor?.a ?? 0.5;

    const shadowClone: FabricObject = {
      ...obj,
      left: (obj.left ?? 0) + (shadow.offsetX ?? 0),
      top: (obj.top ?? 0) + (shadow.offsetY ?? 0),
      fill: shadowColor,
      stroke: shadow.affectStroke ? shadowColor : null,
      opacity: shadowOpacity,
      shadow: null,
    };

    page.pushOperators(pushGraphicsState());
    try {
      applyTransformations(shadowClone, page, context);
      await renderer.render(shadowClone, page, context);
    } finally {
      page.pushOperators(popGraphicsState());
    }
  }

  // Main render pass
  page.pushOperators(pushGraphicsState());
  try {
    applyTransformations(obj, page, context);
    await renderer.render(obj, page, context);
  } finally {
    page.pushOperators(popGraphicsState());
  }
}
```

Make sure `parseColor` is imported at the top of converter.ts (it already is as a bottom import — move it to the top with other imports):
```typescript
import { parseColor } from '../color';
```
Remove the duplicate import at the bottom of the file.

- [ ] **Step 3.4: Run tests**

```bash
npx vitest run tests/unit/renderers/shadow.test.ts
npx vitest run tests/unit/core/converter.test.ts
```
Expected: all PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/core/converter.ts tests/unit/renderers/shadow.test.ts
git commit -m "feat(shadow): render solid shadow clone before main object"
```

---

## Task 4: Text — charSpacing

**Files:**
- Modify: `src/renderers/text.renderer.ts`
- Create: `tests/unit/renderers/text-decorations.test.ts`

- [ ] **Step 4.1: Write failing charSpacing test**

Create `tests/unit/renderers/text-decorations.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextRenderer } from '../../../src/renderers/text.renderer';
import type { FabricTextObject, RenderContext } from '../../../src/types';
import type { PDFPage, PDFFont } from 'pdf-lib';
import { resetGsCounter } from '../../../src/renderers/graphics-state';

function createMockFont(): PDFFont {
  return {
    widthOfTextAtSize: vi.fn().mockImplementation((text: string, size: number) => text.length * size * 0.5),
    heightAtSize: vi.fn().mockImplementation((size: number) => size * 1.2),
  } as unknown as PDFFont;
}

function createMockText(overrides: Partial<FabricTextObject> = {}): FabricTextObject {
  return {
    type: 'text',
    left: 0, top: 0, width: 300, height: 50,
    scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
    flipX: false, flipY: false,
    originX: 'left', originY: 'top',
    fill: '#000000', stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeLineJoin: 'miter', strokeMiterLimit: 4,
    strokeUniform: false, opacity: 1, visible: true,
    text: 'Hello World',
    fontFamily: 'Helvetica',
    fontSize: 20,
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: 1.16,
    textAlign: 'left',
    textBackgroundColor: null,
    charSpacing: 0,
    styles: {},
    underline: false,
    linethrough: false,
    overline: false,
    shadow: null,
    globalCompositeOperation: 'source-over',
    ...overrides,
  } as FabricTextObject;
}

function createMockContext(): RenderContext {
  const font = createMockFont();
  return {
    pdfDoc: {
      context: {
        obj: vi.fn().mockImplementation(() => ({ set: vi.fn(), lookup: vi.fn() })),
      },
    } as unknown as RenderContext['pdfDoc'],
    page: {
      drawText: vi.fn(),
      drawSvgPath: vi.fn(),
      pushOperators: vi.fn(),
      node: {
        Resources: vi.fn().mockReturnValue({
          lookup: vi.fn().mockReturnValue({ set: vi.fn() }),
          set: vi.fn(),
        }),
      },
    } as unknown as PDFPage,
    fontManager: {
      resolve: vi.fn().mockResolvedValue(font),
    },
    imageLoader: {} as RenderContext['imageLoader'],
    options: {
      scale: 1, pageWidth: 595, pageHeight: 842,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      fonts: {}, defaultFont: 'Helvetica',
      onUnsupported: 'warn', maxGroupDepth: 20,
    },
    warnings: { add: vi.fn(), getAll: vi.fn().mockReturnValue([]), hasWarnings: vi.fn() },
    renderObject: vi.fn(),
    currentDepth: 0,
  };
}

describe('charSpacing', () => {
  beforeEach(() => { resetGsCounter(); });

  it('emits Tc operator when charSpacing is non-zero', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ charSpacing: 200, fontSize: 20 });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const tcOp = allOps.find(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tc',
    );
    expect(tcOp).toBeDefined();
  });

  it('Tc value equals charSpacing/1000 * fontSize', async () => {
    const renderer = new TextRenderer();
    // charSpacing=200, fontSize=20 → Tc = 200/1000*20 = 4
    const text = createMockText({ charSpacing: 200, fontSize: 20 });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const tcOp = allOps.find(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tc',
    ) as { args: Array<{ numberValue: number }> } | undefined;
    expect(tcOp?.args[0]?.numberValue).toBeCloseTo(4, 3);
  });

  it('does NOT emit Tc operator when charSpacing is 0', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ charSpacing: 0 });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const tcOp = allOps.find(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tc',
    );
    expect(tcOp).toBeUndefined();
  });
});
```

- [ ] **Step 4.2: Run to confirm failure**

```bash
npx vitest run tests/unit/renderers/text-decorations.test.ts --reporter=verbose 2>&1 | head -40
```
Expected: FAIL — Tc operator not emitted.

- [ ] **Step 4.3: Implement charSpacing in text.renderer.ts**

In `src/renderers/text.renderer.ts`, add to the imports:
```typescript
import { rgb, PDFOperator, PDFNumber } from 'pdf-lib';
```

In the `renderObject` method, before the `for` loop over lines, add:
```typescript
const charSpacingPt = obj.charSpacing !== 0
  ? (obj.charSpacing / 1000) * obj.fontSize
  : 0;
```

Then inside the loop, before each `drawTextInCanvas` call, push the operator:
```typescript
if (charSpacingPt !== 0) {
  page.pushOperators(PDFOperator.of('Tc', [PDFNumber.of(charSpacingPt)]));
}

drawTextInCanvas(page, line, { ... });

if (charSpacingPt !== 0) {
  page.pushOperators(PDFOperator.of('Tc', [PDFNumber.of(0)]));
}
```

- [ ] **Step 4.4: Run tests**

```bash
npx vitest run tests/unit/renderers/text-decorations.test.ts
npx vitest run tests/unit/renderers/text.renderer.test.ts
```
Expected: charSpacing tests PASS, existing text tests PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/renderers/text.renderer.ts tests/unit/renderers/text-decorations.test.ts
git commit -m "feat(text): implement charSpacing via PDF Tc operator"
```

---

## Task 5: Text — textBackgroundColor and Decorations

**Files:**
- Modify: `src/renderers/text.renderer.ts`
- Modify: `tests/unit/renderers/text-decorations.test.ts`

- [ ] **Step 5.1: Add failing tests for textBackgroundColor and decorations**

Add to `tests/unit/renderers/text-decorations.test.ts`:

```typescript
describe('textBackgroundColor', () => {
  it('calls drawSvgPath for background rect when textBackgroundColor is set', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ textBackgroundColor: '#ffff00' });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalled();
  });

  it('does NOT call drawSvgPath for background when textBackgroundColor is null', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ textBackgroundColor: null });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).not.toHaveBeenCalled();
  });
});

describe('text decorations', () => {
  it('draws an extra drawSvgPath when underline is true', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ underline: true });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalled();
  });

  it('draws an extra drawSvgPath when linethrough is true', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ linethrough: true });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalled();
  });

  it('draws an extra drawSvgPath when overline is true', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ overline: true });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalled();
  });

  it('draws NO extra drawSvgPath when all decorations are false and no background', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ underline: false, linethrough: false, overline: false, textBackgroundColor: null });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).not.toHaveBeenCalled();
  });

  it('draws 3 decoration paths when all three decorations are enabled', async () => {
    const renderer = new TextRenderer();
    // Single line text with all decorations
    const text = createMockText({ underline: true, linethrough: true, overline: true, text: 'hello' });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    // Each decoration = 1 drawSvgPath call per line; 1 line × 3 decorations = 3 calls
    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(3);
  });

  it('draws decoration paths for each line in multi-line text', async () => {
    const renderer = new TextRenderer();
    const text = createMockText({ underline: true, text: 'line1\nline2' });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 5.2: Run to confirm failure**

```bash
npx vitest run tests/unit/renderers/text-decorations.test.ts 2>&1 | grep -E "FAIL|PASS|×|✓" | head -30
```

- [ ] **Step 5.3: Implement textBackgroundColor and decorations in text.renderer.ts**

Add these helper functions at the top of the file (after imports, before the class):

```typescript
const FABRIC_FONT_SIZE_MULT = 1.13; // keep as-is, remove duplicate below

function drawDecoratedLine(
  page: PDFPage,
  line: string,
  xOffset: number,
  baselineY: number,
  lineHeightPx: number,
  fontSize: number,
  lineWidth: number,
  pdfColor: ReturnType<typeof rgb> | undefined,
  options: {
    textBackgroundColor?: string | null;
    underline?: boolean;
    linethrough?: boolean;
    overline?: boolean;
  },
): void {
  const thickness = Math.max(1, fontSize / 15);

  // textBackgroundColor: rect from top of line bbox to bottom
  if (options.textBackgroundColor) {
    const bgColor = parseColor(options.textBackgroundColor);
    if (bgColor) {
      const bgPdfColor = rgb(bgColor.r, bgColor.g, bgColor.b);
      const bgTop = baselineY - fontSize * FABRIC_FONT_SIZE_MULT;
      drawSvgPathInCanvas(page,
        `M ${xOffset} ${bgTop} h ${lineWidth} v ${lineHeightPx} h ${-lineWidth} Z`,
        { color: bgPdfColor },
      );
    }
  }

  // underline: just below baseline
  if (options.underline) {
    const y = baselineY + fontSize * 0.07;
    drawSvgPathInCanvas(page,
      `M ${xOffset} ${y} h ${lineWidth} v ${thickness} h ${-lineWidth} Z`,
      { color: pdfColor },
    );
  }

  // linethrough: mid x-height (above baseline)
  if (options.linethrough) {
    const y = baselineY - fontSize * 0.35;
    drawSvgPathInCanvas(page,
      `M ${xOffset} ${y} h ${lineWidth} v ${thickness} h ${-lineWidth} Z`,
      { color: pdfColor },
    );
  }

  // overline: above ascender
  if (options.overline) {
    const y = baselineY - fontSize * 0.85;
    drawSvgPathInCanvas(page,
      `M ${xOffset} ${y} h ${lineWidth} v ${thickness} h ${-lineWidth} Z`,
      { color: pdfColor },
    );
  }
}
```

In the `renderObject` method, add a call to `drawDecoratedLine` after each `drawTextInCanvas`:

```typescript
const lineWidth = getTextWidth(font, line, obj.fontSize);

// Draw background + text + decorations in order
drawDecoratedLine(page, line, xOffset, baselineY, lineHeightPx, obj.fontSize, lineWidth, pdfColor, {
  textBackgroundColor: obj.textBackgroundColor,
});

drawTextInCanvas(page, line, { x: xOffset, y: baselineY, size: obj.fontSize, font, color: pdfColor });

drawDecoratedLine(page, line, xOffset, baselineY, lineHeightPx, obj.fontSize, lineWidth, pdfColor, {
  underline: obj.underline,
  linethrough: obj.linethrough,
  overline: obj.overline,
});
```

Note: background is drawn BEFORE text; decorations (underline etc.) are drawn AFTER text. Split the `drawDecoratedLine` call into two: one for background (before drawText), one for decorations (after drawText), or pass a `phase` flag. Cleanest: call it twice with different option sets as shown above.

Also add `drawSvgPathInCanvas` to the imports in text.renderer.ts:
```typescript
import { drawTextInCanvas, drawSvgPathInCanvas } from './draw-helpers';
```

- [ ] **Step 5.4: Run tests**

```bash
npx vitest run tests/unit/renderers/text-decorations.test.ts
npx vitest run tests/unit/renderers/text.renderer.test.ts
```
Expected: all PASS.

- [ ] **Step 5.5: Commit**

```bash
git add src/renderers/text.renderer.ts tests/unit/renderers/text-decorations.test.ts
git commit -m "feat(text): implement textBackgroundColor and underline/linethrough/overline decorations"
```

---

## Task 6: Text — Justify Alignment

**Files:**
- Modify: `src/renderers/text.renderer.ts`
- Modify: `tests/unit/renderers/text-decorations.test.ts`

- [ ] **Step 6.1: Add failing justify tests**

Add to `tests/unit/renderers/text-decorations.test.ts`:

```typescript
describe('justify alignment', () => {
  it('emits Tw operator for justify on non-last lines that contain spaces', async () => {
    const renderer = new TextRenderer();
    // Two lines: first line has spaces and is NOT the last line
    const text = createMockText({
      textAlign: 'justify',
      text: 'hello world\nsecond line',
      width: 200,
      fontSize: 20,
    });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const twOps = allOps.filter(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tw',
    );
    // At least one Tw should be emitted (for the first line)
    expect(twOps.length).toBeGreaterThan(0);
  });

  it('does NOT emit Tw for the last line in justify mode', async () => {
    const renderer = new TextRenderer();
    // Single line: IS the last line — should not justify
    const text = createMockText({
      textAlign: 'justify',
      text: 'only line here',
      width: 200,
      fontSize: 20,
    });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const twOps = allOps.filter(
      (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tw',
    );
    expect(twOps).toHaveLength(0);
  });

  it('does NOT emit Tw for left/center/right alignment', async () => {
    for (const align of ['left', 'center', 'right'] as const) {
      const renderer = new TextRenderer();
      const text = createMockText({ textAlign: align, text: 'hello world test', width: 200 });
      const context = createMockContext();
      await renderer.render(text, context.page, context);
      const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
      const twOps = allOps.filter(
        (op) => typeof op === 'object' && op !== null && (op as { name?: string }).name === 'Tw',
      );
      expect(twOps).toHaveLength(0);
    }
  });
});
```

- [ ] **Step 6.2: Run to confirm failure**

```bash
npx vitest run tests/unit/renderers/text-decorations.test.ts 2>&1 | grep -E "justify" | head -10
```

- [ ] **Step 6.3: Implement justify in text.renderer.ts**

In the `renderObject` `for` loop, add justify logic before the `drawTextInCanvas` call. Replace the `xOffset` block with:

```typescript
let xOffset = 0;
let wordSpacingPt = 0;

if (obj.textAlign === 'justify') {
  const isLastLine = i === lines.length - 1;
  const spaceCount = line.split(' ').length - 1;
  if (!isLastLine && spaceCount > 0) {
    const lineWidth = getTextWidth(font, line, obj.fontSize);
    const extraSpace = obj.width - lineWidth;
    wordSpacingPt = extraSpace / spaceCount;
    page.pushOperators(PDFOperator.of('Tw', [PDFNumber.of(wordSpacingPt)]));
  }
  // justify last line = left-aligned, xOffset stays 0
} else if (obj.textAlign !== 'left') {
  const lineWidth = getTextWidth(font, line, obj.fontSize);
  if (obj.textAlign === 'center') {
    xOffset = (obj.width - lineWidth) / 2;
  } else if (obj.textAlign === 'right') {
    xOffset = obj.width - lineWidth;
  }
}
```

After the `drawTextInCanvas` call, reset word spacing if it was set:
```typescript
if (wordSpacingPt !== 0) {
  page.pushOperators(PDFOperator.of('Tw', [PDFNumber.of(0)]));
}
```

Make sure `PDFOperator` and `PDFNumber` are imported (should already be from Task 4).

- [ ] **Step 6.4: Run tests**

```bash
npx vitest run tests/unit/renderers/text-decorations.test.ts
```
Expected: all PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/renderers/text.renderer.ts tests/unit/renderers/text-decorations.test.ts
git commit -m "feat(text): implement justify alignment via PDF Tw word-spacing operator"
```

---

## Task 7: Text — Per-Character Style Runs

**Files:**
- Modify: `src/renderers/text.renderer.ts`
- Create: `tests/unit/renderers/text-styles.test.ts`

- [ ] **Step 7.1: Write failing style-run tests**

Create `tests/unit/renderers/text-styles.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextRenderer } from '../../../src/renderers/text.renderer';
import type { FabricTextObject, FabricTextStyles, RenderContext } from '../../../src/types';
import type { PDFPage, PDFFont } from 'pdf-lib';
import { resetGsCounter } from '../../../src/renderers/graphics-state';

function createMockFont(): PDFFont {
  return {
    widthOfTextAtSize: vi.fn().mockImplementation((text: string, size: number) => text.length * size * 0.5),
    heightAtSize: vi.fn().mockImplementation((size: number) => size * 1.2),
  } as unknown as PDFFont;
}

function createMockContext(): RenderContext {
  const font = createMockFont();
  return {
    pdfDoc: {
      context: {
        obj: vi.fn().mockImplementation(() => ({ set: vi.fn(), lookup: vi.fn() })),
      },
    } as unknown as RenderContext['pdfDoc'],
    page: {
      drawText: vi.fn(),
      drawSvgPath: vi.fn(),
      pushOperators: vi.fn(),
      node: {
        Resources: vi.fn().mockReturnValue({
          lookup: vi.fn().mockReturnValue({ set: vi.fn() }),
          set: vi.fn(),
        }),
      },
    } as unknown as PDFPage,
    fontManager: {
      resolve: vi.fn().mockResolvedValue(font),
    },
    imageLoader: {} as RenderContext['imageLoader'],
    options: {
      scale: 1, pageWidth: 595, pageHeight: 842,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      fonts: {}, defaultFont: 'Helvetica',
      onUnsupported: 'warn', maxGroupDepth: 20,
    },
    warnings: { add: vi.fn(), getAll: vi.fn().mockReturnValue([]), hasWarnings: vi.fn() },
    renderObject: vi.fn(),
    currentDepth: 0,
  };
}

function makeText(overrides: Partial<FabricTextObject> = {}): FabricTextObject {
  return {
    type: 'text',
    left: 0, top: 0, width: 300, height: 60,
    scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
    flipX: false, flipY: false,
    originX: 'left', originY: 'top',
    fill: '#000000', stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeLineJoin: 'miter', strokeMiterLimit: 4,
    strokeUniform: false, opacity: 1, visible: true,
    text: 'AB',
    fontFamily: 'Helvetica',
    fontSize: 20,
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: 1.16,
    textAlign: 'left',
    textBackgroundColor: null,
    charSpacing: 0,
    styles: {},
    underline: false,
    linethrough: false,
    overline: false,
    shadow: null,
    globalCompositeOperation: 'source-over',
    ...overrides,
  } as FabricTextObject;
}

describe('per-character style runs', () => {
  beforeEach(() => { resetGsCounter(); });

  it('renders single drawText call when styles is empty', async () => {
    const renderer = new TextRenderer();
    const text = makeText({ text: 'Hello', styles: {} });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawText).toHaveBeenCalledTimes(1);
    expect(vi.mocked(context.page.drawText).mock.calls[0]![0]).toBe('Hello');
  });

  it('renders two drawText calls when two characters have different fill colors', async () => {
    const renderer = new TextRenderer();
    const styles: FabricTextStyles = {
      '0': {
        '0': { fill: '#ff0000' },  // 'A' = red
        // 'B' has no override → inherits black
      },
    };
    const text = makeText({ text: 'AB', styles });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    // Two runs: 'A' (red) and 'B' (black)
    expect(context.page.drawText).toHaveBeenCalledTimes(2);
    expect(vi.mocked(context.page.drawText).mock.calls[0]![0]).toBe('A');
    expect(vi.mocked(context.page.drawText).mock.calls[1]![0]).toBe('B');
  });

  it('groups consecutive characters with the same style into one run', async () => {
    const renderer = new TextRenderer();
    // A, B, C all have no override → same style → one run
    const text = makeText({ text: 'ABC', styles: {} });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    expect(context.page.drawText).toHaveBeenCalledTimes(1);
    expect(vi.mocked(context.page.drawText).mock.calls[0]![0]).toBe('ABC');
  });

  it('resolves a different font for a run with different fontWeight', async () => {
    const renderer = new TextRenderer();
    const boldFont = createMockFont();
    const styles: FabricTextStyles = {
      '0': {
        '0': { fontWeight: 'bold' },
      },
    };
    const text = makeText({ text: 'AB', styles });
    const context = createMockContext();
    // Return boldFont for bold, normalFont for normal
    vi.mocked(context.fontManager.resolve).mockImplementation(async (family, weight) => {
      return weight === 'bold' ? boldFont : createMockFont();
    });

    await renderer.render(text, context.page, context);

    // Should resolve font twice: once bold (for 'A'), once normal (for 'B')
    expect(context.fontManager.resolve).toHaveBeenCalledWith('Helvetica', 'bold', 'normal');
    expect(context.fontManager.resolve).toHaveBeenCalledWith('Helvetica', 'normal', 'normal');
  });

  it('x-cursor advances correctly: second run starts after first run width', async () => {
    const renderer = new TextRenderer();
    // 'A' red (run 1), 'B' black (run 2)
    // Font: charWidth = char.length * fontSize * 0.5 = 1 * 20 * 0.5 = 10 per char
    const styles: FabricTextStyles = {
      '0': {
        '0': { fill: '#ff0000' },
      },
    };
    const text = makeText({ text: 'AB', styles });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    // drawTextInCanvas emits a cm op with the x position encoded in args[4]
    const pushOpsCalls = vi.mocked(context.page.pushOperators).mock.calls;
    type CmOp = { name: string; args: { numberValue: number }[] };
    const cms = pushOpsCalls
      .flatMap((call) => call)
      .filter((op): op is CmOp => (op as CmOp).name === 'cm');

    // Find the two baseline cm ops (the ones from drawTextInCanvas)
    // drawTextInCanvas emits cm(1, 0, 0, -1, x, y) per call
    // With left-aligned text: first run x=0, second run x=runWidth of 'A' = 10
    const xPositions = cms.map((cm) => cm.args[4]!.numberValue);

    expect(xPositions[0]).toBeCloseTo(0, 3);   // first run starts at 0
    expect(xPositions[1]).toBeCloseTo(10, 3);  // second run starts at width of 'A' = 10
  });

  it('draws inline underline decoration per run when style overrides underline', async () => {
    const renderer = new TextRenderer();
    const styles: FabricTextStyles = {
      '0': { '0': { underline: true } }, // only 'A' is underlined
    };
    const text = makeText({ text: 'AB', styles, underline: false });
    const context = createMockContext();

    await renderer.render(text, context.page, context);

    // drawSvgPath called once (for 'A' underline); 'B' has no decoration
    expect(context.page.drawSvgPath).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 7.2: Run to confirm failures**

```bash
npx vitest run tests/unit/renderers/text-styles.test.ts 2>&1 | grep -E "FAIL|×" | head -20
```

- [ ] **Step 7.3: Refactor text.renderer.ts to use style runs**

This is the largest change. Replace the `renderObject` method with the implementation below. The key invariant: when `styles` is empty for the line, fall through to the SAME single-run path (no regression).

```typescript
// Add this interface above the class
interface EffectiveCharStyle {
  fill: string | null;
  fontSize: number;
  fontFamily: string;
  fontWeight: import('../types').FontWeight;
  fontStyle: import('../types').FontStyle;
  underline: boolean;
  linethrough: boolean;
  overline: boolean;
  textBackgroundColor: string | null;
}

interface StyleRun {
  text: string;
  style: EffectiveCharStyle;
}

function effectiveStyleKey(s: EffectiveCharStyle): string {
  return `${String(s.fill)}|${s.fontSize}|${s.fontFamily}|${String(s.fontWeight)}|${s.fontStyle}|${String(s.underline)}|${String(s.linethrough)}|${String(s.overline)}|${String(s.textBackgroundColor)}`;
}

function buildStyleRuns(line: string, lineIndex: number, obj: AnyFabricText): StyleRun[] {
  const lineStyles = (obj.styles as import('../types').FabricTextStyles)?.[lineIndex.toString()] ?? {};
  const hasAnyOverride = Object.keys(lineStyles).length > 0;

  const baseStyle: EffectiveCharStyle = {
    fill: (typeof obj.fill === 'string' ? obj.fill : null),
    fontSize: obj.fontSize,
    fontFamily: obj.fontFamily,
    fontWeight: obj.fontWeight,
    fontStyle: obj.fontStyle,
    underline: obj.underline,
    linethrough: obj.linethrough,
    overline: obj.overline,
    textBackgroundColor: obj.textBackgroundColor,
  };

  if (!hasAnyOverride) {
    return [{ text: line, style: baseStyle }];
  }

  const runs: StyleRun[] = [];
  let current: StyleRun | null = null;

  for (let j = 0; j < line.length; j++) {
    const charOverride = lineStyles[j.toString()] ?? {};
    const effective: EffectiveCharStyle = {
      fill: charOverride.fill ?? baseStyle.fill,
      fontSize: charOverride.fontSize ?? baseStyle.fontSize,
      fontFamily: charOverride.fontFamily ?? baseStyle.fontFamily,
      fontWeight: charOverride.fontWeight ?? baseStyle.fontWeight,
      fontStyle: charOverride.fontStyle ?? baseStyle.fontStyle,
      underline: charOverride.underline ?? baseStyle.underline,
      linethrough: charOverride.linethrough ?? baseStyle.linethrough,
      overline: charOverride.overline ?? baseStyle.overline,
      textBackgroundColor: charOverride.textBackgroundColor ?? baseStyle.textBackgroundColor,
    };

    const key = effectiveStyleKey(effective);
    if (current && effectiveStyleKey(current.style) === key) {
      current.text += line[j];
    } else {
      if (current) runs.push(current);
      current = { text: line[j]!, style: effective };
    }
  }
  if (current) runs.push(current);
  return runs;
}
```

Update `renderObject` to use style runs. Replace the inner loop body with:

```typescript
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]!;
  const baselineY = firstBaselineY + i * lineHeightPx;

  const runs = buildStyleRuns(line, i, obj);

  // First pass: resolve fonts and compute widths for alignment
  const resolvedRuns: Array<{ text: string; style: EffectiveCharStyle; font: PDFFont; width: number }> = [];
  const fontCache = new Map<string, PDFFont>();

  for (const run of runs) {
    const cacheKey = `${run.style.fontFamily}:${String(run.style.fontWeight)}:${run.style.fontStyle}`;
    let runFont = fontCache.get(cacheKey);
    if (!runFont) {
      runFont = await context.fontManager.resolve(run.style.fontFamily, run.style.fontWeight, run.style.fontStyle);
      fontCache.set(cacheKey, runFont);
    }
    const runWidth = getTextWidth(runFont, run.text, run.style.fontSize);
    resolvedRuns.push({ text: run.text, style: run.style, font: runFont, width: runWidth });
  }

  const totalLineWidth = resolvedRuns.reduce((sum, r) => sum + r.width, 0);

  // Compute alignment offset
  let xOffset = 0;
  let wordSpacingPt = 0;

  if (obj.textAlign === 'justify') {
    const isLastLine = i === lines.length - 1;
    const spaceCount = line.split(' ').length - 1;
    if (!isLastLine && spaceCount > 0 && runs.length === 1) {
      // Only apply Tw for single-run lines (no inline styles mixing with justify)
      const extraSpace = obj.width - totalLineWidth;
      wordSpacingPt = extraSpace / spaceCount;
      page.pushOperators(PDFOperator.of('Tw', [PDFNumber.of(wordSpacingPt)]));
    }
  } else if (obj.textAlign === 'center') {
    xOffset = (obj.width - totalLineWidth) / 2;
  } else if (obj.textAlign === 'right') {
    xOffset = obj.width - totalLineWidth;
  }

  // Second pass: draw background → text → decorations per run
  let xCursor = xOffset;

  for (const rr of resolvedRuns) {
    const runColor = parseColor(rr.style.fill);
    const runPdfColor = runColor ? rgb(runColor.r, runColor.g, runColor.b) : undefined;
    const charSpacingPt = obj.charSpacing !== 0
      ? (obj.charSpacing / 1000) * rr.style.fontSize
      : 0;

    // Background
    drawDecoratedLine(page, rr.text, xCursor, baselineY, lineHeightPx, rr.style.fontSize, rr.width, runPdfColor, {
      textBackgroundColor: rr.style.textBackgroundColor,
    });

    // Character spacing
    if (charSpacingPt !== 0) {
      page.pushOperators(PDFOperator.of('Tc', [PDFNumber.of(charSpacingPt)]));
    }

    // Draw text
    drawTextInCanvas(page, rr.text, {
      x: xCursor,
      y: baselineY,
      size: rr.style.fontSize,
      font: rr.font,
      color: runPdfColor,
    });

    if (charSpacingPt !== 0) {
      page.pushOperators(PDFOperator.of('Tc', [PDFNumber.of(0)]));
    }

    // Decorations
    drawDecoratedLine(page, rr.text, xCursor, baselineY, lineHeightPx, rr.style.fontSize, rr.width, runPdfColor, {
      underline: rr.style.underline,
      linethrough: rr.style.linethrough,
      overline: rr.style.overline,
    });

    xCursor += rr.width;
  }

  // Reset word spacing
  if (wordSpacingPt !== 0) {
    page.pushOperators(PDFOperator.of('Tw', [PDFNumber.of(0)]));
  }
}
```

Also add `PDFFont` to the imports:
```typescript
import type { PDFFont } from 'pdf-lib';
```

- [ ] **Step 7.4: Run all text tests**

```bash
npx vitest run tests/unit/renderers/text-styles.test.ts
npx vitest run tests/unit/renderers/text-decorations.test.ts
npx vitest run tests/unit/renderers/text.renderer.test.ts
```
Expected: all PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/renderers/text.renderer.ts tests/unit/renderers/text-styles.test.ts
git commit -m "feat(text): implement per-character style runs with font caching"
```

---

## Task 8: ClipPath Utility + BaseRenderer Integration

**Files:**
- Create: `src/renderers/clip-path.ts`
- Modify: `src/renderers/base-renderer.ts`
- Create: `tests/unit/renderers/clip-path.test.ts`

- [ ] **Step 8.1: Write failing clip-path tests**

Create `tests/unit/renderers/clip-path.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { traceClipPath } from '../../../src/renderers/clip-path';
import type { FabricObject } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

function createMockPage() {
  return {
    pushOperators: vi.fn(),
  } as unknown as PDFPage;
}

function makeRect(overrides: Partial<FabricObject> = {}): FabricObject {
  return {
    type: 'rect',
    left: 10, top: 20, width: 100, height: 50,
    scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
    flipX: false, flipY: false,
    originX: 'left', originY: 'top',
    fill: '#ff0000', stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeLineJoin: 'miter', strokeMiterLimit: 4,
    strokeUniform: false, opacity: 1, visible: true,
    shadow: null, globalCompositeOperation: 'source-over',
    rx: 0, ry: 0,
    ...overrides,
  } as FabricObject;
}

describe('traceClipPath', () => {
  it('pushes path operators for a rect clip path', () => {
    const page = createMockPage();
    traceClipPath(makeRect({ type: 'rect', left: 0, top: 0, width: 80, height: 40 }), page);
    expect(page.pushOperators).toHaveBeenCalled();
  });

  it('includes moveTo (m), lineTo (l), closePath (h), clip (W), and endPath (n) operators', () => {
    const page = createMockPage();
    traceClipPath(makeRect({ type: 'rect', left: 0, top: 0, width: 80, height: 40 }), page);

    const allOps = vi.mocked(page.pushOperators).mock.calls.flat();
    const opNames = allOps
      .filter((op) => typeof op === 'object' && op !== null && 'name' in (op as object))
      .map((op) => (op as { name: string }).name);

    expect(opNames).toContain('m');  // moveTo
    expect(opNames).toContain('l');  // lineTo
    expect(opNames).toContain('h');  // closePath
    expect(opNames).toContain('W');  // clip (nonzero winding)
    expect(opNames).toContain('n');  // endPath
  });

  it('uses the rect left/top as the start position', () => {
    const page = createMockPage();
    traceClipPath(makeRect({ type: 'rect', left: 15, top: 25, width: 80, height: 40 }), page);

    const allOps = vi.mocked(page.pushOperators).mock.calls.flat();
    type Op = { name: string; args: { numberValue: number }[] };
    const mOp = allOps.find((op): op is Op => (op as Op).name === 'm');
    expect(mOp?.args[0]?.numberValue).toBeCloseTo(15, 3);
    expect(mOp?.args[1]?.numberValue).toBeCloseTo(25, 3);
  });

  it('pushes operators for a circle clip path using bezier curves', () => {
    const circleClip = {
      ...makeRect(),
      type: 'circle',
      radius: 30,
    } as unknown as FabricObject;

    const page = createMockPage();
    traceClipPath(circleClip, page);

    const allOps = vi.mocked(page.pushOperators).mock.calls.flat();
    const opNames = allOps
      .filter((op) => typeof op === 'object' && op !== null && 'name' in (op as object))
      .map((op) => (op as { name: string }).name);

    expect(opNames).toContain('c');  // bezier curve
    expect(opNames).toContain('W');
    expect(opNames).toContain('n');
  });

  it('pushes operators for a polygon clip path', () => {
    const polygonClip = {
      ...makeRect(),
      type: 'polygon',
      points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 50 }],
    } as unknown as FabricObject;

    const page = createMockPage();
    traceClipPath(polygonClip, page);

    const allOps = vi.mocked(page.pushOperators).mock.calls.flat();
    const opNames = allOps
      .filter((op) => typeof op === 'object' && op !== null && 'name' in (op as object))
      .map((op) => (op as { name: string }).name);

    expect(opNames).toContain('m');
    expect(opNames).toContain('l');
    expect(opNames).toContain('W');
  });
});
```

- [ ] **Step 8.2: Run to confirm failure**

```bash
npx vitest run tests/unit/renderers/clip-path.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 8.3: Create clip-path.ts**

Create `src/renderers/clip-path.ts`:

```typescript
import { PDFOperator, PDFNumber } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { FabricObject, FabricCircleObject, FabricEllipseObject, FabricPolygonObject, FabricPolylineObject, FabricRectObject } from '../types';

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
  // Start at top-center, go clockwise in canvas-Y-down
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
      // Unsupported clip path shape — skip clipping silently
      return;
  }

  // Apply clip and end path without painting
  page.pushOperators(
    PDFOperator.of('W', []),  // clip using nonzero winding rule
    PDFOperator.of('n', []),  // end path without painting
  );
}
```

- [ ] **Step 8.4: Add clip path to BaseRenderer**

In `src/renderers/base-renderer.ts`, add import:
```typescript
import { traceClipPath } from './clip-path';
```

In the `render()` method, after `applyGraphicsState` and before `renderObject`:
```typescript
// Apply clip path if present
if (obj.clipPath) {
  traceClipPath(obj.clipPath, page);
}
```

- [ ] **Step 8.5: Run tests**

```bash
npx vitest run tests/unit/renderers/clip-path.test.ts
npx vitest run tests/unit/renderers/base-renderer.test.ts
```
Expected: all PASS.

- [ ] **Step 8.6: Commit**

```bash
git add src/renderers/clip-path.ts src/renderers/base-renderer.ts tests/unit/renderers/clip-path.test.ts
git commit -m "feat(clip-path): add clip path tracer for rect/circle/ellipse/polygon shapes"
```

---

## Task 9: Image cropX/cropY

**Files:**
- Modify: `src/renderers/image.renderer.ts`
- Modify: `tests/unit/renderers/image.renderer.test.ts`

- [ ] **Step 9.1: Add failing cropX/cropY tests**

Open `tests/unit/renderers/image.renderer.test.ts` and add:

```typescript
describe('cropX and cropY', () => {
  it('applies clip operators when cropX > 0', async () => {
    const renderer = new ImageRenderer();
    const mockImage = { width: 200, height: 100, embed: vi.fn() };
    const context = createMockContext();
    vi.mocked(context.imageLoader.load).mockResolvedValue(mockImage as any);

    const obj = createMockImage({ cropX: 20, cropY: 0, width: 100, height: 80 });
    await renderer.render(obj, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const opNames = allOps
      .filter((op) => typeof op === 'object' && op !== null && 'name' in (op as object))
      .map((op) => (op as { name: string }).name);

    expect(opNames).toContain('W');
    expect(opNames).toContain('n');
  });

  it('does NOT add clip operators when cropX and cropY are both 0', async () => {
    const renderer = new ImageRenderer();
    const mockImage = { width: 200, height: 100 };
    const context = createMockContext();
    vi.mocked(context.imageLoader.load).mockResolvedValue(mockImage as any);

    const obj = createMockImage({ cropX: 0, cropY: 0 });
    await renderer.render(obj, context.page, context);

    const allOps = vi.mocked(context.page.pushOperators).mock.calls.flat();
    const opNames = allOps
      .filter((op) => typeof op === 'object' && op !== null && 'name' in (op as object))
      .map((op) => (op as { name: string }).name);

    expect(opNames).not.toContain('W');
  });
});
```

If `createMockImage` doesn't exist in that test file, add it using the pattern from `createMockRect`:
```typescript
function createMockImage(overrides: Partial<FabricImageObject> = {}): FabricImageObject {
  return {
    type: 'image',
    left: 0, top: 0, width: 100, height: 80,
    scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
    flipX: false, flipY: false,
    originX: 'left', originY: 'top',
    fill: null, stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeLineJoin: 'miter', strokeMiterLimit: 4,
    strokeUniform: false, opacity: 1, visible: true,
    shadow: null, globalCompositeOperation: 'source-over',
    src: 'data:image/png;base64,fake',
    cropX: 0, cropY: 0,
    filters: [], resizeFilter: null, crossOrigin: null,
    alignX: 'none', alignY: 'none', meetOrSlice: 'meet',
    ...overrides,
  } as FabricImageObject;
}
```

- [ ] **Step 9.2: Run to confirm failure**

```bash
npx vitest run tests/unit/renderers/image.renderer.test.ts 2>&1 | grep -E "crop" | head -10
```

- [ ] **Step 9.3: Implement crop in image.renderer.ts**

Add to imports:
```typescript
import { PDFOperator, pushGraphicsState, popGraphicsState } from 'pdf-lib';
import { traceClipPath } from './clip-path';
```

Update `renderObject`:

```typescript
async renderObject(obj: FabricImageObject, page: PDFPage, context: RenderContext): Promise<void> {
  try {
    const image = await context.imageLoader.load(obj.src);
    const width = obj.width || image.width;
    const height = obj.height || image.height;
    const hasCrop = (obj.cropX ?? 0) > 0 || (obj.cropY ?? 0) > 0;

    if (hasCrop) {
      page.pushOperators(pushGraphicsState());
      // Clip to display rectangle (0, 0, width, height) in local space
      traceClipPath(
        {
          type: 'rect',
          left: 0, top: 0, width, height,
          scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0,
          flipX: false, flipY: false, originX: 'left', originY: 'top',
          fill: null, stroke: null, strokeWidth: 0, strokeDashArray: null,
          strokeLineCap: 'butt', strokeLineJoin: 'miter', strokeMiterLimit: 4,
          strokeUniform: false, opacity: 1, visible: true,
          shadow: null, globalCompositeOperation: 'source-over',
          rx: 0, ry: 0,
        } as import('../types').FabricRectObject,
        page,
      );

      // Draw image offset by -cropX, -cropY so the crop region aligns with (0,0)
      drawImageInCanvas(page, image, {
        x: -(obj.cropX ?? 0),
        y: -(obj.cropY ?? 0),
        width: image.width,
        height: image.height,
      });
      page.pushOperators(popGraphicsState());
    } else {
      drawImageInCanvas(page, image, { x: 0, y: 0, width, height });
    }
  } catch (error) {
    context.warnings.add({
      type: 'image_failed',
      objectType: obj.type,
      objectIndex: -1,
      feature: 'image_rendering',
      message: `Failed to render image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}
```

- [ ] **Step 9.4: Run tests**

```bash
npx vitest run tests/unit/renderers/image.renderer.test.ts
```
Expected: all PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/renderers/image.renderer.ts tests/unit/renderers/image.renderer.test.ts
git commit -m "feat(image): implement cropX/cropY using clip path + image offset"
```

---

## Task 10: Run Full Test Suite

- [ ] **Step 10.1: Run all unit tests**

```bash
npx vitest run tests/unit
```
Expected: all PASS. Fix any regressions before proceeding.

- [ ] **Step 10.2: Build the library**

```bash
npm run build
```
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 10.3: Commit build artifacts if needed**

```bash
git add dist/
git commit -m "build: rebuild dist with new features"
```

---

## Task 11: Demo App — New Property Controls

**Files:**
- Modify: `demo/src/main.ts`
- Modify: `demo/index.html`

- [ ] **Step 11.1: Add CSS for new controls to demo/index.html**

In `demo/index.html`, add to the `<style>` block before `</style>`:

```css
.property-section-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #999;
  margin: 0.5rem 0 0.25rem;
  letter-spacing: 0.3px;
}

.property-row input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-row label {
  text-transform: none;
  font-size: 0.85rem;
}

.property-row input[type="range"] {
  padding: 0;
}

.demo-presets {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.preset-btn {
  padding: 0.5rem;
  border: 1px solid #ddd;
  background: #f8f8f8;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
}

.preset-btn:hover {
  background: #eee;
}
```

Add a new sidebar section before the Canvas Settings section:

```html
<div class="section">
  <h3>Demo Presets</h3>
  <div class="demo-presets">
    <button class="preset-btn" id="presetOpacity">Opacity Demo</button>
    <button class="preset-btn" id="presetShadow">Shadow Demo</button>
    <button class="preset-btn" id="presetTextDecor">Text Decorations Demo</button>
    <button class="preset-btn" id="presetBlendMode">Blend Mode Demo</button>
  </div>
</div>
```

- [ ] **Step 11.2: Update properties panel in demo/src/main.ts**

Replace the `updatePropertiesPanel` function with a version that includes new controls. The new controls to add for ALL objects:

```typescript
// After opacity row, add blend mode
html += `
  <div class="property-row">
    <label>Blend Mode</label>
    <select id="propBlendMode">
      <option value="source-over" ${(activeObject as any).globalCompositeOperation === 'source-over' ? 'selected' : ''}>Normal</option>
      <option value="multiply" ${(activeObject as any).globalCompositeOperation === 'multiply' ? 'selected' : ''}>Multiply</option>
      <option value="screen" ${(activeObject as any).globalCompositeOperation === 'screen' ? 'selected' : ''}>Screen</option>
      <option value="overlay" ${(activeObject as any).globalCompositeOperation === 'overlay' ? 'selected' : ''}>Overlay</option>
      <option value="darken" ${(activeObject as any).globalCompositeOperation === 'darken' ? 'selected' : ''}>Darken</option>
      <option value="lighten" ${(activeObject as any).globalCompositeOperation === 'lighten' ? 'selected' : ''}>Lighten</option>
      <option value="difference" ${(activeObject as any).globalCompositeOperation === 'difference' ? 'selected' : ''}>Difference</option>
    </select>
  </div>
  <div class="property-section-title">Shadow</div>
  <div class="property-row">
    <label>Shadow Color</label>
    <input type="color" id="propShadowColor" value="${getShadowColor(activeObject)}">
  </div>
  <div class="property-row">
    <label>Shadow Offset X</label>
    <input type="number" id="propShadowOffsetX" value="${getShadowOffsetX(activeObject)}" min="-50" max="50">
  </div>
  <div class="property-row">
    <label>Shadow Offset Y</label>
    <input type="number" id="propShadowOffsetY" value="${getShadowOffsetY(activeObject)}" min="-50" max="50">
  </div>
`;
```

For text objects, add after the existing textAlign select (add justify option and decoration checkboxes):

```typescript
html += `
  <div class="property-section-title">Text Style</div>
  <div class="property-row">
    <label>Char Spacing</label>
    <input type="number" id="propCharSpacing" value="${(textObj as any).charSpacing ?? 0}" min="-500" max="1000">
  </div>
  <div class="property-row">
    <label>Text Background</label>
    <input type="color" id="propTextBg" value="${(textObj as any).textBackgroundColor || '#ffffff'}">
    <div class="checkbox-row" style="margin-top:4px">
      <input type="checkbox" id="propTextBgEnabled" ${(textObj as any).textBackgroundColor ? 'checked' : ''}>
      <label for="propTextBgEnabled">Enable background</label>
    </div>
  </div>
  <div class="property-section-title">Decorations</div>
  <div class="checkbox-row property-row">
    <input type="checkbox" id="propUnderline" ${(textObj as any).underline ? 'checked' : ''}>
    <label for="propUnderline">Underline</label>
  </div>
  <div class="checkbox-row property-row">
    <input type="checkbox" id="propLinethrough" ${(textObj as any).linethrough ? 'checked' : ''}>
    <label for="propLinethrough">Strikethrough</label>
  </div>
  <div class="checkbox-row property-row">
    <input type="checkbox" id="propOverline" ${(textObj as any).overline ? 'checked' : ''}>
    <label for="propOverline">Overline</label>
  </div>
`;
```

Also update the textAlign dropdown to include justify:
```html
<option value="justify" ...>Justify</option>
```

Add the helper functions and event listeners:

```typescript
function getShadowColor(obj: fabric.Object): string {
  const shadow = obj.shadow as fabric.Shadow | null;
  if (!shadow) return '#000000';
  const c = typeof shadow === 'object' ? shadow.color : '#000000';
  return c ?? '#000000';
}

function getShadowOffsetX(obj: fabric.Object): number {
  const shadow = obj.shadow as fabric.Shadow | null;
  return shadow ? (shadow.offsetX ?? 0) : 0;
}

function getShadowOffsetY(obj: fabric.Object): number {
  const shadow = obj.shadow as fabric.Shadow | null;
  return shadow ? (shadow.offsetY ?? 0) : 0;
}
```

Add event listeners after existing ones:

```typescript
document.getElementById('propBlendMode')?.addEventListener('change', (e) => {
  (activeObject as any).globalCompositeOperation = (e.target as HTMLSelectElement).value;
  canvas.renderAll();
});

function updateShadow() {
  const color = (document.getElementById('propShadowColor') as HTMLInputElement).value;
  const offsetX = parseInt((document.getElementById('propShadowOffsetX') as HTMLInputElement).value);
  const offsetY = parseInt((document.getElementById('propShadowOffsetY') as HTMLInputElement).value);
  activeObject.set('shadow', new fabric.Shadow({ color, offsetX, offsetY, blur: 0 }));
  canvas.renderAll();
}

document.getElementById('propShadowColor')?.addEventListener('input', updateShadow);
document.getElementById('propShadowOffsetX')?.addEventListener('input', updateShadow);
document.getElementById('propShadowOffsetY')?.addEventListener('input', updateShadow);

// Text decoration listeners
document.getElementById('propUnderline')?.addEventListener('change', (e) => {
  (activeObject as any).set('underline', (e.target as HTMLInputElement).checked);
  canvas.renderAll();
});

document.getElementById('propLinethrough')?.addEventListener('change', (e) => {
  (activeObject as any).set('linethrough', (e.target as HTMLInputElement).checked);
  canvas.renderAll();
});

document.getElementById('propOverline')?.addEventListener('change', (e) => {
  (activeObject as any).set('overline', (e.target as HTMLInputElement).checked);
  canvas.renderAll();
});

document.getElementById('propCharSpacing')?.addEventListener('input', (e) => {
  (activeObject as any).set('charSpacing', parseInt((e.target as HTMLInputElement).value));
  canvas.renderAll();
});

document.getElementById('propTextBgEnabled')?.addEventListener('change', (e) => {
  const enabled = (e.target as HTMLInputElement).checked;
  const color = (document.getElementById('propTextBg') as HTMLInputElement).value;
  (activeObject as any).set('textBackgroundColor', enabled ? color : null);
  canvas.renderAll();
});

document.getElementById('propTextBg')?.addEventListener('input', (e) => {
  const enabled = (document.getElementById('propTextBgEnabled') as HTMLInputElement).checked;
  if (enabled) {
    (activeObject as any).set('textBackgroundColor', (e.target as HTMLInputElement).value);
    canvas.renderAll();
  }
});
```

- [ ] **Step 11.3: Add demo preset loaders**

Add the following preset functions and wire them up:

```typescript
document.getElementById('presetOpacity')?.addEventListener('click', () => {
  canvas.clear();
  canvas.backgroundColor = '#e8e8e8';
  const bg = new fabric.Rect({ left: 50, top: 50, width: 300, height: 200, fill: '#3498db', opacity: 1 });
  const overlay = new fabric.Rect({ left: 100, top: 100, width: 300, height: 200, fill: '#e74c3c', opacity: 0.5 });
  canvas.add(bg, overlay);
  canvas.renderAll();
  showStatus('Opacity demo loaded — red rect is 50% transparent', 'success');
});

document.getElementById('presetShadow')?.addEventListener('click', () => {
  canvas.clear();
  canvas.backgroundColor = '#f0f0f0';
  const rect = new fabric.Rect({
    left: 150, top: 100, width: 200, height: 120,
    fill: '#27ae60',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', offsetX: 8, offsetY: 8, blur: 0 }),
  });
  const circle = new fabric.Circle({
    left: 100, top: 200, radius: 60, fill: '#e74c3c',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,50,0.5)', offsetX: -5, offsetY: 10, blur: 0 }),
  });
  canvas.add(rect, circle);
  canvas.renderAll();
  showStatus('Shadow demo loaded', 'success');
});

document.getElementById('presetTextDecor')?.addEventListener('click', () => {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  const t1 = new fabric.Textbox('Underlined text', {
    left: 50, top: 60, width: 300, fontSize: 28, fontFamily: 'Helvetica',
    fill: '#2c3e50', underline: true,
  } as any);
  const t2 = new fabric.Textbox('Strikethrough text', {
    left: 50, top: 130, width: 300, fontSize: 28, fontFamily: 'Helvetica',
    fill: '#e74c3c', linethrough: true,
  } as any);
  const t3 = new fabric.Textbox('Overlined text', {
    left: 50, top: 200, width: 300, fontSize: 28, fontFamily: 'Helvetica',
    fill: '#27ae60', overline: true,
  } as any);
  const t4 = new fabric.Textbox('Spaced out text', {
    left: 50, top: 270, width: 400, fontSize: 24, fontFamily: 'Helvetica',
    fill: '#8e44ad', charSpacing: 300,
  } as any);
  const t5 = new fabric.Textbox('Highlighted text', {
    left: 50, top: 330, width: 300, fontSize: 28, fontFamily: 'Helvetica',
    fill: '#2c3e50', textBackgroundColor: '#f1c40f',
  } as any);
  canvas.add(t1, t2, t3, t4, t5);
  canvas.renderAll();
  showStatus('Text decorations demo loaded', 'success');
});

document.getElementById('presetBlendMode')?.addEventListener('click', () => {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  const r1 = new fabric.Rect({ left: 80, top: 80, width: 200, height: 200, fill: '#3498db' });
  const r2 = new fabric.Rect({
    left: 160, top: 160, width: 200, height: 200, fill: '#e74c3c',
    globalCompositeOperation: 'multiply',
  } as any);
  canvas.add(r1, r2);
  canvas.renderAll();
  showStatus('Blend mode demo: red rect uses "multiply" blend mode', 'success');
});
```

- [ ] **Step 11.4: Build demo and verify it starts**

```bash
cd demo && npm run build 2>&1 | tail -5
```
Expected: build succeeds. Open in browser and verify:
1. New sidebar sections appear
2. Shadow controls affect canvas in real-time
3. Text decoration checkboxes reflect in canvas
4. Demo presets populate canvas with test content
5. "Preview PDF" renders the new features correctly

- [ ] **Step 11.5: Commit**

```bash
cd ..
git add demo/src/main.ts demo/index.html demo/dist/
git commit -m "feat(demo): add opacity, shadow, blend mode, text decoration controls and demo presets"
```

---

## Task 12: Final Verification

- [ ] **Step 12.1: Run full test suite**

```bash
npm test
```
Expected: all tests PASS, no regressions.

- [ ] **Step 12.2: Type check**

```bash
npm run typecheck
```
Expected: no TypeScript errors.

- [ ] **Step 12.3: Build library**

```bash
npm run build
```
Expected: dist artifacts generated cleanly.

- [ ] **Step 12.4: Final commit**

```bash
git add -A
git commit -m "feat: implement opacity, shadow, blend modes, text decorations, style runs, clip path, image crop"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ charSpacing → Task 4
- ✅ textBackgroundColor → Task 5
- ✅ underline/linethrough/overline → Task 5
- ✅ justify → Task 6
- ✅ styles (per-char runs) → Task 7
- ✅ opacity (ExtGState) → Task 1 + 2
- ✅ blend mode → Task 1 + 2
- ✅ shadow (solid) → Task 3
- ✅ clipPath → Task 8
- ✅ image cropX/cropY → Task 9
- ✅ demo app controls → Task 11
- ✅ tests for all features → Tasks 1–9

**Color alpha (fill rgba):** The spec says to combine color alpha with object opacity. The `parseColor` already extracts `.a` but callers use only `.r/.g/.b`. This is addressed by the opacity ExtGState applied per-object via `obj.opacity`. For objects where `fill` is `rgba(r,g,b,a)`, the color's `a` will combine with the ExtGState `ca` — handled in Task 2 by reading color alpha and multiplying: if `fillColor.a < 1`, pass `opacity * fillColor.a` to `applyGraphicsState` in each renderer (rect, circle, etc.) rather than only the base obj.opacity.

**Addendum — Task 2 correction:** In each shape renderer (rect, circle, etc.) that calls `parseColor(obj.fill)`, after parsing, if `fillColor.a < 1`, call `applyGraphicsState(page, context.pdfDoc, { opacity: (obj.opacity ?? 1) * fillColor.a })` locally in `renderObject`. This is separate from the base-class `obj.opacity` ExtGState which covers the whole object. Do this in the `renderObject` of each renderer that cares about fill alpha (rect, circle, ellipse, triangle, path, polygon, polyline).

This addendum is small enough to include in Task 2's commit — add a step 2.3b to apply per-fill-color alpha in rect.renderer.ts as a template, which others follow.
