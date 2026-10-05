import { scriptSlant, mapPalmerPoint, palmerRowGeometry, sentenceFrame, sentenceRowGeometry, sentenceRowIndexAt } from '../engine/gridMetrics';
import { sheetGuideProfile } from '../engine/SheetGuide';
import { EvaluationResult, Lesson, Point2, Stroke } from '../../types/ink';
import { HeightAnalyzer } from './HeightAnalyzer';
import { SlantAnalyzer } from './SlantAnalyzer';
import { clamp, normalizeStrokes, shapeScore } from './geometry';
import { ColumnProfile, bodyHeightScore, compareProfiles, profileFromStrokes } from './profile';

interface Part {
  score: number;
  weight: number;
}

/** Media ponderada de las partes que sí se pudieron medir. */
function blend(parts: Array<Part | null>): number | null {
  const valid = parts.filter((part): part is Part => part !== null);
  const weight = valid.reduce((sum, part) => sum + part.weight, 0);
  if (weight === 0) return null;
  return Math.round(valid.reduce((sum, part) => sum + part.score * part.weight, 0) / weight);
}

export interface SheetOptions {
  /** Silueta del modelo ya calculada (los tests la pasan; en la app sale de la fuente). */
  guide?: ColumnProfile | null;
}

export class ScoringEngine {
  public static scorePalmer(strokes: Stroke[], lesson: Lesson, canvasHeight: number, canvasWidth = 1000, options: SheetOptions = {}): EvaluationResult {
    if (lesson.sheet) return this.scoreSheet(strokes, lesson, canvasWidth, canvasHeight, options);

    const slant = SlantAnalyzer.analyze(strokes);
    const heightScore = HeightAnalyzer.analyze(strokes, canvasHeight);
    const shape = this.scoreIdeal(strokes, lesson, canvasHeight);

    const blended = blend([
      slant.samples > 0 ? { score: slant.slantScore, weight: 0.4 } : null,
      heightScore != null ? { score: heightScore, weight: 0.35 } : null,
      shape ? { score: shape.score, weight: shape.score < 40 ? 0.6 : 0.25 } : null
    ]);
    // Sin forma con la que comparar ni nada medible no hay nota que dar.
    let accuracy = blended ?? 0;
    if (shape && shape.score < 40) accuracy = Math.min(accuracy, shape.score + 15);

    const details: string[] = [];
    const upright = scriptSlant() >= 89.9;
    if (slant.samples > 0) details.push(`Inclinación media ${slant.avgAngle}° (objetivo ${upright ? 'vertical, 90°' : `${scriptSlant()}°`}).`);
    else details.push('No hay trazos descendentes para medir la inclinación.');
    details.push(heightScore != null ? `Altura de la x: ${heightScore}/100.` : 'Ningún trazo cabe en la altura de la x.');
    if (shape) details.push(`Parecido con la curva maestra: ${shape.score}/100.`);

    let feedback: string;
    if (accuracy >= 85) feedback = upright ? 'Trazos rectos y altura muy estable: buena letra de imprenta.' : `Inclinación y altura muy estables, cerca de los ${scriptSlant()}° del estilo.`;
    else if (accuracy >= 65) feedback = `Buen ritmo (${slant.avgAngle}°). Iguala la altura de las letras chicas con la línea de la x.`;
    else feedback = upright
      ? `Inclinación ${slant.avgAngle}°. Baja los palotes rectos, sin inclinar, y respeta la línea media y la base.`
      : `Inclinación ${slant.avgAngle}°. Apóyate en las líneas naranjas y no dejes que la x cambie de tamaño.`;

    return {
      score: accuracy,
      accuracy,
      slantScore: slant.samples > 0 ? slant.slantScore : undefined,
      heightScore: heightScore ?? undefined,
      shapeScore: shape?.score,
      feedback,
      details,
      badStrokes: shape?.bad ?? []
    };
  }

