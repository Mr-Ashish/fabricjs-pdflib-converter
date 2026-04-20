# canvas-pdflib-converter

Convert [Fabric.js](http://fabricjs.com/) canvas JSON to PDF using [pdf-lib](https://pdf-lib.js.org/).

[![npm version](https://badge.fury.io/js/canvas-pdflib-converter.svg)](https://www.npmjs.com/package/canvas-pdflib-converter)
[![CI Status](https://github.com/yourusername/canvas-pdflib-converter/workflows/CI/badge.svg)](https://github.com/yourusername/canvas-pdflib-converter/actions)

## Features

- **Shapes**: Rectangles (with rounded corners), circles, ellipses, triangles, lines
- **Vector Paths**: SVG paths, polylines, polygons with bezier curves
- **Images**: PNG and JPG support with data URLs and external URLs
- **Text**: Single/multi-line text with alignment (left, center, right)
- **Groups**: Nested groups with depth limit protection
- **Styling**: Fill colors, strokes, dash patterns, opacity
- **Fonts**: Automatic mapping of CSS font names to PDF standard fonts
- **TypeScript**: Full type definitions included

## Installation

```bash
npm install canvas-pdflib-converter
```

## Quick Start

```typescript
import { parseCanvasJSON, resolveOptions, convertCanvasToPdf } from 'canvas-pdflib-converter';

// Your Fabric.js canvas JSON
const canvasJSON = {
  version: '5.3.0',
  width: 800,
  height: 600,
  objects: [
    {
      type: 'rect',
      left: 10,
      top: 10,
      width: 100,
      height: 50,
      fill: '#FF0000'
    },
    {
      type: 'text',
      left: 10,
      top: 100,
      width: 200,
      height: 30,
      text: 'Hello PDF!',
      fontFamily: 'Helvetica',
      fontSize: 24,
      fill: '#000000'
    }
  ]
};

// Convert to PDF
async function generatePDF() {
  const parsed = parseCanvasJSON(canvasJSON);
  const options = resolveOptions({}, parsed);
  const result = await convertCanvasToPdf(parsed, options);
  
  // Save to file (Node.js)
  const fs = require('fs');
  fs.writeFileSync('output.pdf', result.pdfBytes);
  
  // Or download in browser
  // const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });
  // const url = URL.createObjectURL(blob);
}

generatePDF();
```

## API Reference

### Core Functions

#### `parseCanvasJSON(input)`

Parses and validates Fabric.js canvas JSON.

```typescript
import { parseCanvasJSON } from 'canvas-pdflib-converter';

const canvasJSON = parseCanvasJSON(jsonStringOrObject);
```

**Parameters:**
- `input: string | object` - Fabric.js canvas JSON or JSON string

**Returns:** `FabricCanvasJSON`

**Throws:** `InvalidInputError` if input is invalid

---

#### `resolveOptions(userOptions?, canvasJSON?)`

Resolves converter options with defaults.

```typescript
import { resolveOptions } from 'canvas-pdflib-converter';

const options = resolveOptions({
  scale: 1.5,
  defaultFont: 'Times-Roman'
}, canvasJSON);
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pageWidth` | `number` | Canvas width or 595.28 (A4) | Page width in PDF points |
| `pageHeight` | `number` | Canvas height or 841.89 (A4) | Page height in PDF points |
| `scale` | `number` | 1 | Scale factor for all coordinates |
| `defaultFont` | `string` | 'Helvetica' | Default font family |
| `onUnsupported` | `'warn' \| 'skip' \| 'error'` | 'warn' | How to handle unsupported features |
| `maxGroupDepth` | `number` | 20 | Maximum nesting depth for groups |
| `backgroundColor` | `string` | - | Page background color |
| `margin` | `{ top, right, bottom, left }` | All 0 | Page margins |

---

#### `convertCanvasToPdf(canvasJSON, options)`

Converts Fabric.js canvas to PDF.

```typescript
import { convertCanvasToPdf } from 'canvas-pdflib-converter';

const result = await convertCanvasToPdf(canvasJSON, options);
// result.pdfBytes: Uint8Array
// result.warnings: ConversionWarning[]
```

---

### Complete Example with Options

```typescript
import { 
  parseCanvasJSON, 
  resolveOptions, 
  convertCanvasToPdf,
  ConversionWarning 
} from 'canvas-pdflib-converter';

const canvasJSON = {
  version: '5.3.0',
  width: 800,
  height: 600,
  objects: [
    // Your objects here
  ]
};

const options = resolveOptions({
  // Page size (in PDF points, 72 points = 1 inch)
  pageWidth: 800,
  pageHeight: 600,
  
  // Scale everything up by 1.5x
  scale: 1.5,
  
  // Default font for text
  defaultFont: 'Helvetica',
  
  // Handle unsupported features
  onUnsupported: 'warn', // 'warn', 'skip', or 'error'
  
  // Background color
  backgroundColor: '#F0F0F0',
  
  // Margins
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  
  // Limit group nesting (prevents stack overflow)
  maxGroupDepth: 20
}, canvasJSON);

const result = await convertCanvasToPdf(canvasJSON, options);

// Check for warnings
if (result.warnings.length > 0) {
  result.warnings.forEach((warning: ConversionWarning) => {
    console.warn(`${warning.type}: ${warning.message}`);
  });
}

// Save PDF
fs.writeFileSync('output.pdf', result.pdfBytes);
```

## Supported Fabric.js Object Types

| Type | Support | Notes |
|------|---------|-------|
| `rect` | ✅ Full | Includes rounded corners (rx, ry) |
| `circle` | ✅ Full | |
| `ellipse` | ✅ Full | |
| `triangle` | ✅ Full | |
| `line` | ✅ Full | |
| `path` | ✅ Full | SVG path commands |
| `polyline` | ✅ Full | |
| `polygon` | ✅ Full | |
| `image` | ✅ Full | PNG, JPG via data URL or external URL |
| `text` | ✅ Partial | Single/multi-line, alignment. No word-wrap yet |
| `i-text` | ✅ Partial | Same as text |
| `textbox` | ✅ Partial | Same as text |
| `group` | ✅ Partial | Nested groups supported. No clipPath yet |

## Custom Fonts

The library automatically maps common CSS font names to PDF standard fonts:

| CSS Font | PDF Font |
|----------|----------|
| Arial, Helvetica, sans-serif | Helvetica |
| Times New Roman, Times, serif | Times-Roman |
| Courier New, Courier, monospace | Courier |
| Georgia | Times-Roman |
| Verdana | Helvetica |
| Impact | Helvetica-Bold |

Font weight (bold) and style (italic) are automatically resolved.

## Error Handling

```typescript
import { InvalidInputError, ConversionError } from 'canvas-pdflib-converter';

try {
  const canvasJSON = parseCanvasJSON(input);
  const result = await convertCanvasToPdf(canvasJSON, options);
} catch (error) {
  if (error instanceof InvalidInputError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof ConversionError) {
    console.error('Conversion failed:', error.message);
  }
}
```

## Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/canvas-pdflib-converter@latest/dist/index.global.js"></script>
</head>
<body>
  <button onclick="generatePDF()">Download PDF</button>
  
  <script>
    async function generatePDF() {
      const canvasJSON = {
        version: '5.3.0',
        objects: [
          { type: 'rect', left: 10, top: 10, width: 100, height: 50, fill: '#FF0000' }
        ]
      };
      
      const parsed = CanvasPdfLibConverter.parseCanvasJSON(canvasJSON);
      const options = CanvasPdfLibConverter.resolveOptions({}, parsed);
      const result = await CanvasPdfLibConverter.convertCanvasToPdf(parsed, options);
      
      const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.pdf';
      a.click();
    }
  </script>
</body>
</html>
```

## Examples

See the `examples/` directory for complete working examples:

- `basic.ts` - Simple shape conversion
- `text-rendering.ts` - Text with fonts and alignment
- `images.ts` - Working with images
- `multi-page.ts` - Creating multi-page PDFs

## Known Limitations

- Text word-wrapping is not yet implemented (textbox auto-wrap)
- Text decorations (underline, strikethrough) not yet implemented
- Clip paths on groups not yet implemented
- Gradients and patterns fallback to solid colors
- Shadows are not rendered

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## License

MIT © [Your Name]
