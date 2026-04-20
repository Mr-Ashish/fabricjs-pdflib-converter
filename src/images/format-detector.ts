/**
 * Image format detection utilities.
 * Detects PNG and JPG formats from magic bytes or data URL MIME types.
 */

/**
 * Detect image format from magic bytes.
 *
 * @param bytes - Image file bytes
 * @returns 'png', 'jpg', or 'unknown'
 */
export function detectImageFormat(bytes: Uint8Array): 'png' | 'jpg' | 'unknown' {
  // Need at least 4 bytes for PNG, 3 for JPG
  if (bytes.length < 3) {
    return 'unknown';
  }

  // PNG magic bytes: 0x89 0x50 0x4E 0x47
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }

  // JPG magic bytes: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg';
  }

  return 'unknown';
}

/**
 * Detect image format from a data URL.
 *
 * @param dataUrl - Data URL string (e.g., "data:image/png;base64,...")
 * @returns 'png', 'jpg', or 'unknown'
 */
export function detectFormatFromDataUrl(dataUrl: string): 'png' | 'jpg' | 'unknown' {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return 'unknown';
  }

  // Extract MIME type from data URL
  // Format: data:[<mediatype>][;base64],<data>
  const match = dataUrl.match(/^data:([^;,]+)/i);
  if (!match) {
    return 'unknown';
  }

  const mimeType = match[1]!.toLowerCase();

  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return 'jpg';
  }

  return 'unknown';
}
