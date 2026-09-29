import { Stroke } from '../../types/ink';
import { PALMER_SLANT_DEG } from '../engine/gridMetrics';
import { clamp } from './geometry';

export class SlantAnalyzer {
  public static analyze(strokes: Stroke[]): { avgAngle: number; slantScore: number } {
    const target = PALMER_SLANT_DEG;
    let weighted = 0;
    let weightSum = 0;

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
        if (Math.abs(dy) >= 10 && weight > 0) {
          let angle = (Math.atan2(Math.abs(dy), dx) * 180) / Math.PI;
          if (angle > 90) angle = 180 - angle;
          weighted += angle * weight;
          weightSum += weight;
        }
        if (j === i) break;
        i = j;
      }
    }

    if (weightSum === 0) return { avgAngle: target, slantScore: 70 };
    const avgAngle = weighted / weightSum;
    const diff = Math.abs(avgAngle - target);
    return {
      avgAngle: Math.round(avgAngle),
      slantScore: clamp(Math.round(100 - diff * 3.2))
    };
  }
}
