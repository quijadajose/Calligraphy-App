import { Stroke } from '../../types/ink';
import { palmerRowAt } from '../engine/gridMetrics';
import { clamp } from './geometry';

export class HeightAnalyzer {
  /**
   * Letra suelta: mide si los cuerpos de letra se quedan en la x-height y si esa altura es estable.
   * Devuelve null si no hay ningún trazo de cuerpo que medir (antes daba un 60 fijo).
   * La escritura enlazada (palabras, oraciones) se mide por columnas en ScoringEngine.
   */
  public static analyze(strokes: Stroke[], canvasHeight: number): number | null {
    const ratios: number[] = [];

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      let minY = Infinity;
      let maxY = -Infinity;
      let sumY = 0;
      for (const point of stroke.points) {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
        sumY += point.y;
      }
      const row = palmerRowAt(sumY / stroke.points.length, canvasHeight);
      const height = maxY - minY;
      if (height < row.xHeight * 0.35) continue;

      const above = Math.max(0, row.waistY - minY);
      const below = Math.max(0, maxY - row.baseY);
      const isBody = above < row.xHeight * 0.45 && below < row.xHeight * 0.45;
      if (!isBody) continue;
      ratios.push(height / row.xHeight);
    }

    if (ratios.length === 0) return null;

    const mean = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
    const variance = ratios.reduce((sum, value) => sum + (value - mean) ** 2, 0) / ratios.length;
    const meanPenalty = Math.abs(mean - 1) * 110;
    const variancePenalty = Math.sqrt(variance) * 140;
    return clamp(Math.round(100 - meanPenalty - variancePenalty));
  }
}
