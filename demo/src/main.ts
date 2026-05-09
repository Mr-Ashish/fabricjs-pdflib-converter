import { fabric } from 'fabric';
import { 
  parseCanvasJSON, 
  resolveOptions, 
  convertCanvasToPdf 
} from '../../dist/index.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker for browser
// @ts-expect-error - pdfjs worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Initialize Fabric canvas
const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
const canvas = new fabric.Canvas(canvasElement, {
  width: 800,
  height: 600,
  backgroundColor: '#ffffff'
});

// State
let selectedObject: fabric.Object | null = null;

// DOM Elements
const propertiesPanel = document.getElementById('properties')!;
const statusEl = document.getElementById('status')!;
const canvasBgInput = document.getElementById('canvasBg') as HTMLInputElement;
const canvasWidthInput = document.getElementById('canvasWidth') as HTMLInputElement;
const canvasHeightInput = document.getElementById('canvasHeight') as HTMLInputElement;

// Tool buttons
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = (btn as HTMLElement).dataset.tool;
    addObject(tool!);
  });
});

// Clear button
document.querySelector('[data-clear]')?.addEventListener('click', () => {
  canvas.clear();
  canvas.backgroundColor = canvasBgInput.value;
  canvas.renderAll();
  showStatus('Canvas cleared', 'success');
});

// Canvas settings
canvasBgInput.addEventListener('change', () => {
  canvas.backgroundColor = canvasBgInput.value;
  canvas.renderAll();
});

canvasWidthInput.addEventListener('change', () => {
  canvas.setWidth(parseInt(canvasWidthInput.value));
  canvas.renderAll();
});

canvasHeightInput.addEventListener('change', () => {
  canvas.setHeight(parseInt(canvasHeightInput.value));
  canvas.renderAll();
});

// Export button
document.getElementById('exportBtn')!.addEventListener('click', exportToPDF);

// Copy JSON button
document.getElementById('copyJsonBtn')!.addEventListener('click', copyCanvasJSON);

// Preview PDF button
document.getElementById('previewBtn')!.addEventListener('click', previewPDF);
document.getElementById('previewClose')!.addEventListener('click', closePreview);
document.getElementById('previewModal')!.addEventListener('click', (e) => {
  if (e.target === document.getElementById('previewModal')) {
    closePreview();
  }
});

// Add objects based on tool type
function addObject(type: string) {
  let obj: fabric.Object;
  
  switch (type) {
    case 'rect':
      obj = new fabric.Rect({
        left: 100,
        top: 100,
        width: 150,
        height: 100,
        fill: '#3498db',
        stroke: '#2980b9',
        strokeWidth: 2
      });
      break;
      
    case 'circle':
      obj = new fabric.Circle({
        left: 150,
        top: 150,
        radius: 60,
        fill: '#e74c3c',
        stroke: '#c0392b',
        strokeWidth: 2
      });
      break;
      
    case 'triangle':
      obj = new fabric.Triangle({
        left: 150,
        top: 150,
        width: 120,
        height: 120,
        fill: '#f39c12',
        stroke: '#e67e22',
        strokeWidth: 2
      });
      break;
      
    case 'text':
      obj = new fabric.Textbox('Double click to edit', {
        left: 150,
        top: 150,
        width: 200,
        fontSize: 24,
        fontFamily: 'Helvetica',
        fill: '#2c3e50'
      });
      break;
      
    case 'line':
      obj = new fabric.Line([50, 50, 250, 150], {
        left: 150,
        top: 150,
        stroke: '#9b59b6',
        strokeWidth: 3
      });
      break;
      
    default:
      return;
  }
  
  canvas.add(obj);
  canvas.setActiveObject(obj);
  canvas.renderAll();
  showStatus(`${type} added`, 'success');
}

function getShadowColor(obj: fabric.Object): string {
  const shadow = obj.shadow as fabric.Shadow | null;
  if (!shadow || typeof shadow !== 'object') return '#000000';
  return (shadow.color ?? '#000000');
}

function getShadowOffsetX(obj: fabric.Object): number {
  const shadow = obj.shadow as fabric.Shadow | null;
  return shadow && typeof shadow === 'object' ? (shadow.offsetX ?? 0) : 0;
}

function getShadowOffsetY(obj: fabric.Object): number {
  const shadow = obj.shadow as fabric.Shadow | null;
  return shadow && typeof shadow === 'object' ? (shadow.offsetY ?? 0) : 0;
}

