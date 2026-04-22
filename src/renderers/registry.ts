import type { ObjectRenderer } from '../types';
import { RectRenderer } from './rect.renderer';
import { CircleRenderer } from './circle.renderer';
import { EllipseRenderer } from './ellipse.renderer';
import { TriangleRenderer } from './triangle.renderer';
import { LineRenderer } from './line.renderer';
import { PathRenderer } from './path.renderer';
import { PolylineRenderer } from './polyline.renderer';
import { PolygonRenderer } from './polygon.renderer';
import { ImageRenderer } from './image.renderer';
import { TextRenderer } from './text.renderer';
import { GroupRenderer } from './group.renderer';

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
   * @param extraTypes - Optional Fabric `type` strings that map to the same renderer
   *   (e.g. text + i-text + textbox all use {@link TextRenderer}).
   */
  register(renderer: ObjectRenderer, extraTypes?: readonly string[]): void {
    this.renderers.set(renderer.type, renderer);
    if (extraTypes) {
      for (const t of extraTypes) {
        this.renderers.set(t, renderer);
      }
    }
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
 * Registers shape renderers from Epic 5.
 *
 * @returns A new RendererRegistry instance
 */
export function createDefaultRegistry(): RendererRegistry {
  const registry = new RendererRegistry();

  // Shape renderers (Epic 5)
  registry.register(new RectRenderer());
  registry.register(new CircleRenderer());
  registry.register(new EllipseRenderer());
  registry.register(new TriangleRenderer());
  registry.register(new LineRenderer());

  // Vector path renderers (Epic 6)
  registry.register(new PathRenderer());
  registry.register(new PolylineRenderer());
  registry.register(new PolygonRenderer());

  // Image renderer (Epic 7)
  registry.register(new ImageRenderer());

  // Text renderer (Epic 9) — Fabric uses distinct `type` values for Text / IText / Textbox
  registry.register(new TextRenderer(), ['i-text', 'textbox']);

  // Group renderer (Epic 10)
  registry.register(new GroupRenderer());

  return registry;
}
