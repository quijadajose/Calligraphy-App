import { CharGeometry, EvaluationResult, Lesson, Stroke } from '../../types/ink';
import { KanjiOrderValidator, lastBox } from './KanjiOrderValidator';
import { ScoringEngine } from './ScoringEngine';

export interface SessionInput {
  strokes: Stroke[];
  lesson: Lesson;
  width: number;
  height: number;
  /** Japonés: la geometría de cada signo del texto, en orden. */
  glyphs: Array<CharGeometry | null>;
}

export class StrokeEvaluator {
  public static evaluateSession(input: SessionInput): EvaluationResult {
    const { strokes, lesson, width, height, glyphs } = input;
    if (strokes.length === 0) {
      return {
        score: 0,
        accuracy: 0,
        feedback: 'No hay trazos en el lienzo aún.',
        details: []
      };
    }

    if (lesson.category === 'palmer') {
      return ScoringEngine.scorePalmer(strokes, lesson, height, width);
    }

    if (glyphs.some((glyph) => glyph !== null)) {
      const result = KanjiOrderValidator.assessCopies(strokes, glyphs, width, height);
      return {
        score: result.accuracy,
        accuracy: result.accuracy,
        orderScore: result.orderScore,
        directionScore: result.directionScore,
        shapeScore: result.shapeScore,
        endingScore: result.endingScore,
        feedback: result.feedback,
        details: result.details,
        badStrokes: result.bad
      };
    }

    // Sin datos de trazo (sin red y sin copia local) solo se puede contar tinta: nunca aprueba.
    const expected = Math.max(1, lesson.strokesExpected ?? Array.from(lesson.characterOrWord).length * 2);
    const ratio = strokes.length / expected;
    const coverage = Math.min(60, Math.round(100 - Math.min(1, Math.abs(ratio - 1)) * 70));
    return {
      score: coverage,
      accuracy: coverage,
      feedback: 'No hay datos de trazo para comparar: solo se contó la tinta. Conéctate una vez para descargar el carácter.',
      details: [`Trazos escritos: ${strokes.length}. Referencia aproximada: ${expected}.`]
    };
  }

  /** Mensaje en vivo del cuadro donde cayó el último trazo. */
  public static liveKanjiMessage(
    strokes: Stroke[],
    glyphs: Array<CharGeometry | null>,
    width: number,
    height: number
  ): string {
    if (strokes.length === 0) return 'El primer trazo marca el orden.';
    const current = lastBox(strokes, width, height);
    if (!current) return 'Escribe dentro de un cuadro.';
    const geometry = glyphs[current.box % Math.max(1, glyphs.length)] ?? null;
    return KanjiOrderValidator.assess(current.strokes, geometry, width, height).liveMessage;
  }
}
