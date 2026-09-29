import { Point2 } from '../../types/ink';

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: Point2, start: Point2, end: Point2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const span = dx * dx + dy * dy;
  if (span === 0) return distance(point, start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / span));
  return distance(point, { x: start.x + dx * t, y: start.y + dy * t });
}

export function distanceToPolyline(point: Point2, stroke: Point2[]): number {
  if (stroke.length === 0) return Infinity;
  let best = distance(point, stroke[0]);
  for (let i = 1; i < stroke.length; i++) best = Math.min(best, distanceToSegment(point, stroke[i - 1], stroke[i]));
  return best;
}

/** Posición del punto sobre el modelo, de 0 al inicio a 1 al final. */
function parameterAlong(point: Point2, stroke: Point2[]): number {
  const total = polylineLength(stroke);
  if (total === 0) return 0;
  let best = Infinity;
  let along = 0;
  let traveled = 0;
  for (let i = 1; i < stroke.length; i++) {
    const start = stroke[i - 1];
    const end = stroke[i];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const span = dx * dx + dy * dy;
    const t = span === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / span));
    const dist = distance(point, { x: start.x + dx * t, y: start.y + dy * t });
    if (dist < best) {
      best = dist;
      along = traveled + Math.hypot(dx, dy) * t;
    }
    traveled += Math.hypot(dx, dy);
  }
  return along / total;
}

function pathIsClosed(points: Point2[]): boolean {
  const length = polylineLength(points);
  if (length < 8 || points.length < 4) return false;
  return distance(points[0], points[points.length - 1]) <= Math.max(18, length * 0.12);
}

/** forward si el lápiz sigue la flecha; reverse si recorre el modelo al revés. */
export function guideDirection(user: Point2[], target: Point2[]): 'forward' | 'reverse' | 'unknown' {
  if (user.length < 2 || target.length < 2) return 'unknown';
  const samples = resample(user, 16);
  const closed = pathIsClosed(target);
  let forward = 0;
  let backward = 0;
  let previous = parameterAlong(samples[0], target);
  for (let i = 1; i < samples.length; i++) {
    const next = parameterAlong(samples[i], target);
    let delta = next - previous;
    previous = next;
    if (closed) {
      if (delta > 0.5) delta -= 1;
      if (delta < -0.5) delta += 1;
    }
    if (delta > 0.012) forward += delta;
    else if (delta < -0.012) backward -= delta;
  }
  const total = forward + backward;
  if (total < 0.08) return 'unknown';
  const ratio = forward / total;
  if (ratio >= 0.62) return 'forward';
  if (ratio <= 0.38) return 'reverse';
  return 'unknown';
}

/** El trazo del usuario recorre el modelo. En un óvalo cerrado puede empezar en otro punto. */
export function strokeCoversGuide(user: Point2[], target: Point2[], tolerance: number): boolean {
  if (user.length < 2 || target.length < 2) return false;
  const userLength = polylineLength(user);
  const targetLength = polylineLength(target);
  if (targetLength < 8 || userLength < Math.max(24, targetLength * 0.42)) return false;
  const samples = resample(target, 18);
  let close = 0;
  for (const point of samples) {
    if (distanceToPolyline(point, user) <= tolerance) close += 1;
  }
  return close / samples.length >= 0.7;
}

export function polylineLength(points: Point2[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i]);
  return length;
}

export function resample(points: Point2[], count: number): Point2[] {
  if (points.length === 0) return [];
  if (points.length === 1 || count <= 1) return Array.from({ length: Math.max(1, count) }, () => ({ ...points[0] }));

  const total = polylineLength(points);
  if (total === 0) return Array.from({ length: count }, () => ({ ...points[0] }));

  const result: Point2[] = [];
  let cursor = 0;
  let traveled = 0;

  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    while (cursor < points.length - 1 && traveled + distance(points[cursor], points[cursor + 1]) < target) {
      traveled += distance(points[cursor], points[cursor + 1]);
      cursor += 1;
    }
    const a = points[cursor];
    const b = points[Math.min(points.length - 1, cursor + 1)];
    const span = distance(a, b) || 1;
    const t = clamp((target - traveled) / span, 0, 1);
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}

