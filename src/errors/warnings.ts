import type { ConversionWarning, WarningHandler } from '../types';

/**
 * Collects warnings during the conversion process.
 * Provides an optional callback for real-time warning handling.
 */
export class WarningCollector {
  private warnings: ConversionWarning[] = [];

  /**
   * Creates a new WarningCollector.
   * @param onWarning - Optional callback invoked for each warning added
   */
  constructor(private readonly onWarning?: WarningHandler) {}

  /**
   * Add a warning to the collection.
   * If a callback was provided, it will be invoked with the warning.
   * @param warning - The warning to add
   */
  add(warning: ConversionWarning): void {
    this.warnings.push(warning);
    this.onWarning?.(warning);
  }

  /**
   * Get all collected warnings.
   * @returns A new array containing all warnings
   */
  getAll(): ConversionWarning[] {
    return [...this.warnings];
  }

  /**
   * Check if any warnings have been collected.
   * @returns True if warnings exist
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Clear all collected warnings.
   */
  clear(): void {
    this.warnings = [];
  }
}
