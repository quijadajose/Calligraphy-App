import { describe, expect, it } from 'vitest';
import { genkouyoushiLayout, sentenceRowGeometry } from '../src/core/engine/gridMetrics';
import { KanjiOrderValidator } from '../src/core/evaluation/KanjiOrderValidator';
import { profileFromStrokes } from '../src/core/evaluation/profile';
import { ScoringEngine } from '../src/core/evaluation/ScoringEngine';
import { SlantAnalyzer } from '../src/core/evaluation/SlantAnalyzer';
import { CharGeometry, Lesson, Point2, Stroke } from '../src/types/ink';

const W = 800;
const H = 700;

function stroke(points: Point2[]): Stroke {
  return {
    points: points.map((p, i) => ({ ...p, pressure: 0.5, tiltX: 0, tiltY: 0, time: i * 16 })),
    color: '#000',
    baseWidth: 4,
    tool: 'fountain'
  };
}

/** Una «palabra» de prueba: arcos dentro de la altura de x, con inclinación de 52°. */
function cursiveRow(row: number, startX = 120, letters = 8): Point2[] {
  const g = sentenceRowGeometry(row, H);
  const lean = (y: number) => (g.baseY - y) / Math.tan((52 * Math.PI) / 180);
  const points: Point2[] = [];
  for (let i = 0; i < letters; i++) {
    const x = startX + i * g.xHeight * 0.9;
    for (let t = 0; t <= 8; t++) {
      const y = g.baseY - Math.sin((t / 8) * Math.PI) * g.xHeight;
      points.push({ x: x + (t / 8) * g.xHeight * 0.9 + lean(y), y });
    }
  }
  return points;
}

const sheetLesson: Lesson = {
  id: 'w',
  category: 'palmer',
  group: 'Oraciones',
  title: 'mmmm',
  subTitle: '',
  instructions: '',
  characterOrWord: 'mmmm',
  recommendedTool: 'fountain',
  suggestedGrid: 'palmer',
  sheet: true
};

describe('Inclinación', () => {
  it('mide solo los trazos que bajan', () => {
    const down = Array.from({ length: 20 }, (_, i) => ({ x: 300 - (i * 5) / Math.tan((52 * Math.PI) / 180), y: 100 + i * 5 }));
    const end = down[down.length - 1];
    const up = Array.from({ length: 20 }, (_, i) => ({ x: end.x + (i + 1) * 9, y: end.y - (i + 1) * 4 }));
    const result = SlantAnalyzer.analyze([stroke([...down, ...up])]);
    expect(Math.abs(result.avgAngle - 52)).toBeLessThanOrEqual(2);
  });

  it('sin trazos descendentes no inventa una nota', () => {
    const flat = SlantAnalyzer.analyze([stroke([{ x: 0, y: 100 }, { x: 200, y: 100 }])]);
    expect(flat.samples).toBe(0);
    expect(flat.slantScore).toBe(0);
  });
});

describe('Nota de oraciones y planas', () => {
  const guideRow = sentenceRowGeometry(0, H);
  const guide = profileFromStrokes([cursiveRow(0, 100)], guideRow.baseY, guideRow.xHeight, W);

  it('lo escrito como el modelo, en todas las líneas, aprueba', () => {
    const strokes = [0, 1, 2, 3].map((row) => stroke(cursiveRow(row, row === 0 ? 100 : 140)));
    const result = ScoringEngine.scorePalmer(strokes, sheetLesson, H, W, { guide });
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('garabatos inclinados no aprueban', () => {
    const scribble = Array.from({ length: 30 }, (_, i) => ({
      x: 150 + (i % 2) * 40 - i * 2,
      y: 80 + (i % 2 ? 260 : 0)
    }));
    const result = ScoringEngine.scorePalmer([stroke(scribble)], sheetLesson, H, W, { guide });
    expect(result.score).toBeLessThan(70);
  });

  it('una sola línea de cuatro baja la nota', () => {
    const full = ScoringEngine.scorePalmer([0, 1, 2, 3].map((row) => stroke(cursiveRow(row, 140))), sheetLesson, H, W, { guide });
    const one = ScoringEngine.scorePalmer([stroke(cursiveRow(1, 140))], sheetLesson, H, W, { guide });
    expect(one.score).toBeLessThan(full.score);
  });

  it('sin modelo (fuente sin cargar) la nota no pasa de 60', () => {
    const strokes = [0, 1].map((row) => stroke(cursiveRow(row)));
    const result = ScoringEngine.scorePalmer(strokes, sheetLesson, H, W, { guide: null });
    expect(result.score).toBeLessThanOrEqual(60);
  });
});

describe('Kanji en varios cuadros', () => {
  // Un carácter de dos trazos: horizontal y vertical (como 十).
  const ten: CharGeometry = {
    char: '十',
    strokes: [
      Array.from({ length: 10 }, (_, i) => ({ x: 0.15 + i * 0.075, y: 0.5 })),
      Array.from({ length: 10 }, (_, i) => ({ x: 0.5, y: 0.12 + i * 0.085 }))
    ]
  };
  const layout = genkouyoushiLayout(W, H);
  const inBox = (box: number, points: Point2[]) => {
    const b = layout.boxes[box];
    return stroke(points.map((p) => ({ x: b.x + p.x * b.size, y: b.y + p.y * b.size })));
  };

  it('copiar el carácter dos veces no resta puntos', () => {
    const strokes = [0, 1].flatMap((box) => ten.strokes.map((s) => inBox(box, s)));
    const result = KanjiOrderValidator.assessCopies(strokes, [ten], W, H);
    expect(result.copies).toBe(2);
    expect(result.accuracy).toBeGreaterThanOrEqual(85);
    expect(result.bad).toEqual([]);
  });

  it('una copia con el orden cambiado se marca', () => {
    const good = ten.strokes.map((s) => inBox(0, s));
    const swapped = [ten.strokes[1], ten.strokes[0]].map((s) => inBox(1, s));
    const result = KanjiOrderValidator.assessCopies([...good, ...swapped], [ten], W, H);
    expect(result.copies).toBe(2);
    expect(result.bad.length).toBeGreaterThan(0);
    expect(result.bad.every((index) => index >= 2)).toBe(true);
  });

  it('una palabra se compara signo a signo por cuadro', () => {
    const one: CharGeometry = { char: '一', strokes: [ten.strokes[0]] };
    const strokes = [inBox(0, ten.strokes[0]), inBox(0, ten.strokes[1]), inBox(1, one.strokes[0])];
    const result = KanjiOrderValidator.assessCopies(strokes, [ten, one], W, H);
    expect(result.copies).toBe(2);
    expect(result.accuracy).toBeGreaterThanOrEqual(85);
  });
});