// Update properties panel when object is selected
function updatePropertiesPanel() {
  const activeObject = canvas.getActiveObject();
  
  if (!activeObject) {
    propertiesPanel.innerHTML = '<div class="no-selection">Select an object to edit properties</div>';
    selectedObject = null;
    return;
  }
  
  selectedObject = activeObject;
  const type = activeObject.type;
  
  let html = `
    <div class="property-row">
      <label>Type</label>
      <input type="text" value="${type}" disabled>
    </div>
    <div class="property-row">
      <label>Left Position</label>
      <input type="number" id="propLeft" value="${Math.round(activeObject.left || 0)}">
    </div>
    <div class="property-row">
      <label>Top Position</label>
      <input type="number" id="propTop" value="${Math.round(activeObject.top || 0)}">
    </div>
  `;
  
  if (type !== 'line') {
    html += `
      <div class="property-row">
        <label>Fill Color</label>
        <input type="color" id="propFill" value="${activeObject.fill || '#000000'}">
      </div>
    `;
  }
  
  html += `
    <div class="property-row">
      <label>Stroke Color</label>
      <input type="color" id="propStroke" value="${activeObject.stroke || '#000000'}">
    </div>
    <div class="property-row">
      <label>Stroke Width</label>
      <input type="number" id="propStrokeWidth" value="${activeObject.strokeWidth || 0}" min="0" max="20">
    </div>
    <div class="property-row">
      <label>Angle</label>
      <input type="number" id="propAngle" value="${Math.round(activeObject.angle || 0)}" min="0" max="360">
    </div>
    <div class="property-row">
      <label>Opacity</label>
      <input type="range" id="propOpacity" value="${(activeObject.opacity || 1) * 100}" min="0" max="100">
    </div>
    <div class="property-row">
      <label>Blend Mode</label>
      <select id="propBlendMode">
        <option value="source-over" ${(activeObject as any).globalCompositeOperation === 'source-over' || !(activeObject as any).globalCompositeOperation ? 'selected' : ''}>Normal</option>
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
      <label>Offset X</label>
      <input type="number" id="propShadowOffsetX" value="${getShadowOffsetX(activeObject)}" min="-50" max="50">
    </div>
    <div class="property-row">
      <label>Offset Y</label>
      <input type="number" id="propShadowOffsetY" value="${getShadowOffsetY(activeObject)}" min="-50" max="50">
    </div>
  `;

  if (type === 'text' || type === 'textbox') {
    const textObj = activeObject as fabric.Textbox;
    html += `
      <div class="property-row">
        <label>Text</label>
        <input type="text" id="propText" value="${textObj.text}">
      </div>
      <div class="property-row">
        <label>Font Size</label>
        <input type="number" id="propFontSize" value="${textObj.fontSize}" min="8" max="200">
      </div>
      <div class="property-row">
        <label>Font Family</label>
        <select id="propFontFamily">
          <option value="Arial" ${textObj.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
          <option value="Helvetica" ${textObj.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
          <option value="Times New Roman" ${textObj.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
          <option value="Courier New" ${textObj.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
        </select>
      </div>
      <div class="property-row">
        <label>Text Align</label>
        <select id="propTextAlign">
          <option value="left" ${textObj.textAlign === 'left' ? 'selected' : ''}>Left</option>
          <option value="center" ${textObj.textAlign === 'center' ? 'selected' : ''}>Center</option>
          <option value="right" ${textObj.textAlign === 'right' ? 'selected' : ''}>Right</option>
          <option value="justify" ${(activeObject as any).textAlign === 'justify' ? 'selected' : ''}>Justify</option>
        </select>
      </div>
    `;

    html += `
      <div class="property-section-title">Text Style</div>
      <div class="property-row">
        <label>Char Spacing</label>
        <input type="number" id="propCharSpacing" value="${(activeObject as any).charSpacing ?? 0}" min="-500" max="1000">
      </div>
      <div class="property-row">
        <label>Text Background</label>
        <input type="color" id="propTextBg" value="${(activeObject as any).textBackgroundColor || '#ffffff'}">
        <div class="checkbox-row" style="margin-top:4px">
          <input type="checkbox" id="propTextBgEnabled" ${(activeObject as any).textBackgroundColor ? 'checked' : ''}>
          <label for="propTextBgEnabled">Enable background</label>
        </div>
      </div>
      <div class="property-section-title">Decorations</div>
      <div class="checkbox-row property-row">
        <input type="checkbox" id="propUnderline" ${(activeObject as any).underline ? 'checked' : ''}>
        <label for="propUnderline">Underline</label>
      </div>
      <div class="checkbox-row property-row">
        <input type="checkbox" id="propLinethrough" ${(activeObject as any).linethrough ? 'checked' : ''}>
        <label for="propLinethrough">Strikethrough</label>
      </div>
      <div class="checkbox-row property-row">
        <input type="checkbox" id="propOverline" ${(activeObject as any).overline ? 'checked' : ''}>
        <label for="propOverline">Overline</label>
      </div>
    `;
  }
  
  html += `
    <div class="property-row">
      <button id="deleteObj" style="background: #e74c3c; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; width: 100%;">Delete Object</button>
    </div>
  `;
  
  propertiesPanel.innerHTML = html;
  
  // Add event listeners to property inputs
  document.getElementById('propLeft')?.addEventListener('input', (e) => {
    activeObject.set('left', parseInt((e.target as HTMLInputElement).value));
    canvas.renderAll();
  });
  
  document.getElementById('propTop')?.addEventListener('input', (e) => {
    activeObject.set('top', parseInt((e.target as HTMLInputElement).value));
    canvas.renderAll();
  });
  
  document.getElementById('propFill')?.addEventListener('input', (e) => {
    activeObject.set('fill', (e.target as HTMLInputElement).value);
    canvas.renderAll();
  });
  
  document.getElementById('propStroke')?.addEventListener('input', (e) => {
    activeObject.set('stroke', (e.target as HTMLInputElement).value);
    canvas.renderAll();
  });
  
  document.getElementById('propStrokeWidth')?.addEventListener('input', (e) => {
    activeObject.set('strokeWidth', parseInt((e.target as HTMLInputElement).value));
    canvas.renderAll();
  });
  
  document.getElementById('propAngle')?.addEventListener('input', (e) => {
    activeObject.set('angle', parseInt((e.target as HTMLInputElement).value));
    canvas.renderAll();
  });
  
  document.getElementById('propOpacity')?.addEventListener('input', (e) => {
    activeObject.set('opacity', parseInt((e.target as HTMLInputElement).value) / 100);
    canvas.renderAll();
  });
  
  if (type === 'text' || type === 'textbox') {
    const textObj = activeObject as fabric.Textbox;
    
    document.getElementById('propText')?.addEventListener('input', (e) => {
      textObj.set('text', (e.target as HTMLInputElement).value);
      canvas.renderAll();
    });
    
    document.getElementById('propFontSize')?.addEventListener('input', (e) => {
      textObj.set('fontSize', parseInt((e.target as HTMLInputElement).value));
      canvas.renderAll();
    });
    
    document.getElementById('propFontFamily')?.addEventListener('change', (e) => {
      textObj.set('fontFamily', (e.target as HTMLSelectElement).value);
      canvas.renderAll();
    });
    
    document.getElementById('propTextAlign')?.addEventListener('change', (e) => {
      textObj.set('textAlign', (e.target as HTMLSelectElement).value as any);
      canvas.renderAll();
    });
  }

  // Blend mode
  document.getElementById('propBlendMode')?.addEventListener('change', (e) => {
    (activeObject as any).globalCompositeOperation = (e.target as HTMLSelectElement).value;
    canvas.renderAll();
  });

  // Shadow
  function updateShadow() {
    const color = (document.getElementById('propShadowColor') as HTMLInputElement)?.value ?? '#000000';
    const offsetX = parseInt((document.getElementById('propShadowOffsetX') as HTMLInputElement)?.value ?? '0');
    const offsetY = parseInt((document.getElementById('propShadowOffsetY') as HTMLInputElement)?.value ?? '0');
    if (activeObject) {
      activeObject.set('shadow', new fabric.Shadow({ color, offsetX, offsetY, blur: 0 }));
      canvas.renderAll();
    }
  }
  document.getElementById('propShadowColor')?.addEventListener('input', updateShadow);
  document.getElementById('propShadowOffsetX')?.addEventListener('input', updateShadow);
  document.getElementById('propShadowOffsetY')?.addEventListener('input', updateShadow);

  // Text decorations
  document.getElementById('propUnderline')?.addEventListener('change', (e) => {
    if (activeObject) { (activeObject as any).set('underline', (e.target as HTMLInputElement).checked); canvas.renderAll(); }
  });
  document.getElementById('propLinethrough')?.addEventListener('change', (e) => {
    if (activeObject) { (activeObject as any).set('linethrough', (e.target as HTMLInputElement).checked); canvas.renderAll(); }
  });
  document.getElementById('propOverline')?.addEventListener('change', (e) => {
    if (activeObject) { (activeObject as any).set('overline', (e.target as HTMLInputElement).checked); canvas.renderAll(); }
  });
  document.getElementById('propCharSpacing')?.addEventListener('input', (e) => {
    if (activeObject) { (activeObject as any).set('charSpacing', parseInt((e.target as HTMLInputElement).value) || 0); canvas.renderAll(); }
  });
  document.getElementById('propTextBgEnabled')?.addEventListener('change', (e) => {
    const enabled = (e.target as HTMLInputElement).checked;
    const color = (document.getElementById('propTextBg') as HTMLInputElement)?.value ?? '#ffffff';
    if (activeObject) { (activeObject as any).set('textBackgroundColor', enabled ? color : null); canvas.renderAll(); }
  });
  document.getElementById('propTextBg')?.addEventListener('input', (e) => {
    const enabled = (document.getElementById('propTextBgEnabled') as HTMLInputElement)?.checked;
    if (enabled && activeObject) { (activeObject as any).set('textBackgroundColor', (e.target as HTMLInputElement).value); canvas.renderAll(); }
  });

  document.getElementById('deleteObj')?.addEventListener('click', () => {
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    updatePropertiesPanel();
    showStatus('Object deleted', 'success');
  });
}

