import { Point2 } from '../../types/ink';

const TOKEN = /[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

function sampleCubic(
  points: Point2[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number
): void {
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    points.push({
      x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
      y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y
    });
  }
}

/** Muestrea el atributo d de un trazo SVG (M, L, C, Q, S y relativos). */
export function sampleSvgPath(d: string): Point2[] {
  const tokens = d.match(TOKEN) ?? [];
  const points: Point2[] = [];
  let index = 0;
  let command = '';
  let cx = 0;
  let cy = 0;
  let prevCtrlX = 0;
  let prevCtrlY = 0;
  let startX = 0;
  let startY = 0;

  const read = () => Number(tokens[index++]);
  const isCommand = (token: string | undefined) => !!token && /[a-zA-Z]/.test(token);

  while (index < tokens.length) {
    if (isCommand(tokens[index])) command = tokens[index++];
    if (!command) break;

    if (command === 'M' || command === 'm') {
      const relative = command === 'm';
      cx = (relative ? cx : 0) + read();
      cy = (relative ? cy : 0) + read();
      startX = cx;
      startY = cy;
      points.push({ x: cx, y: cy });
      command = relative ? 'l' : 'L';
      prevCtrlX = cx;
      prevCtrlY = cy;
      continue;
    }

    if (command === 'L' || command === 'l') {
      const relative = command === 'l';
      cx = (relative ? cx : 0) + read();
      cy = (relative ? cy : 0) + read();
      points.push({ x: cx, y: cy });
      prevCtrlX = cx;
      prevCtrlY = cy;
      continue;
    }

    if (command === 'H' || command === 'h') {
      cx = command === 'h' ? cx + read() : read();
      points.push({ x: cx, y: cy });
      prevCtrlX = cx;
      prevCtrlY = cy;
      continue;
    }

    if (command === 'V' || command === 'v') {
      cy = command === 'v' ? cy + read() : read();
      points.push({ x: cx, y: cy });
      prevCtrlX = cx;
      prevCtrlY = cy;
      continue;
    }

    if (command === 'C' || command === 'c') {
      const relative = command === 'c';
      const x1 = (relative ? cx : 0) + read();
      const y1 = (relative ? cy : 0) + read();
      const x2 = (relative ? cx : 0) + read();
      const y2 = (relative ? cy : 0) + read();
      const x = (relative ? cx : 0) + read();
      const y = (relative ? cy : 0) + read();
      sampleCubic(points, cx, cy, x1, y1, x2, y2, x, y);
      prevCtrlX = x2;
      prevCtrlY = y2;
      cx = x;
      cy = y;
      continue;
    }

    if (command === 'S' || command === 's') {
      const relative = command === 's';
      const x1 = cx * 2 - prevCtrlX;
      const y1 = cy * 2 - prevCtrlY;
      const x2 = (relative ? cx : 0) + read();
      const y2 = (relative ? cy : 0) + read();
      const x = (relative ? cx : 0) + read();
      const y = (relative ? cy : 0) + read();
      sampleCubic(points, cx, cy, x1, y1, x2, y2, x, y);
      prevCtrlX = x2;
      prevCtrlY = y2;
      cx = x;
      cy = y;
      continue;
    }

    if (command === 'Q' || command === 'q') {
      const relative = command === 'q';
      const x1 = (relative ? cx : 0) + read();
      const y1 = (relative ? cy : 0) + read();
      const x = (relative ? cx : 0) + read();
      const y = (relative ? cy : 0) + read();
      sampleCubic(points, cx, cy, x1, y1, x1, y1, x, y);
      prevCtrlX = x1;
      prevCtrlY = y1;
      cx = x;
      cy = y;
      continue;
    }

    if (command === 'Z' || command === 'z') {
      cx = startX;
      cy = startY;
      points.push({ x: cx, y: cy });
      continue;
    }

    break;
  }

  return points;
}

export function strokesFromKanjiVg(svg: string): Point2[][] {
  const viewBox = svg.match(/viewBox="([^"]+)"/);
  const box = viewBox?.[1].trim().split(/\s+/).map(Number) ?? [0, 0, 109, 109];
  const width = box[2] || 109;
  const height = box[3] || 109;
  const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((match) => match[1]);
  return paths
    .map((path) => sampleSvgPath(path).map((point) => ({ x: point.x / width, y: point.y / height })))
    .filter((stroke) => stroke.length > 1);
}
