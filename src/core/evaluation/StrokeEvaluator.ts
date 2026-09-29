import { CharGeometry, EvaluationResult, Lesson, Stroke } from '../../types/ink';
import { KanjiOrderValidator } from './KanjiOrderValidator';
import { ScoringEngine } from './ScoringEngine';

export interface SessionInput {
  strokes: Stroke[];
  lesson: Lesson;
  width: number;
  height: number;
  charGeometry: CharGeometry | null;
}

export class StrokeEvaluator {
  public static evaluateSession(input: SessionInput): EvaluationResult {
    const { strokes, lesson, width, height, charGeometry } = input;
    if (strokes.length === 0) {
      return {
        score: 0,
        accuracy: 0,
        feedback: 'No hay trazos en el lienzo aún.',
        details: []
      };
    }

    if (lesson.category === 'palmer') {
      return ScoringEngine.scorePalmer(strokes, lesson, height);
    }

    if (lesson.characterOrWord.length === 1 && charGeometry) {
      const kanji = KanjiOrderValidator.assess(strokes, charGeometry, width, height);
      return {
        score: kanji.accuracy,
        accuracy: kanji.accuracy,
        orderScore: kanji.orderScore,
        directionScore: kanji.directionScore,
        shapeScore: kanji.shapeScore,
        endingScore: kanji.endingScore,
        feedback: kanji.feedback,
        details: kanji.details
      };
    }

    const expected = Math.max(1, lesson.strokesExpected ?? lesson.characterOrWord.length * 2);
    const ratio = strokes.length / expected;
    const coverage = Math.round(100 - Math.min(1, Math.abs(ratio - 1)) * 70);
    return {
      score: coverage,
      accuracy: coverage,
      feedback: 'Dictado de varias sílabas: se valora que haya tinta suficiente y un trazo continuo, no el orden de un solo carácter.',
      details: [`Trazos escritos: ${strokes.length}. Referencia aproximada: ${expected}.`]
    };
  }

  public static liveKanjiMessage(
    strokes: Stroke[],
    geometry: CharGeometry | null,
    width: number,
    height: number
  ): string {
    if (strokes.length === 0) return 'El primer trazo marca el orden.';
    return KanjiOrderValidator.assess(strokes, geometry, width, height).liveMessage;
  }
}