  /**
   * Palabras, oraciones, planas y dictado: se compara la silueta de cada línea escrita
   * con la del texto modelo. Sin texto reconocible la nota no aprueba, por muy
   * inclinados que estén los trazos.
   */
  public static scoreSheet(strokes: Stroke[], lesson: Lesson, width: number, height: number, options: SheetOptions = {}): EvaluationResult {
    const { rows } = sentenceFrame(height);
    const text = lesson.characterOrWord;
    const guide = options.guide !== undefined ? options.guide : sheetGuideProfile(text, width, height);
    const byRow: number[][] = Array.from({ length: rows }, () => []);
    strokes.forEach((stroke, index) => {
      if (stroke.points.length === 0) return;
      const meanY = stroke.points.reduce((sum, point) => sum + point.y, 0) / stroke.points.length;
      byRow[sentenceRowIndexAt(meanY, height)].push(index);
    });

    const profiles: ColumnProfile[] = [];
    const rowScores: Array<{ row: number; score: number; widthRatio: number }> = [];
    byRow.forEach((indices, row) => {
      if (indices.length === 0) return;
      const geometry = sentenceRowGeometry(row, height);
      const points = indices.map((i) => strokes[i].points.map((p) => ({ x: p.x, y: p.y })));
      const profile = profileFromStrokes(points, geometry.baseY, geometry.xHeight, width);
      profiles.push(profile);
      if (!guide) return;
      // La primera línea se calca: se compara columna a columna. Las demás, ajustadas al ancho.
      const traced = row === 0 && !lesson.dictation;
      const match = compareProfiles(profile, guide, !traced);
      rowScores.push({ row, score: match.score, widthRatio: match.widthRatio });
    });

    const inkedRows = byRow.filter((indices) => indices.length > 0).length;
    const details: string[] = [];
    let shape: number | null = null;
    if (guide && rowScores.length > 0) {
      if (lesson.dictation) {
        shape = Math.max(...rowScores.map((entry) => entry.score));
      } else {
        const mean = rowScores.reduce((sum, entry) => sum + entry.score, 0) / rowScores.length;
        // Las líneas que quedaron en blanco también cuentan: la plana pide llenarlas.
        shape = Math.round(mean * (0.55 + 0.45 * Math.min(1, inkedRows / rows)));
      }
      for (const entry of rowScores) {
        const label = entry.row === 0 && !lesson.dictation ? 'Línea con guía' : `Línea ${entry.row + 1}`;
        const stretch = entry.widthRatio > 1.5 ? ' (muy ancha)' : entry.widthRatio > 0 && entry.widthRatio < 0.65 ? ' (incompleta o apretada)' : '';
        details.push(`${label}: parecido con el texto ${entry.score}/100${stretch}.`);
      }
      if (!lesson.dictation && inkedRows < rows) details.push(`Quedan ${rows - inkedRows} línea(s) en blanco.`);
    } else if (!guide) {
      details.push('La fuente del modelo aún no cargó: la forma del texto no se pudo comparar.');
    }

    const heightScore = bodyHeightScore(profiles);
    const slant = SlantAnalyzer.analyze(strokes);
    const blended = blend([
      shape != null ? { score: shape, weight: 0.55 } : null,
      heightScore != null ? { score: heightScore, weight: 0.2 } : null,
      slant.samples > 0 ? { score: slant.slantScore, weight: 0.25 } : null
    ]);
    let accuracy = blended ?? 0;
    if (shape != null) accuracy = Math.min(accuracy, shape + 15);
    else accuracy = Math.min(accuracy, 60);
    accuracy = clamp(Math.round(accuracy));

    details.push(heightScore != null ? `Altura de la x en lo escrito: ${heightScore}/100.` : 'No se pudo medir la altura de la x.');
    if (slant.samples > 0) details.push(`Inclinación de los trazos que bajan: ${slant.avgAngle}° (objetivo ${scriptSlant()}°).`);

    const weakRows = new Set(rowScores.filter((entry) => entry.score < 50).map((entry) => entry.row));
    const badStrokes = byRow.flatMap((indices, row) => (weakRows.has(row) ? indices : []));

    let feedback: string;
    if (shape != null && shape < 45) feedback = 'Lo escrito no se parece al texto modelo. Escribe la misma frase, letra por letra.';
    else if (accuracy >= 85) feedback = 'El texto se reconoce bien y la x se mantiene a la misma altura.';
    else if (accuracy >= 65) feedback = 'El texto se reconoce. Cuida que las letras chicas coronen en la línea media.';
    else feedback = 'Repasa la línea con guía antes de escribir las demás sin ella.';

    return {
      score: accuracy,
      accuracy,
      shapeScore: shape ?? undefined,
      heightScore: heightScore ?? undefined,
      slantScore: slant.samples > 0 ? slant.slantScore : undefined,
      feedback,
      details,
      badStrokes
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

  private static scoreIdeal(strokes: Stroke[], lesson: Lesson, canvasHeight: number): { score: number; bad: number[] } | null {
    if (!lesson.idealStrokes?.length) return null;
    const user = normalizeStrokes(strokes.map((stroke) => stroke.points.map((point) => ({ x: point.x, y: point.y }))));
    const ideal = normalizeStrokes(this.idealInPixels(lesson, canvasHeight));
    if (user.length === 0) return { score: 0, bad: [] };

    if (lesson.idealMode === 'repeat') {
      const template = normalizeStrokes([ideal[0]])[0];
      const scores = user.map((stroke) => shapeScore(normalizeStrokes([stroke])[0], template));
      return {
        score: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
        bad: scores.flatMap((value, index) => (value < 50 ? [index] : []))
      };
    }

    const compared = Math.min(user.length, ideal.length);
    let total = 0;
    const bad: number[] = [];
    for (let i = 0; i < compared; i++) {
      const value = shapeScore(user[i], ideal[i]);
      total += value;
      if (value < 50) bad.push(i);
    }
    for (let i = compared; i < user.length; i++) bad.push(i);
    const average = total / compared;
    const penalty = Math.abs(user.length - ideal.length) * 12;
    return { score: clamp(Math.round(average - penalty)), bad };
  }
}
