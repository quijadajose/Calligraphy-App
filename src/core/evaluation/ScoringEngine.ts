import { mapPalmerPoint, palmerRowGeometry } from '../engine/gridMetrics';
import { EvaluationResult, Lesson, Point2, Stroke } from '../../types/ink';
import { HeightAnalyzer } from './HeightAnalyzer';
import { SlantAnalyzer } from './SlantAnalyzer';
import { clamp, normalizeStrokes, shapeScore } from './geometry';

export class ScoringEngine {
  public static scorePalmer(strokes: Stroke[], lesson: Lesson, canvasHeight: number): EvaluationResult {
    const { avgAngle, slantScore } = SlantAnalyzer.analyze(strokes);
    const heightScore = HeightAnalyzer.analyze(strokes, canvasHeight);
    const shape = this.scoreIdeal(strokes, lesson, canvasHeight);
    const hasShape = shape !== null;

    const accuracy = hasShape
      ? Math.round(slantScore * 0.4 + heightScore * 0.35 + shape * 0.25)
      : Math.round(slantScore * 0.55 + heightScore * 0.45);

    const details = [
      `Inclinación media ${avgAngle}° (objetivo 52°).`,
      `Altura de la x: ${heightScore}/100.`
    ];
    if (hasShape) details.push(`Parecido con la curva maestra: ${shape}/100.`);

    let feedback: string;
    if (accuracy >= 85) feedback = `Inclinación y altura muy estables, cerca del Palmer de 52°.`;
    else if (accuracy >= 65) feedback = `Buen ritmo (${avgAngle}°). Iguala la altura de las letras chicas con la línea de la x.`;
    else feedback = `Inclinación ${avgAngle}°. Apóyate en las líneas naranjas y no dejes que la x cambie de tamaño.`;

    return {
      score: accuracy,
      accuracy,
      slantScore,
      heightScore,
      shapeScore: shape ?? undefined,
      feedback,
      details
    };
  }

  public static applyDictation(base: EvaluationResult, timedOut: boolean, wpm: number): EvaluationResult {
    let score = base.score;
    const details = [...(base.details ?? [])];
    if ((base.accuracy ?? score) < 60) {
      score = Math.max(0, score - 10);
      details.push('Penalización por trazos desviados o poco legibles.');
    }
    if (timedOut) {
      score = Math.round(score * 0.75);
      details.push('Tiempo agotado: la nota baja un 25 %.');
    }
    details.push(`Velocidad: ${wpm} palabras por minuto.`);
    return {
      ...base,
      score: clamp(score),
      wpm,
      details,
      feedback: `${base.feedback} Ritmo de dictado: ${wpm} ppm.`
    };
  }

  /** La curva modelo se inclina igual que el fantasma antes de comparar la forma. */
  private static idealInPixels(lesson: Lesson, canvasHeight: number): Point2[][] {
    const raw = lesson.idealStrokes?.map((stroke) => stroke.points) ?? [];
    if (lesson.suggestedGrid !== 'palmer') return raw;
    const row = palmerRowGeometry(0, canvasHeight);
    return raw.map((stroke) => stroke.map((point) => mapPalmerPoint(point, 0, row)));
  }

  private static scoreIdeal(strokes: Stroke[], lesson: Lesson, canvasHeight: number): number | null {
    if (!lesson.idealStrokes?.length) return null;
    const user = normalizeStrokes(strokes.map((stroke) => stroke.points.map((point) => ({ x: point.x, y: point.y }))));
    const ideal = this.idealInPixels(lesson, canvasHeight);
    if (user.length === 0) return 0;

    if (lesson.idealMode === 'repeat') {
      const template = ideal[0];
      const scores = user.map((stroke) => shapeScore(stroke, template));
      return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    }

    const compared = Math.min(user.length, ideal.length);
    let total = 0;
    for (let i = 0; i < compared; i++) total += shapeScore(user[i], ideal[i]);
    const average = total / compared;
    const penalty = Math.abs(user.length - ideal.length) * 12;
    return clamp(Math.round(average - penalty));
  }
}
