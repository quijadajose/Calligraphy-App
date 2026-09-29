import { PALMER_ASCENDER_RATIO, PALMER_PEN_RATIO, PALMER_XHEIGHT_RATIO } from '../../core/engine/gridMetrics';
import { Point2 } from '../../types/ink';

/** Coordenadas de pauta: 0 ascendente, 1 descendente. No se reescalan. */
export const WAIST = PALMER_ASCENDER_RATIO;
export const BASE = PALMER_ASCENDER_RATIO + PALMER_XHEIGHT_RATIO;
export const ASC = 0.03;
export const DESC = 0.97;
export const XM = (WAIST + BASE) / 2;
export const XR = ((BASE - WAIST) / 2) * (1 - PALMER_PEN_RATIO);

export function pts(coords: number[]): Point2[] {
  const points: Point2[] = [];
  for (let i = 0; i < coords.length; i += 2) points.push({ x: coords[i], y: coords[i + 1] });
  return points;
}

export function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from = 0,
  to = Math.PI * 2,
  steps = 16
): Point2[] {
  const points: Point2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps;
    points.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry });
  }
  return points;
}

export function bodyOval(cx = 0.42, rx = 0.18): Point2[] {
  return ellipse(cx, XM, rx, XR);
}

export function dot(cx: number, cy: number): Point2[] {
  return ellipse(cx, cy, 0.045, 0.028, 0, Math.PI * 2, 8);
}
