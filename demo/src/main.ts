import { fabric } from 'fabric';
import { 
  parseCanvasJSON, 
  resolveOptions, 
  convertCanvasToPdf 
} from '../../dist/index.js';

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
        </select>
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

// Show status message
function showStatus(message: string, type: 'success' | 'error' | '') {
  statusEl.textContent = message;
  statusEl.className = 'status show' + (type ? ` ${type}` : '');
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

// Initialize with a demo object
addObject('rect');
showStatus('Welcome! Add objects and click Export to PDF', 'success');
