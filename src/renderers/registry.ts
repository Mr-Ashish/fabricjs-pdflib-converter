import type { ObjectRenderer } from '../types';

/**
 * Registry that maps Fabric.js object type strings to their renderers.
 * Provides type-based lookup for the converter pipeline.
 */
export class RendererRegistry {
  private renderers = new Map<string, ObjectRenderer>();

  /**
   * Register a renderer for its type.
   * Overwrites any existing renderer for the same type.
   *
   * @param renderer - The renderer to register
   */
  register(renderer: ObjectRenderer): void {
    this.renderers.set(renderer.type, renderer);
  }

  /**
   * Get the renderer for a specific object type.
   *
   * @param type - The object type string
   * @returns The renderer or undefined if not found
   */
  get(type: string): ObjectRenderer | undefined {
    return this.renderers.get(type);
  }

  /**
   * Check if a renderer exists for a type.
   *
   * @param type - The object type string
   * @returns True if a renderer is registered
   */
  has(type: string): boolean {
    return this.renderers.has(type);
  }

  /**
   * Get all registered renderers.
   *
   * @returns A new Map containing all type -> renderer mappings
   */
  getAll(): Map<string, ObjectRenderer> {
    return new Map(this.renderers);
  }
}

/**
 * Factory function that creates a registry with all built-in renderers.
 * Currently returns an empty registry - renderers will be registered
 * in subsequent epics (5-10).
 *
 * @returns A new RendererRegistry instance
 */
export function createDefaultRegistry(): RendererRegistry {
  const registry = new RendererRegistry();

  // Built-in renderers will be registered here in Epics 5-10:
  // registry.register(new RectRenderer());
  // registry.register(new CircleRenderer());
  // etc.

  return registry;
}
