import { describe, it, expect } from 'vitest';
import { resolveOptions, convertCanvasToPdf } from '../../src/index';
import type { FabricCanvasJSON, FabricObject } from '../../src/types';

/**
 * Integration tests for Fabric-parity textbox word wrapping.
 *
 * pdf-lib compresses content streams, so we can't scan the raw PDF bytes for
 * `Tj` operators directly. Instead we rely on observable pipeline effects:
 *   1. The full convert-pipeline succeeds for wrapping textboxes (no throws).
 *   2. A narrow textbox produces a strictly larger (compressed) content
 *      stream than a wide textbox for the same text — more wrapped lines
 *      means more draw operators means a larger payload.
 *   3. A `textbox` produces a larger payload than the same text as a plain
 *      `text` object, because plain text is not auto-wrapped.
 */

function createTextbox(
  props: Partial<FabricObject> & { text: string; width: number },
): FabricObject {
  return {
    type: 'textbox',
    left: 50,
    top: 50,
    width: props.width,
    height: 200,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'left',
    originY: 'top',
    fill: '#000000',
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
    visible: true,
    text: props.text,
    fontFamily: 'Helvetica',
    fontSize: 16,
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
    minWidth: 20,
    dynamicMinWidth: 2,
    splitByGrapheme: false,
    ...props,
  } as FabricObject;
}

async function renderCanvas(canvas: FabricCanvasJSON): Promise<Uint8Array> {
  const result = await convertCanvasToPdf(canvas, resolveOptions({}, canvas));
  return result.pdfBytes;
}

describe('Textbox word wrapping (integration)', () => {
  it('produces valid PDF bytes for a wrapping textbox', async () => {
    const canvas: FabricCanvasJSON = {
      version: '5.3.0',
      width: 400,
      height: 400,
      objects: [
        createTextbox({
          text: 'The quick brown fox jumps over the lazy dog.',
          width: 100,
        }),
      ],
    };

    const bytes = await renderCanvas(canvas);
    expect(bytes.length).toBeGreaterThan(0);
    // Valid PDF header.
    const header = new TextDecoder('latin1').decode(bytes.subarray(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('narrower textbox produces a larger content payload than a wide one', async () => {
    const longText =
      'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.';

    const narrow = await renderCanvas({
      version: '5.3.0',
      width: 600,
      height: 400,
      objects: [createTextbox({ text: longText, width: 120 })],
    });
    const wide = await renderCanvas({
      version: '5.3.0',
      width: 600,
      height: 400,
      objects: [createTextbox({ text: longText, width: 600 })],
    });

    // More wrapped lines → more draw operators → larger compressed stream.
    expect(narrow.length).toBeGreaterThan(wide.length);
  });

  it('textbox output is larger than an equivalent plain-text object (which does not auto-wrap)', async () => {
    const longText =
      'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.';

    const textbox = await renderCanvas({
      version: '5.3.0',
      width: 600,
      height: 400,
      objects: [createTextbox({ text: longText, width: 120 })],
    });
    const plainText = await renderCanvas({
      version: '5.3.0',
      width: 600,
      height: 400,
      objects: [
        { ...createTextbox({ text: longText, width: 120 }), type: 'text' } as FabricObject,
      ],
    });

    // Plain text: single drawText call. Textbox: multiple wrapped drawText calls.
    expect(textbox.length).toBeGreaterThan(plainText.length);
  });

  it('handles explicit newlines combined with auto-wrapping without crashing', async () => {
    const canvas: FabricCanvasJSON = {
      version: '5.3.0',
      width: 400,
      height: 400,
      objects: [
        createTextbox({
          text: 'First paragraph that should wrap.\nSecond paragraph that should also wrap.',
          width: 100,
        }),
      ],
    };

    const bytes = await renderCanvas(canvas);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('handles splitByGrapheme for character-level wrapping', async () => {
    const canvas: FabricCanvasJSON = {
      version: '5.3.0',
      width: 400,
      height: 400,
      objects: [
        {
          ...createTextbox({ text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', width: 80 }),
          splitByGrapheme: true,
        } as FabricObject,
      ],
    };

    const bytes = await renderCanvas(canvas);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
