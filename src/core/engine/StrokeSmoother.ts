import { StrokePoint } from '../../types/ink';

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function mixPoint(a: StrokePoint, b: StrokePoint, t: number, x: number, y: number): StrokePoint {
  const lerp = (u: number, v: number) => u + (v - u) * t;
  return {
    x,
    y,
    pressure: lerp(a.pressure, b.pressure),
    tiltX: lerp(a.tiltX, b.tiltX),
    tiltY: lerp(a.tiltY, b.tiltY),
    time: lerp(a.time, b.time),
    velocity: lerp(a.velocity ?? 0, b.velocity ?? 0)
  };
}

/**
 * Muestrea el trazo con Catmull-Rom. Los puntos originales se conservan
 * para la evaluación; esto solo alimenta el render.
 */
export class StrokeSmoother {
  public static smooth(points: StrokePoint[]): StrokePoint[] {
    if (points.length < 3) return points;
    const result: StrokePoint[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const segment = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const steps = segment < 2.5 ? 1 : segment < 8 ? 2 : 4;

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const x = catmull(p0.x, p1.x, p2.x, p3.x, t);
        const y = catmull(p0.y, p1.y, p2.y, p3.y, t);
        result.push(mixPoint(p1, p2, t, x, y));
      }
    }

    result.push(points[points.length - 1]);
    return result;
  }
}
