import { CharGeometry, Point2, Stroke } from '../../types/ink';
import { dominantBox, genkouyoushiLayout } from '../engine/gridMetrics';
import {
  classifyEnding,
  directionScore,
  endingScore,
  normalizeStrokes,
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

export class KanjiOrderValidator {
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
        liveMessage: 'Sin datos de trazo.'
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

    for (let i = 0; i < compared; i++) {
      const direction = directionScore(user[i], ideal[i]);
      const shape = shapeScore(user[i], ideal[i]);
      const ending = endingScore(user[i], ideal[i]);
      directionParts.push(direction);
      shapeParts.push(shape);
      endingParts.push(ending.score);
      if (direction < 45) details.push(`Trazo ${i + 1}: la dirección va al revés.`);
      else if (shape < 55) details.push(`Trazo ${i + 1}: la forma se aleja del modelo.`);
      if (ending.user !== ending.ideal) {
        details.push(`Trazo ${i + 1}: remate ${ending.user}, el modelo pide ${ending.ideal}.`);
      }
    }

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
      const direction = directionScore(user[last], ideal[last]);
      liveMessage += direction >= 60
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
      liveMessage
    };
  }
}
