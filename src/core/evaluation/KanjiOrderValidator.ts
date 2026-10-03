import { CharGeometry, Point2, Stroke } from '../../types/ink';
import { boxIndexFor, dominantBox, genkouyoushiLayout } from '../engine/gridMetrics';
import {
  classifyEnding,
  directionScore,
  distanceToPolyline,
  endingScore,
  normalizeStrokes,
  polylineLength,
  resample,
  shapeScore
} from './geometry';

export interface KanjiAssessment {
  orderScore: number;
  directionScore: number;
  shapeScore: number;
  endingScore: number;
  accuracy: number;
  feedback: string;
  details: string[];
  liveMessage: string;
  /** Índices (dentro de los trazos evaluados) que fallaron. */
  bad: number[];
}

export interface CopiesAssessment extends KanjiAssessment {
  copies: number;
}

function userUnits(strokes: Stroke[], width: number, height: number): Point2[][] {
  const points = strokes.flatMap((stroke) => stroke.points);
  const layout = genkouyoushiLayout(width, height);
  const box = dominantBox(points, layout);
  if (box) {
    return strokes.map((stroke) =>
      stroke.points.map((point) => ({
        x: (point.x - box.x) / box.size,
        y: (point.y - box.y) / box.size
      }))
    );
  }
  return normalizeStrokes(strokes.map((stroke) => stroke.points.map((point) => ({ x: point.x, y: point.y }))));
}

function strokeInBox(stroke: Stroke, width: number, height: number): Point2[] | null {
  const layout = genkouyoushiLayout(width, height);
  const box = dominantBox(stroke.points, layout);
  if (!box || stroke.points.length < 2) return null;
  return stroke.points.map((point) => ({
    x: (point.x - box.x) / box.size,
    y: (point.y - box.y) / box.size
  }));
}

/** Trazos agrupados por cuadro, en el orden de los cuadros. Cada copia se califica aparte. */
export function groupByBox(strokes: Stroke[], width: number, height: number): Array<{ box: number; indices: number[] }> {
  const layout = genkouyoushiLayout(width, height);
  const groups = new Map<number, number[]>();
  strokes.forEach((stroke, index) => {
    const box = boxIndexFor(stroke.points, layout);
    if (box < 0) return;
    const list = groups.get(box) ?? [];
    list.push(index);
    groups.set(box, list);
  });
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([box, indices]) => ({ box, indices }));
}

/** Cuadro donde cayó el último trazo y los trazos que ya hay en él. */
export function lastBox(strokes: Stroke[], width: number, height: number): { box: number; strokes: Stroke[] } | null {
  if (strokes.length === 0) return null;
  const layout = genkouyoushiLayout(width, height);
  const box = boxIndexFor(strokes[strokes.length - 1].points, layout);
  if (box < 0) return null;
  return { box, strokes: strokes.filter((stroke) => boxIndexFor(stroke.points, layout) === box) };
}

/** El último trazo no llega a recorrer el modelo: se puede descartar y repetir. */
export function lastStrokeIsIncomplete(
  strokes: Stroke[],
  geometry: CharGeometry | null,
  width: number,
  height: number
): boolean {
  if (!geometry || strokes.length === 0) return false;
  const index = strokes.length - 1;
  const ideal = geometry.strokes[index];
  if (!ideal || ideal.length < 2) return false;
  const drawn = strokeInBox(strokes[index], width, height);
  if (!drawn) return true;
  const idealLength = polylineLength(ideal);
  const drawnLength = polylineLength(drawn);
  if (idealLength < 0.02) return drawnLength < 0.012;
  if (drawnLength / idealLength < 0.58) return true;
  const samples = resample(ideal, 14);
  let close = 0;
  for (const point of samples) {
    if (distanceToPolyline(point, drawn) <= 0.12) close += 1;
  }
  return close / samples.length < 0.5;
}

