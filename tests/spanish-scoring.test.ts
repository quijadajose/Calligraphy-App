import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/data/lessons';
import { CURSIVE_SLANT_DEG, mapPalmerPoint, palmerRowGeometry, sentenceFrame, sentenceRowGeometry, setScriptSlant } from '../src/core/engine/gridMetrics';
import { ScoringEngine } from '../src/core/evaluation/ScoringEngine';
import { warmupStroke } from '../src/core/engine/warmupPatterns';
import { Lesson, Point2, Stroke } from '../src/types/ink';

const W = 1200, H = 760;
const mk = (pts: Point2[]): Stroke => ({ points: pts.map((p, i) => ({ ...p, pressure: .5, tiltX: 0, tiltY: 0, time: i * 10 })), color: '#000', baseWidth: 4, tool: 'fountain' });
const r = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 - .5; }; })();

function letter(id: string) {
  const lesson = LESSONS.find((l) => l.id === id) as Lesson;
  const step = lesson.steps?.[lesson.steps.length - 1];
  return { ...lesson, idealStrokes: step?.strokes ?? lesson.idealStrokes, idealMode: step?.mode ?? lesson.idealMode, strokesExpected: step?.strokes.length } as Lesson;
}
function px(lesson: Lesson, f: (p: Point2) => Point2 = (p) => p): Stroke[] {
  const row = palmerRowGeometry(0, H);
  return (lesson.idealStrokes ?? []).map((s) => mk(s.points.map((p) => mapPalmerPoint(f(p), 300, row))));
}
describe('nota de español y soltura', () => {
it('letras: el modelo calcado saca 100 en todos los estilos; otra letra, espejo o garabato no aprueban', () => {
  for (const [id, other] of [['ligada-minus-a', 'ligada-minus-l'], ['imprenta-minus-a', 'imprenta-minus-k'], ['ligada-minus-o', 'ligada-minus-m']]) {
    const L = letter(id); const O = letter(other);
    setScriptSlant(L.slant ?? CURSIVE_SLANT_DEG);
    const row = palmerRowGeometry(0, H);
    const s = Math.tan((90 - (L.slant ?? 70)) * Math.PI / 180);
    const zig: Point2[] = []; for (let i = 0; i < 6; i++) { zig.push({ x: 300 + i * 20 + row.xHeight * s, y: row.waistY }); zig.push({ x: 300 + i * 20 + 10, y: row.baseY }); }
    const cases: Record<string, Stroke[]> = {
      perfecta: px(L),
      temblorosa: px(L, (p) => ({ x: p.x + r() * .03, y: p.y + r() * .03 })),
      espejo: px(L, (p) => ({ x: 1 - p.x, y: p.y })),
      otra_letra: px(O),
      garabato_inclinado: [mk(zig)],
    };
    for (const [n, st] of Object.entries(cases)) {
      const res = ScoringEngine.scorePalmer(st, L, H, W);
      if (n === 'perfecta') expect(res.score, `${id} ${n}`).toBeGreaterThanOrEqual(95);
      else if (n === 'temblorosa') expect(res.score, `${id} ${n}`).toBeGreaterThanOrEqual(60);
      else expect(res.score, `${id} ${n}`).toBeLessThan(40);
    }
  }
});
it('soltura: el patrón aprueba; otro patrón, una línea recta o dejar en blanco las líneas sin guía no', () => {
  setScriptSlant(CURSIVE_SLANT_DEG);
  const L = { ...(LESSONS.find((l) => l.id === 'soltura-arcos') as Lesson), guidedRows: 2 };
  const { rows } = sentenceFrame(H);
  const all = (p: Parameters<typeof warmupStroke>[0], jitter = 0, n = rows) => Array.from({ length: n }, (_, k) => mk(warmupStroke(p, sentenceRowGeometry(k, H), W).map((q) => ({ x: q.x + r() * jitter, y: q.y + r() * jitter }))));
  const cases: Record<string, Stroke[]> = {
    perfecta: all('arcos'),
    temblorosa: all('arcos', 10),
    solo_con_guia: all('arcos', 0, 2),
    otro_patron_zigzag: all('zigzag'),
    otro_patron_guirnaldas: all('guirnaldas'),
    linea_recta: Array.from({ length: rows }, (_, k) => { const row = sentenceRowGeometry(k, H); return mk(Array.from({ length: 50 }, (_, i) => ({ x: 120 + i * 20, y: row.baseY - row.xHeight / 2 }))); }),
  };
  for (const [n, st] of Object.entries(cases)) {
    const res = ScoringEngine.scoreSheet(st, L, W, H);
    if (n === 'perfecta' || n === 'temblorosa') expect(res.score, n).toBeGreaterThanOrEqual(80);
    else expect(res.score, n).toBeLessThan(70);
  }
});
});
