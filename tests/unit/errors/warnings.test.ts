import { describe, it, expect, vi } from 'vitest';
import { WarningCollector } from '../../../src/errors/warnings';
import type { ConversionWarning } from '../../../src/types';

describe('WarningCollector', () => {
  it('should start with no warnings', () => {
    const collector = new WarningCollector();
    expect(collector.hasWarnings()).toBe(false);
    expect(collector.getAll()).toEqual([]);
  });

  it('should add warnings', () => {
    const collector = new WarningCollector();
    const warning: ConversionWarning = {
      type: 'unsupported_feature',
      objectType: 'rect',
      objectIndex: 0,
      feature: 'gradients',
      message: 'Linear gradients are not supported',
    };

    collector.add(warning);

    expect(collector.hasWarnings()).toBe(true);
    expect(collector.getAll()).toHaveLength(1);
    expect(collector.getAll()[0]).toEqual(warning);
  });

  it('should add multiple warnings', () => {
    const collector = new WarningCollector();
    const warning1: ConversionWarning = {
      type: 'unsupported_feature',
      objectType: 'rect',
      objectIndex: 0,
      feature: 'gradients',
      message: 'Linear gradients are not supported',
    };
    const warning2: ConversionWarning = {
      type: 'font_missing',
      objectType: 'text',
      objectIndex: 1,
      feature: 'Arial',
      message: 'Font Arial not found, using fallback',
    };

    collector.add(warning1);
    collector.add(warning2);

    expect(collector.getAll()).toHaveLength(2);
    expect(collector.getAll()).toEqual([warning1, warning2]);
  });

  it('should call onWarning callback when provided', () => {
    const onWarning = vi.fn();
    const collector = new WarningCollector(onWarning);
    const warning: ConversionWarning = {
      type: 'unsupported_feature',
      objectType: 'circle',
      objectIndex: 2,
      feature: 'shadows',
      message: 'Shadows are not supported',
    };

    collector.add(warning);

    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(warning);
  });

  it('should not fail if onWarning callback is not provided', () => {
    const collector = new WarningCollector();
    const warning: ConversionWarning = {
      type: 'unsupported_feature',
      objectType: 'rect',
      objectIndex: 0,
      feature: 'patterns',
      message: 'Patterns are not supported',
    };

    expect(() => collector.add(warning)).not.toThrow();
    expect(collector.hasWarnings()).toBe(true);
  });

  it('should clear all warnings', () => {
    const collector = new WarningCollector();
    const warning: ConversionWarning = {
      type: 'unsupported_feature',
      objectType: 'rect',
      objectIndex: 0,
      feature: 'gradients',
      message: 'Linear gradients are not supported',
    };

    collector.add(warning);
    expect(collector.hasWarnings()).toBe(true);

    collector.clear();

    expect(collector.hasWarnings()).toBe(false);
    expect(collector.getAll()).toEqual([]);
  });

  it('should return independent array from getAll', () => {
    const collector = new WarningCollector();
    const warning: ConversionWarning = {
      type: 'unsupported_feature',
      objectType: 'rect',
      objectIndex: 0,
      feature: 'gradients',
      message: 'Linear gradients are not supported',
    };

    collector.add(warning);
    const warnings = collector.getAll();
    warnings.pop();

    expect(collector.getAll()).toHaveLength(1);
  });
});
