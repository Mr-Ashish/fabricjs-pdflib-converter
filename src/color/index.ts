import type { ColorResult } from '../types';

/**
 * Named color map for CSS color names.
 * Maps color names to hex values.
 */
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  silver: '#C0C0C0',
  gray: '#808080',
  grey: '#808080',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00FF00',
  aqua: '#00FFFF',
  teal: '#008080',
  navy: '#000080',
  fuchsia: '#FF00FF',
  purple: '#800080',
  orange: '#FFA500',
};

/**
 * Parses a CSS color string and returns RGB components normalized to 0-1 range.
 * Supports hex (#RGB, #RRGGBB, #RGBA, #RRGGBBAA), rgb/rgba(), and named colors.
 *
 * @param color - CSS color string or null
 * @returns ColorResult with r, g, b in 0-1 range and optional alpha, or null if invalid/transparent
 */
export function parseColor(color: string | null): ColorResult | null {
  if (color === null || color === undefined) {
    return null;
  }

  const trimmed = color.trim();

  if (trimmed === '' || trimmed === 'transparent') {
    return null;
  }

  // Try hex format
  const hexResult = parseHexColor(trimmed);
  if (hexResult) {
    return hexResult;
  }

  // Try rgb/rgba format
  const rgbResult = parseRgbColor(trimmed);
  if (rgbResult) {
    return rgbResult;
  }

  // Try named color
  const namedHex = NAMED_COLORS[trimmed.toLowerCase()];
  if (namedHex) {
    return parseHexColor(namedHex);
  }

  // Unknown color format, return null
  return null;
}

/**
 * Parses hex color formats: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
 */
function parseHexColor(hex: string): ColorResult | null {
  // Remove leading # if present
  let cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;

  // Validate hex characters
  if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
    return null;
  }

  let r: number;
  let g: number;
  let b: number;
  let a: number | undefined;

  switch (cleanHex.length) {
    case 3: {
      // #RGB
      r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
      g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
      b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
      break;
    }
    case 4: {
      // #RGBA
      r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
      g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
      b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
      a = parseInt(cleanHex[3] + cleanHex[3], 16) / 255;
      break;
    }
    case 6: {
      // #RRGGBB
      r = parseInt(cleanHex.slice(0, 2), 16) / 255;
      g = parseInt(cleanHex.slice(2, 4), 16) / 255;
      b = parseInt(cleanHex.slice(4, 6), 16) / 255;
      break;
    }
    case 8: {
      // #RRGGBBAA
      r = parseInt(cleanHex.slice(0, 2), 16) / 255;
      g = parseInt(cleanHex.slice(2, 4), 16) / 255;
      b = parseInt(cleanHex.slice(4, 6), 16) / 255;
      a = parseInt(cleanHex.slice(6, 8), 16) / 255;
      break;
    }
    default:
      return null;
  }

  const result: ColorResult = {
    r: roundTo3Decimals(clamp(r, 0, 1)),
    g: roundTo3Decimals(clamp(g, 0, 1)),
    b: roundTo3Decimals(clamp(b, 0, 1)),
    a: a !== undefined ? roundTo3Decimals(clamp(a, 0, 1)) : 1,
  };

  return result;
}

/**
 * Parses rgb() and rgba() color formats.
 */
function parseRgbColor(rgb: string): ColorResult | null {
  // Match rgb() or rgba() patterns
  const match = rgb.match(
    /^rgba?\s*\(\s*([^)]+)\s*\)$/i,
  );

  if (!match) {
    return null;
  }

  const parts = match[1].split(',').map((p) => p.trim());

  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  const r = parseColorComponent(parts[0]!);
  const g = parseColorComponent(parts[1]!);
  const b = parseColorComponent(parts[2]!);
  const a = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;

  const result: ColorResult = {
    r: roundTo3Decimals(clamp(r, 0, 1)),
    g: roundTo3Decimals(clamp(g, 0, 1)),
    b: roundTo3Decimals(clamp(b, 0, 1)),
    a: roundTo3Decimals(clamp(a, 0, 1)),
  };

  return result;
}

/**
 * Parses a single color component (number or percentage).
 */
function parseColorComponent(value: string): number {
  if (value.endsWith('%')) {
    const percent = parseFloat(value.slice(0, -1));
    return percent / 100;
  }
  return parseInt(value, 10) / 255;
}

/**
 * Parses alpha value (number).
 */
function parseAlpha(value: string): number {
  return parseFloat(value);
}

/**
 * Clamps a value to a range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rounds a number to 3 decimal places.
 */
function roundTo3Decimals(value: number): number {
  return Math.round(value * 1000) / 1000;
}
