# Transform and Geometry Remediation Plan

## Context

The converter should reproduce Fabric.js canvas output in PDF with high fidelity. The current drift appears in three areas:

- size (object dimensions and scaling)
- spacing (relative placement and anchor offsets)
- rotation (objects rotating around unexpected pivots or with sign/order issues)

This plan defines a concrete fix sequence focused on transform correctness first, then renderer consistency, then regression hardening.

## Confirmed Gaps

1. Global `options.scale` is resolved but not consistently applied in rendering transforms.
2. Renderer local-anchor conventions are inconsistent (center-anchored vs corner-anchored shapes mixed).
3. Line renderer applies object scale in endpoint math while transforms already apply scale, causing double scaling.
4. Missing `originX`/`originY` values can fall back to defaults that do not match Fabric object defaults.
5. Group renderer uses non-standard page graphics-state calls instead of operator-based state isolation.

## Fix Strategy

### Phase 1 - Transform Pipeline Correctness

1. Apply global `options.scale` inside object transform application.
2. Ensure translation and geometry scaling are both scale-aware (including `originY: top` adjustments).
3. Use Fabric-aligned defaults for missing origin values.

### Phase 2 - Renderer Anchor Consistency

1. Keep renderers drawing in unscaled local object space.
2. Normalize shape anchors so local geometry and transform origin assumptions match:
   - circle and ellipse local bounds start at `(0, 0)` and extend to their full bbox.
3. Remove renderer-level scale multiplications where transform matrix already handles scaling.

### Phase 3 - Group/State Isolation Correctness

1. Use `pushOperators(pushGraphicsState())` / `pushOperators(popGraphicsState())` in group renderer.
2. Keep per-object and per-group graphics-state isolation behavior symmetric.

### Phase 4 - Regression Hardening

1. Add/extend tests for:
   - global scale application
   - line non-double-scaling behavior
   - ellipse anchor placement
   - group graphics-state operator usage
2. Run focused unit suites and renderer/integration verification suites.

## Acceptance Criteria

- Relative spacing between objects remains stable under mixed transforms.
- Rotations preserve expected pivot behavior for `left/top` and `center/center` origins.
- Line lengths do not inflate when `scaleX/scaleY` are set.
- Circle and ellipse placement aligns with equivalent Fabric geometry anchors.
- `options.scale` measurably changes output coordinates/sizes.
