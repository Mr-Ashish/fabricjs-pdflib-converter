import { describe, it, expect } from 'vitest';
import {
  detectImageFormat,
  detectFormatFromDataUrl,
} from '../../../src/images/format-detector';

describe('detectImageFormat', () => {
  it('should detect PNG from magic bytes', () => {
    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(detectImageFormat(pngBytes)).toBe('png');
  });

  it('should detect JPG from magic bytes', () => {
    // JPG magic bytes: 0xFF 0xD8 0xFF
    const jpgBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    expect(detectImageFormat(jpgBytes)).toBe('jpg');
  });

  it('should return unknown for unrecognized format', () => {
    const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    expect(detectImageFormat(unknownBytes)).toBe('unknown');
  });

  it('should return unknown for empty array', () => {
    const emptyBytes = new Uint8Array([]);
    expect(detectImageFormat(emptyBytes)).toBe('unknown');
  });

  it('should return unknown for too short array', () => {
    const shortBytes = new Uint8Array([0x89, 0x50]); // Only 2 bytes
    expect(detectImageFormat(shortBytes)).toBe('unknown');
  });

  it('should handle PNG with additional header bytes', () => {
    // Full PNG header: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
    ]);
    expect(detectImageFormat(pngBytes)).toBe('png');
  });

  it('should handle JPG with different markers', () => {
    // JPG can have different markers after 0xFFD8FF
    const jpgBytes1 = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1]); // APP1 marker (EXIF)
    expect(detectImageFormat(jpgBytes1)).toBe('jpg');

    const jpgBytes2 = new Uint8Array([0xFF, 0xD8, 0xFF, 0xDB]); // DQT marker
    expect(detectImageFormat(jpgBytes2)).toBe('jpg');
  });
});

describe('detectFormatFromDataUrl', () => {
  it('should detect PNG from data URL', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAA';
    expect(detectFormatFromDataUrl(dataUrl)).toBe('png');
  });

  it('should detect JPG from data URL with image/jpeg', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA';
    expect(detectFormatFromDataUrl(dataUrl)).toBe('jpg');
  });

  it('should detect JPG from data URL with image/jpg', () => {
    const dataUrl = 'data:image/jpg;base64,/9j/4AAQSkZJRgABA';
    expect(detectFormatFromDataUrl(dataUrl)).toBe('jpg');
  });

  it('should return unknown for unsupported MIME type', () => {
    const dataUrl = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4';
    expect(detectFormatFromDataUrl(dataUrl)).toBe('unknown');
  });

  it('should return unknown for invalid data URL', () => {
    const invalidUrl = 'not-a-data-url';
    expect(detectFormatFromDataUrl(invalidUrl)).toBe('unknown');
  });

  it('should return unknown for empty string', () => {
    expect(detectFormatFromDataUrl('')).toBe('unknown');
  });

  it('should handle data URL without MIME type', () => {
    const dataUrl = 'data:base64,iVBORw0KGgoAAAA';
    expect(detectFormatFromDataUrl(dataUrl)).toBe('unknown');
  });

  it('should handle case-insensitive MIME type', () => {
    const dataUrl = 'data:image/PNG;base64,iVBORw0KGgoAAAA';
    expect(detectFormatFromDataUrl(dataUrl)).toBe('png');
  });
});
