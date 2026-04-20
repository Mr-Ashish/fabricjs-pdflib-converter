# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-XX

### Added

- Initial release of canvas-pdflib-converter
- Core converter pipeline: `parseCanvasJSON`, `resolveOptions`, `convertCanvasToPdf`
- Shape renderers: rect, circle, ellipse, triangle, line
- Vector path renderers: path, polyline, polygon
- Image renderer with PNG/JPG support
- Text renderer with single/multi-line and alignment support
- Group renderer with nested group support and depth limiting
- Font management with automatic CSS to PDF font mapping
- Color parsing: hex, rgb, rgba, hsl, hsla, named colors
- Transformation support: translate, scale, rotate, skew, flip
- Stroke properties: dash patterns, line caps, line joins
- Comprehensive error handling with structured warnings
- Full TypeScript support with type definitions
- 444 passing tests across unit and integration suites

### Supported Fabric.js Objects

- ✅ `rect` - rectangles with rounded corners
- ✅ `circle` - circles
- ✅ `ellipse` - ellipses
- ✅ `triangle` - triangles
- ✅ `line` - lines
- ✅ `path` - SVG paths (M, L, C, Q, A, Z commands)
- ✅ `polyline` - open polylines
- ✅ `polygon` - closed polygons
- ✅ `image` - PNG/JPG images
- ✅ `text` / `i-text` / `textbox` - text with alignment
- ✅ `group` - nested groups

### Features

- Automatic page size detection from canvas dimensions
- Configurable scaling and margins
- Background color support
- Warning collection for unsupported features
- Configurable error handling (warn/skip/error)
- Font caching to prevent duplicate embedding
- Image caching for performance

[0.1.0]: https://github.com/yourusername/canvas-pdflib-converter/releases/tag/v0.1.0
