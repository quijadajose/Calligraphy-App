import { describe, expect, it } from 'vitest';
import { sentenceFrame, sentenceRowGeometry } from '../src/core/engine/gridMetrics';
import { warmupStroke, WARMUP_PATTERNS } from '../src/core/engine/warmupPatterns';
import { ScoringEngine } from '../src/core/evaluation/ScoringEngine';
import { FLOW_LESSONS } from '../src/data/palmer/exercises';
import { Stroke, guidedRowsFor } from '../src/types/ink';

const W = 1000;
const H = 700;

function asStroke(points: { x: number; y: number }[]): Stroke {
  return {
    points: points.map((p, i) => ({ ...p, pressure: 0.5, tiltX: 0, tiltY: 0, time: i * 8 })),
    color: '#000',
    baseWidth: 3,
    tool: 'pencil'
  };
}

describe('soltura', () => {
  it('cada patrón llena el renglón sin salirse de la hoja', () => {
    const row = sentenceRowGeometry(0, H);
    for (const pattern of WARMUP_PATTERNS) {
      const stroke = warmupStroke(pattern, row, W);
      expect(stroke.length).toBeGreaterThan(20);
      const xs = stroke.map((p) => p.x);
      expect(Math.max(...xs)).toBeLessThan(W);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(W * 0.6);
      for (const p of stroke) {
        expect(p.y).toBeLessThanOrEqual(row.baseY + 0.01);
        expect(p.y).toBeGreaterThanOrEqual(row.ascenderY - 0.01);
      }
    }
  });

  it('líneas con guía según el nivel', () => {
    expect(guidedRowsFor(4, 'full')).toBe(2);
    expect(guidedRowsFor(2, 'full')).toBe(1);
    expect(guidedRowsFor(4, 'faint')).toBe(1);
    expect(guidedRowsFor(4, 'none')).toBe(0);
  });

  it('seguir el patrón aprueba y garabatear no', () => {
    const lesson = { ...FLOW_LESSONS.find((l) => l.pattern === 'arcos')!, guidedRows: 2 };
    const { rows } = sentenceFrame(H);
    const good = Array.from({ length: rows }, (_, r) => asStroke(warmupStroke('arcos', sentenceRowGeometry(r, H), W)));
    const bad = Array.from({ length: rows }, (_, r) => {
      const row = sentenceRowGeometry(r, H);
      return asStroke(Array.from({ length: 40 }, (_, i) => ({ x: 120 + i * 4, y: row.baseY - (i % 2) * row.xHeight * 2 })));
    });
    const goodScore = ScoringEngine.scoreSheet(good, lesson, W, H).shapeScore ?? 0;
    const badScore = ScoringEngine.scoreSheet(bad, lesson, W, H).shapeScore ?? 0;
    expect(goodScore).toBeGreaterThan(80);
    expect(badScore).toBeLessThan(goodScore - 30);
  });
});

import { sanitizeSettings } from '../src/core/settings/SettingsStore';

describe('estilos de letra en Ajustes', () => {
  it('por defecto imprenta; nunca vacío; la letra de las hojas es una de las elegidas', () => {
    expect(sanitizeSettings({}).scripts).toEqual(['Imprenta']);
    expect(sanitizeSettings({}).sheetScript).toBe('Imprenta');
    expect(sanitizeSettings({ scripts: [] }).scripts).toEqual(['Imprenta']);
    const two = sanitizeSettings({ scripts: ['Copperplate', 'Ligada', 'x'], sheetScript: 'Imprenta' });
    expect(two.scripts).toEqual(['Ligada', 'Copperplate']);
    expect(two.sheetScript).toBe('Ligada');
  });
});
