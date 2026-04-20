import { describe, it, expect } from 'vitest';
import {
  ConversionError,
  FontNotFoundError,
  ImageLoadError,
  UnsupportedFeatureError,
  InvalidInputError,
} from '../../../src/errors/conversion-error';

describe('ConversionError', () => {
  it('should extend Error', () => {
    const error = new ConversionError('test message', 5, 'rect');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConversionError);
  });

  it('should store message, objectIndex, and objectType', () => {
    const error = new ConversionError('test message', 5, 'rect');
    expect(error.message).toBe('test message');
    expect(error.objectIndex).toBe(5);
    expect(error.objectType).toBe('rect');
  });

  it('should have correct error name', () => {
    const error = new ConversionError('test', 0, 'circle');
    expect(error.name).toBe('ConversionError');
  });
});

describe('FontNotFoundError', () => {
  it('should extend ConversionError', () => {
    const error = new FontNotFoundError('Arial', 3, 'text');
    expect(error).toBeInstanceOf(ConversionError);
    expect(error).toBeInstanceOf(FontNotFoundError);
  });

  it('should store font family in message', () => {
    const error = new FontNotFoundError('Arial', 3, 'text');
    expect(error.message).toContain('Arial');
    expect(error.objectIndex).toBe(3);
    expect(error.objectType).toBe('text');
  });

  it('should have correct error name', () => {
    const error = new FontNotFoundError('Times', 0, 'text');
    expect(error.name).toBe('FontNotFoundError');
  });
});

describe('ImageLoadError', () => {
  it('should extend ConversionError', () => {
    const error = new ImageLoadError('https://example.com/img.png', 7, 'image');
    expect(error).toBeInstanceOf(ConversionError);
    expect(error).toBeInstanceOf(ImageLoadError);
  });

  it('should store image source in message', () => {
    const error = new ImageLoadError('https://example.com/img.png', 7, 'image');
    expect(error.message).toContain('https://example.com/img.png');
    expect(error.objectIndex).toBe(7);
    expect(error.objectType).toBe('image');
  });

  it('should have correct error name', () => {
    const error = new ImageLoadError('data:image/png;base64,abc', 0, 'image');
    expect(error.name).toBe('ImageLoadError');
  });
});

describe('UnsupportedFeatureError', () => {
  it('should extend ConversionError', () => {
    const error = new UnsupportedFeatureError('gradients', 2, 'rect');
    expect(error).toBeInstanceOf(ConversionError);
    expect(error).toBeInstanceOf(UnsupportedFeatureError);
  });

  it('should store feature name in message', () => {
    const error = new UnsupportedFeatureError('shadows', 4, 'text');
    expect(error.message).toContain('shadows');
    expect(error.objectIndex).toBe(4);
    expect(error.objectType).toBe('text');
  });

  it('should have correct error name', () => {
    const error = new UnsupportedFeatureError('patterns', 0, 'rect');
    expect(error.name).toBe('UnsupportedFeatureError');
  });
});

describe('InvalidInputError', () => {
  it('should extend Error', () => {
    const error = new InvalidInputError('invalid canvas json');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InvalidInputError);
  });

  it('should store message', () => {
    const error = new InvalidInputError('missing objects array');
    expect(error.message).toBe('missing objects array');
  });

  it('should have correct error name', () => {
    const error = new InvalidInputError('test');
    expect(error.name).toBe('InvalidInputError');
  });
});