// Listen for selection changes
canvas.on('selection:created', updatePropertiesPanel);
canvas.on('selection:updated', updatePropertiesPanel);
canvas.on('selection:cleared', updatePropertiesPanel);
canvas.on('object:modified', updatePropertiesPanel);

// Export to PDF
async function exportToPDF() {
  try {
    showStatus('Generating PDF...', '');
    
    // Get canvas JSON
    const canvasJSON = canvas.toJSON([
      'selectable',
      'hasControls',
      'hasBorders',
      'lockMovementX',
      'lockMovementY'
    ]);
    
    // Convert using our library
    const parsed = parseCanvasJSON(canvasJSON);
    const options = resolveOptions({
      pageWidth: canvas.width,
      pageHeight: canvas.height,
      backgroundColor: canvas.backgroundColor as string
    }, parsed);
    
    const result = await convertCanvasToPdf(parsed, options);
    
    // Download the PDF
    const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-export.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (result.warnings.length > 0) {
      console.warn('PDF Warnings:', result.warnings);
      showStatus(`PDF exported with ${result.warnings.length} warnings`, 'success');
    } else {
      showStatus('PDF exported successfully!', 'success');
    }
  } catch (error) {
    console.error('Export failed:', error);
    showStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

// Copy canvas JSON to clipboard
function copyCanvasJSON() {
  try {
    const canvasJSON = canvas.toJSON([
      'selectable',
      'hasControls',
      'hasBorders',
      'lockMovementX',
      'lockMovementY'
    ]);
    
    const jsonString = JSON.stringify(canvasJSON, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      showStatus('Canvas JSON copied to clipboard!', 'success');
      console.log('Canvas JSON:', jsonString);
    }).catch((err) => {
      console.error('Failed to copy:', err);
      showStatus('Failed to copy JSON', 'error');
    });
  } catch (error) {
    console.error('Copy failed:', error);
    showStatus(`Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

// Preview PDF using pdf.js (simulates what pdf-to-img would generate)
async function previewPDF() {
  try {
    showStatus('Generating PDF preview...', '');

    // Get canvas JSON
    const canvasJSON = canvas.toJSON([
      'selectable',
      'hasControls',
      'hasBorders',
      'lockMovementX',
      'lockMovementY'
    ]);

    // Convert using our library
    const parsed = parseCanvasJSON(canvasJSON);
    const options = resolveOptions({
      pageWidth: canvas.width,
      pageHeight: canvas.height,
      backgroundColor: canvas.backgroundColor as string
    }, parsed);

    const result = await convertCanvasToPdf(parsed, options);

    // Show modal
    const modal = document.getElementById('previewModal')!;
    const loading = document.getElementById('previewLoading')!;
    const previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;

    modal.classList.add('show');
    loading.style.display = 'block';
    previewCanvas.style.display = 'none';

    // Render PDF using pdf.js
    const pdfData = new Uint8Array(result.pdfBytes);
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);

    // Set up canvas for rendering
    const viewport = page.getViewport({ scale: 1.5 });
    previewCanvas.width = viewport.width;
    previewCanvas.height = viewport.height;

    const ctx = previewCanvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Render page
    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    loading.style.display = 'none';
    previewCanvas.style.display = 'block';

    showStatus('PDF preview generated', 'success');
  } catch (error) {
    console.error('Preview failed:', error);
    showStatus(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    closePreview();
  }
}

// Close preview modal
function closePreview() {
  const modal = document.getElementById('previewModal')!;
  modal.classList.remove('show');
}

// Show status message
function showStatus(message: string, type: 'success' | 'error' | '') {
  statusEl.textContent = message;
  statusEl.className = 'status show' + (type ? ` ${type}` : '');
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

// Demo preset loaders
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

// Initialize with a demo object
addObject('rect');
showStatus('Welcome! Add objects and click Export to PDF', 'success');