export class KanjiOrderValidator {
  /** Un solo carácter escrito en un cuadro. */
  public static assess(
    strokes: Stroke[],
    geometry: CharGeometry | null,
    width: number,
    height: number
  ): KanjiAssessment {
    if (!geometry) {
      return {
        orderScore: 0,
        directionScore: 0,
        shapeScore: 0,
        endingScore: 0,
        accuracy: 0,
        feedback: 'No se pudieron cargar los trazos de referencia. Revisa la conexión y vuelve a abrir el carácter.',
        details: [],
        liveMessage: 'Sin datos de trazo.',
        bad: []
      };
    }

    const user = userUnits(strokes, width, height);
    const ideal = geometry.strokes;
    const expected = ideal.length;
    const countGap = Math.abs(user.length - expected);
    const orderScore = Math.max(0, 100 - countGap * 22);

    const compared = Math.min(user.length, expected);
    const directionParts: number[] = [];
    const shapeParts: number[] = [];
    const endingParts: number[] = [];
    const details: string[] = [];
    const bad: number[] = [];

    for (let i = 0; i < compared; i++) {
      const direction = directionScore(user[i], ideal[i]);
      const shape = shapeScore(user[i], ideal[i]);
      const ending = endingScore(user[i], ideal[i]);
      directionParts.push(direction);
      shapeParts.push(shape);
      endingParts.push(ending.score);
      if (direction < 45) {
        details.push(`Trazo ${i + 1}: la dirección va al revés.`);
        bad.push(i);
      } else if (shape < 55) {
        details.push(`Trazo ${i + 1}: la forma se aleja del modelo.`);
        bad.push(i);
      }
      if (ending.user !== ending.ideal) {
        details.push(`Trazo ${i + 1}: remate ${ending.user}, el modelo pide ${ending.ideal}.`);
      }
    }
    for (let i = expected; i < user.length; i++) bad.push(i);

    if (user.length > expected) details.push(`Sobran ${user.length - expected} trazo(s).`);
    if (user.length < expected) details.push(`Faltan ${expected - user.length} trazo(s).`);

    const avg = (values: number[], fallback: number) =>
      values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : fallback;

    const direction = avg(directionParts, 0);
    const shape = avg(shapeParts, 0);
    const ending = avg(endingParts, 0);
    const accuracy = Math.round(orderScore * 0.34 + direction * 0.22 + shape * 0.28 + ending * 0.16);

    let startedWrong = false;
    if (user.length > 0 && expected > 1) {
      let best = 0;
      let bestShape = -1;
      for (let i = 0; i < expected; i++) {
        const score = shapeScore(user[0], ideal[i]);
        if (score > bestShape) {
          bestShape = score;
          best = i;
        }
      }
      startedWrong = best !== 0 && bestShape > shapeScore(user[0], ideal[0]) + 12;
      if (startedWrong) details.unshift('El primer trazo no es el que abre el carácter.');
    }

    const feedback = startedWrong
      ? 'Revisa el orden: el carácter no empieza por ese trazo.'
      : accuracy >= 85
        ? 'Orden, dirección y remates muy cerca del modelo.'
        : accuracy >= 65
          ? 'La estructura se reconoce. Ajusta dirección y el remate final de cada trazo.'
          : 'El trazo se desvía del modelo. Sigue el fantasma y no adelantes trazos.';

    const last = user.length - 1;
    let liveMessage = `Trazo ${user.length} de ${expected}.`;
    if (last >= 0 && last < expected) {
      const endingName = classifyEnding(user[last]);
      const lastDirection = directionScore(user[last], ideal[last]);
      liveMessage += lastDirection >= 60
        ? ` Dirección correcta. Remate: ${endingName}.`
        : ' Ese trazo va en otra dirección.';
    } else if (user.length > expected) {
      liveMessage = `Hay trazos de más (${user.length}/${expected}).`;
    }

    return {
      orderScore: startedWrong ? Math.max(0, orderScore - 20) : orderScore,
      directionScore: direction,
      shapeScore: shape,
      endingScore: ending,
      accuracy: startedWrong ? Math.max(0, accuracy - 12) : accuracy,
      feedback,
      details,
      liveMessage,
      bad
    };
  }

  /**
   * Varias copias en varios cuadros. Cada cuadro se califica contra el signo que le toca
   * (el carácter de la lección, o el signo correspondiente de la palabra) y la nota es la media.
   */
  public static assessCopies(
    strokes: Stroke[],
    glyphs: Array<CharGeometry | null>,
    width: number,
    height: number
  ): CopiesAssessment {
    const groups = groupByBox(strokes, width, height);
    if (groups.length === 0 || glyphs.length === 0) {
      return { ...this.assess(strokes, glyphs[0] ?? null, width, height), copies: 0 };
    }
    const results = groups.map((group) => {
      // Los cuadros van en orden de lectura: el cuadro k lleva el signo k de la palabra.
      const geometry = glyphs[group.box % glyphs.length];
      const result = this.assess(group.indices.map((i) => strokes[i]), geometry, width, height);
      return { group, result, char: geometry?.char ?? '?' };
    });
    const mean = (pick: (r: KanjiAssessment) => number) =>
      Math.round(results.reduce((sum, entry) => sum + pick(entry.result), 0) / results.length);
    const accuracy = mean((r) => r.accuracy);
    const worst = results.reduce((a, b) => (b.result.accuracy < a.result.accuracy ? b : a));
    const details = [
      ...results.slice(0, 8).map((entry, index) => `Copia ${index + 1} (${entry.char}): ${entry.result.accuracy}/100.`),
      ...(results.length > 8 ? [`… y ${results.length - 8} copias más.`] : []),
      ...(worst.result.details.length ? [`En la copia más floja: ${worst.result.details.slice(0, 3).join(' ')}`] : [])
    ];
    const bad = results.flatMap((entry) => entry.result.bad.map((local) => entry.group.indices[local]));
    const feedback = results.length === 1
      ? worst.result.feedback
      : accuracy >= 85
        ? `${results.length} copias muy parejas: orden, dirección y remates cerca del modelo.`
        : accuracy >= 65
          ? `${results.length} copias. La estructura se reconoce; la más floja tiene ${worst.result.accuracy}.`
          : `${results.length} copias. Vuelve a mirar el orden de trazos antes de seguir copiando.`;
    return {
      orderScore: mean((r) => r.orderScore),
      directionScore: mean((r) => r.directionScore),
      shapeScore: mean((r) => r.shapeScore),
      endingScore: mean((r) => r.endingScore),
      accuracy,
      feedback,
      details,
      liveMessage: results[results.length - 1].result.liveMessage,
      bad,
      copies: results.length
    };
  }
}
