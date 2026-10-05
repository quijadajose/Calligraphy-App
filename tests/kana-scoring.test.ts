import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { genkouyoushiLayout } from '../src/core/engine/gridMetrics';
import { KanjiOrderValidator } from '../src/core/evaluation/KanjiOrderValidator';
import { strokesFromKanjiVg } from '../src/core/evaluation/svgPath';
import { Point2, Stroke } from '../src/types/ink';

const W = 1200;
const H = 700;

function load(file: string): Point2[][] {
  return file.endsWith('.json')
    ? (JSON.parse(readFileSync(file, 'utf8')).medians as number[][][]).map((m) => m.map(([x, y]) => ({ x: x / 1024, y: 1 - (y + 124) / 1024 })))
    : strokesFromKanjiVg(readFileSync(file, 'utf8'));
}

/** Escribe el modelo (transformado) en el segundo cuadro de la hoja. */
function write(ideal: Point2[][], f: (p: Point2, i: number, n: number) => Point2 = (p) => p): Stroke[] {
  const box = genkouyoushiLayout(W, H).boxes[1];
  return ideal.map((stroke) => ({
    points: stroke.map((p, i) => {
      const q = f(p, i, stroke.length);
      return { x: box.x + q.x * box.size, y: box.y + q.y * box.size, pressure: 0.5, tiltX: 0, tiltY: 0, time: i * 10 };
    }),
    color: '#000',
    baseWidth: 4,
    tool: 'fude'
  }));
}

const score = (ideal: Point2[][], strokes: Stroke[]) =>
  KanjiOrderValidator.assess(strokes, { char: '?', strokes: ideal }, W, H).accuracy;

describe('nota de kana y kanji', () => {
  const no = load('public/chardata/306e.svg');
  const nichi = load('public/chardata/65e5.json');

  it('una copia bien hecha aprueba aunque sea más chica o esté corrida en el cuadro', () => {
    expect(score(no, write(no))).toBe(100);
    expect(score(no, write(no, (p) => ({ x: 0.2 + p.x * 0.7, y: 0.15 + p.y * 0.7 })))).toBeGreaterThanOrEqual(85);
  });

  it('una の en espejo o al revés no aprueba (un solo trazo no regala puntos por orden)', () => {
    expect(score(no, write(no, (p) => ({ x: 1 - p.x, y: p.y })))).toBeLessThan(40);
    expect(score(no, write(no).map((s) => ({ ...s, points: [...s.points].reverse() })))).toBeLessThan(40);
  });

  it('faltar un trazo o equivocar el orden no aprueba', () => {
    expect(score(nichi, write(nichi).slice(0, -1))).toBeLessThan(70);
    expect(score(nichi, [...write(nichi)].reverse())).toBeLessThan(40);
  });

  it('las proporciones cuentan, pero menos que la forma', () => {
    const flat = score(nichi, write(nichi, (p) => ({ x: p.x, y: 0.3 + (p.y - 0.3) * 0.6 })));
    expect(flat).toBeLessThan(70);
    expect(flat).toBeGreaterThan(30);
  });
});
