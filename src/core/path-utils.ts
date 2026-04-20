import type { PathCommand } from '../types';

/**
 * PDF path operation types.
 */
export type PdfPathOp =
  | { type: 'moveTo'; x: number; y: number }
  | { type: 'lineTo'; x: number; y: number }
  | { type: 'curveTo'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { type: 'closePath' };

/**
 * Converts Fabric.js path commands to an SVG path string.
 *
 * @param commands - Array of Fabric.js path commands
 * @returns SVG path string
 */
export function pathCommandsToSvg(commands: PathCommand[]): string {
  return commands
    .map((cmd) => {
      const type = cmd[0];
      switch (type) {
        case 'M':
          return `M ${cmd[1]} ${cmd[2]}`;
        case 'L':
          return `L ${cmd[1]} ${cmd[2]}`;
        case 'C':
          return `C ${cmd[1]} ${cmd[2]} ${cmd[3]} ${cmd[4]} ${cmd[5]} ${cmd[6]}`;
        case 'Q':
          return `Q ${cmd[1]} ${cmd[2]} ${cmd[3]} ${cmd[4]}`;
        case 'A':
          return `A ${cmd[1]} ${cmd[2]} ${cmd[3]} ${cmd[4]} ${cmd[5]} ${cmd[6]} ${cmd[7]}`;
        case 'Z':
          return 'Z';
        default:
          return '';
      }
    })
    .join(' ');
}

/**
 * Parses an SVG path string and converts to PDF path operations.
 *
 * @param svgPath - SVG path string
 * @returns Array of PDF path operations
 */
export function svgPathToPdfOps(svgPath: string): PdfPathOp[] {
  const ops: PdfPathOp[] = [];

  // Simple regex-based parser for SVG path commands
  const commandRegex = /([MmLlCcQqAaZz])\s*([^MmLlCcQqAaZz]*)/g;
  let match: RegExpExecArray | null;

  while ((match = commandRegex.exec(svgPath)) !== null) {
    const type = match[1]!.toUpperCase();
    const argsStr = match[2]!.trim();
    const args = argsStr.split(/[\s,]+/).filter(Boolean).map(parseFloat);

    switch (type) {
      case 'M':
        if (args.length >= 2) {
          ops.push({ type: 'moveTo', x: args[0]!, y: args[1]! });
        }
        break;
      case 'L':
        if (args.length >= 2) {
          ops.push({ type: 'lineTo', x: args[0]!, y: args[1]! });
        }
        break;
      case 'C':
        if (args.length >= 6) {
          ops.push({
            type: 'curveTo',
            cp1x: args[0]!,
            cp1y: args[1]!,
            cp2x: args[2]!,
            cp2y: args[3]!,
            x: args[4]!,
            y: args[5]!,
          });
        }
        break;
      case 'Q':
        // Quadratic to cubic conversion would happen here in full implementation
        // For now, treat as line to endpoint
        if (args.length >= 4) {
          ops.push({ type: 'lineTo', x: args[2]!, y: args[3]! });
        }
        break;
      case 'A':
        // Arc approximation would happen here in full implementation
        // For now, treat as line to endpoint
        if (args.length >= 7) {
          ops.push({ type: 'lineTo', x: args[5]!, y: args[6]! });
        }
        break;
      case 'Z':
        ops.push({ type: 'closePath' });
        break;
    }
  }

  return ops;
}

/**
 * Converts an array of points to an SVG path string.
 *
 * @param points - Array of {x, y} points
 * @param closePath - Whether to close the path with Z command
 * @returns SVG path string
 */
export function pointsToSvgPath(points: Array<{ x: number; y: number }>, closePath: boolean): string {
  if (points.length === 0) {
    return '';
  }

  let path = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i]!.x} ${points[i]!.y}`;
  }

  if (closePath) {
    path += ' Z';
  }

  return path;
}

/**
 * Scales all coordinates in path commands by a factor.
 *
 * @param commands - Array of path commands
 * @param scale - Scale factor
 * @returns New array with scaled coordinates
 */
export function scalePath(commands: PathCommand[], scale: number): PathCommand[] {
  return commands.map((cmd) => {
    const type = cmd[0];
    switch (type) {
      case 'M':
      case 'L':
        return [type, cmd[1] * scale, cmd[2] * scale];
      case 'C':
        return [
          type,
          cmd[1] * scale,
          cmd[2] * scale,
          cmd[3] * scale,
          cmd[4] * scale,
          cmd[5] * scale,
          cmd[6] * scale,
        ];
      case 'Q':
        return [type, cmd[1] * scale, cmd[2] * scale, cmd[3] * scale, cmd[4] * scale];
      case 'A':
        return [
          type,
          cmd[1] * scale,
          cmd[2] * scale,
          cmd[3],
          cmd[4],
          cmd[5],
          cmd[6] * scale,
          cmd[7] * scale,
        ];
      case 'Z':
        return [type];
      default:
        return cmd;
    }
  });
}
