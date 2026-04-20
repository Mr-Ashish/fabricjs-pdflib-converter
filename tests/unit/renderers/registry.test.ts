import { describe, it, expect } from 'vitest';
import { RendererRegistry, createDefaultRegistry } from '../../../src/renderers/registry';
import type { ObjectRenderer, FabricObject, RenderContext } from '../../../src/types';
import type { PDFPage } from 'pdf-lib';

// Mock renderer for testing
function createMockRenderer(type: string): ObjectRenderer {
  return {
    type,
    canRender: (obj: FabricObject) => obj.type === type,
    render: (obj: FabricObject, page: PDFPage, context: RenderContext) => {
      // Mock render
    },
  };
}

describe('RendererRegistry', () => {
  describe('register', () => {
    it('should store renderer by type', () => {
      const registry = new RendererRegistry();
      const renderer = createMockRenderer('rect');

      registry.register(renderer);

      expect(registry.get('rect')).toBe(renderer);
    });

    it('should allow multiple renderers', () => {
      const registry = new RendererRegistry();
      const rectRenderer = createMockRenderer('rect');
      const circleRenderer = createMockRenderer('circle');

      registry.register(rectRenderer);
      registry.register(circleRenderer);

      expect(registry.get('rect')).toBe(rectRenderer);
      expect(registry.get('circle')).toBe(circleRenderer);
    });

    it('should overwrite existing renderer with same type', () => {
      const registry = new RendererRegistry();
      const renderer1 = createMockRenderer('rect');
      const renderer2 = createMockRenderer('rect');

      registry.register(renderer1);
      registry.register(renderer2);

      expect(registry.get('rect')).toBe(renderer2);
    });
  });

  describe('get', () => {
    it('should return renderer for registered type', () => {
      const registry = new RendererRegistry();
      const renderer = createMockRenderer('rect');
      registry.register(renderer);

      expect(registry.get('rect')).toBe(renderer);
    });

    it('should return undefined for unregistered type', () => {
      const registry = new RendererRegistry();

      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered type', () => {
      const registry = new RendererRegistry();
      registry.register(createMockRenderer('rect'));

      expect(registry.has('rect')).toBe(true);
    });

    it('should return false for unregistered type', () => {
      const registry = new RendererRegistry();

      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return empty map for new registry', () => {
      const registry = new RendererRegistry();

      expect(registry.getAll().size).toBe(0);
    });

    it('should return all registered renderers', () => {
      const registry = new RendererRegistry();
      const rectRenderer = createMockRenderer('rect');
      const circleRenderer = createMockRenderer('circle');

      registry.register(rectRenderer);
      registry.register(circleRenderer);

      const all = registry.getAll();
      expect(all.size).toBe(2);
      expect(all.get('rect')).toBe(rectRenderer);
      expect(all.get('circle')).toBe(circleRenderer);
    });

    it('should return a copy of the internal map', () => {
      const registry = new RendererRegistry();
      registry.register(createMockRenderer('rect'));

      const all = registry.getAll();
      all.delete('rect');

      expect(registry.has('rect')).toBe(true);
    });
  });
});

describe('createDefaultRegistry', () => {
  it('should return a RendererRegistry instance', () => {
    const registry = createDefaultRegistry();
    expect(registry).toBeInstanceOf(RendererRegistry);
  });

  it('should return registry with all built-in renderers registered', () => {
    const registry = createDefaultRegistry();
    expect(registry.getAll().size).toBe(8); // 5 shape + 3 vector path renderers
    expect(registry.has('rect')).toBe(true);
    expect(registry.has('circle')).toBe(true);
    expect(registry.has('ellipse')).toBe(true);
    expect(registry.has('triangle')).toBe(true);
    expect(registry.has('line')).toBe(true);
    expect(registry.has('path')).toBe(true);
    expect(registry.has('polyline')).toBe(true);
    expect(registry.has('polygon')).toBe(true);
  });
});
