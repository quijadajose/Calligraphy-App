import { Stroke } from '../../types/ink';
import { scriptSlant } from '../engine/gridMetrics';
import { clamp } from './geometry';

export interface SlantResult {
  avgAngle: number;
  slantScore: number;
  /** Tramos descendentes medidos. Con 0 no hay inclinación que juzgar. */
  samples: number;
}

/**
 * Inclinación de Palmer medida solo en los trazos que bajan (palotes, óvalos al descender).
 * Los enlaces que suben hacia la letra siguiente van a otro ángulo y se ignoran.
 */
export class SlantAnalyzer {
  public static analyze(strokes: Stroke[]): SlantResult {
    const target = scriptSlant();
    let weighted = 0;
    let weightSum = 0;
    let samples = 0;

    for (const stroke of strokes) {
      const points = stroke.points;
      let i = 0;
      while (i < points.length - 1) {
        let j = i + 1;
        while (j < points.length - 1 && Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y) < 14) {
          j += 1;
        }
        const dx = points[j].x - points[i].x;
        const dy = points[j].y - points[i].y;
        const weight = Math.hypot(dx, dy);
        // dy > 0: la pluma baja (en pantalla la y crece hacia abajo).
        if (dy >= 10 && weight > 0) {
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (angle > 90) angle = 180 - angle;
          weighted += angle * weight;
          weightSum += weight;
          samples += 1;
        }
        if (j === i) break;
        i = j;
      }
    }

    if (weightSum === 0) return { avgAngle: target, slantScore: 0, samples: 0 };
    const avgAngle = weighted / weightSum;
    const diff = Math.abs(avgAngle - target);
    return {
      avgAngle: Math.round(avgAngle),
      slantScore: clamp(Math.round(100 - diff * 3.2)),
      samples
    };
  }
}