export function discreteFrechet(a: Point2[], b: Point2[]): number {
  if (a.length === 0 || b.length === 0) return 1;
  const memo: Array<Array<number | undefined>> = Array.from({ length: a.length }, () => Array(b.length));

  const coupling = (i: number, j: number): number => {
    const cached = memo[i][j];
    if (cached !== undefined) return cached;
    const step = distance(a[i], b[j]);
    let value: number;
    if (i === 0 && j === 0) value = step;
    else if (i > 0 && j === 0) value = Math.max(coupling(i - 1, 0), step);
    else if (i === 0 && j > 0) value = Math.max(coupling(0, j - 1), step);
    else {
      value = Math.max(
        Math.min(coupling(i - 1, j), coupling(i - 1, j - 1), coupling(i, j - 1)),
        step
      );
    }
    memo[i][j] = value;
    return value;
  };

  return coupling(a.length - 1, b.length - 1);
}

export function dtw(a: Point2[], b: Point2[]): number {
  if (a.length === 0 || b.length === 0) return 1;
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = distance(a[i - 1], b[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[n][m] / (n + m);
}

export function similarityScore(distanceValue: number): number {
  return clamp(Math.round(100 * Math.exp(-12 * distanceValue)));
}

export function shapeScore(user: Point2[], ideal: Point2[]): number {
  const a = resample(user, 24);
  const b = resample(ideal, 24);
  const frechet = similarityScore(discreteFrechet(a, b));
  const warped = similarityScore(dtw(a, b) * 1.6);
  return Math.round((frechet + warped) / 2);
}

export function normalizeStrokes(strokes: Point2[][]): Point2[][] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) return [];
  const size = Math.max(0.001, maxX - minX, maxY - minY);
  return strokes.map((stroke) =>
    stroke.map((point) => ({
      x: (point.x - minX) / size,
      y: (point.y - minY) / size
    }))
  );
}

export function directionVector(points: Point2[]): Point2 {
  if (points.length < 2) return { x: 0, y: 0 };
  const start = points[0];
  const end = points[points.length - 1];
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  return { x: (end.x - start.x) / length, y: (end.y - start.y) / length };
}

export function directionScore(user: Point2[], ideal: Point2[]): number {
  const a = directionVector(user);
  const b = directionVector(ideal);
  const cosine = a.x * b.x + a.y * b.y;
  return clamp(Math.round(((cosine + 1) / 2) * 100));
}

function pointAtArc(points: Point2[], ratio: number): number {
  const total = polylineLength(points);
  if (total === 0) return 0;
  const target = total * ratio;
  let traveled = 0;
  for (let i = 1; i < points.length; i++) {
    const step = distance(points[i - 1], points[i]);
    if (traveled + step >= target) return i - 1;
    traveled += step;
  }
  return Math.max(0, points.length - 2);
}

export type StrokeEnding = 'tome' | 'hane' | 'harai';

export function classifyEnding(points: Point2[]): StrokeEnding {
  if (points.length < 4) return 'tome';
  const total = polylineLength(points);
  if (total === 0) return 'tome';

  const bodyStart = pointAtArc(points, 0.35);
  const bodyEnd = pointAtArc(points, 0.72);
  const tailStart = pointAtArc(points, 0.78);
  const body = points.slice(bodyStart, Math.max(bodyStart + 2, bodyEnd + 1));
  const tail = points.slice(tailStart);
  const bodyDir = directionVector(body);
  const tailDir = directionVector(tail);
  const cosine = bodyDir.x * tailDir.x + bodyDir.y * tailDir.y;
  const angle = (Math.acos(clamp(cosine, -1, 1)) * 180) / Math.PI;
  const tailLength = polylineLength(tail);

  if (angle > 42 && tailLength < total * 0.34 && tailDir.y < -0.15) return 'hane';
  if (angle < 28 && tailLength > total * 0.24 && tailLength > total * 0.18) return 'harai';
  return 'tome';
}

export function endingScore(user: Point2[], ideal: Point2[]): { score: number; user: StrokeEnding; ideal: StrokeEnding } {
  const userEnding = classifyEnding(user);
  const idealEnding = classifyEnding(ideal);
  return {
    score: userEnding === idealEnding ? 100 : 35,
    user: userEnding,
    ideal: idealEnding
  };
}
