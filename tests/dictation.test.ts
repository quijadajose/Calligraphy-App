import { describe, expect, it } from 'vitest';
import { DICTATION_LEVELS, KANJI_LEVELS } from '../src/data/groups';
import { N1, N2, N3, N4, N5 } from '../src/data/japanese/kanjiDatabase';
import { dictationLesson } from '../src/data/japanese/dictation/index';
import { pickDictation } from '../src/core/daily/DailyPlan';
import { ProgressStore } from '../src/core/progress/ProgressStore';
import { Lesson, glyphsOf } from '../src/types/ink';
// @ts-expect-error módulo JS del pipeline, sin tipos
import { validateItem } from '../scripts/dictation/validate.mjs';
import Kana from '../src/data/japanese/dictation/Kana.json';
import N5Rows from '../src/data/japanese/dictation/N5.json';
import N4Rows from '../src/data/japanese/dictation/N4.json';
import N3Rows from '../src/data/japanese/dictation/N3.json';
import N2Rows from '../src/data/japanese/dictation/N2.json';
import N1Rows from '../src/data/japanese/dictation/N1.json';

type Row = [string, string, string, string];
const ROWS: Record<string, Row[]> = { Kana, N5: N5Rows, N4: N4Rows, N3: N3Rows, N2: N2Rows, N1: N1Rows } as unknown as Record<string, Row[]>;
const KANJI_BY_LEVEL: Record<string, string[]> = { N5: N5.map((e) => e.c), N4: N4.map((e) => e.c), N3: N3.map((e) => e.c), N2: N2.map((e) => e.c), N1: N1.map((e) => e.c) };
const UNREACHABLE = new Set(['嵯', '瑚', '菖']);
const KANA = /^[ぁ-ゖァ-ヺ]$/u;
const KANJI = /^[㐀-鿿々]$/u;

function allowedUpTo(level: string): Set<string> {
  const allowed = new Set<string>();
  for (const name of KANJI_LEVELS) {
    KANJI_BY_LEVEL[name].forEach((c) => allowed.add(c));
    if (name === level) break;
  }
  return level === 'Kana' ? new Set() : allowed;
}

describe('dictados generados (datos que usa la app)', () => {
  for (const level of DICTATION_LEVELS) {
    it(`${level}: cada frase cumple las reglas`, () => {
      const allowed = allowedUpTo(level);
      const ids = new Set<string>();
      for (const [id, text, speech, hint] of ROWS[level]) {
        expect(ids.has(id), id).toBe(false);
        ids.add(id);
        const glyphs = glyphsOf(text);
        expect(glyphs.length, text).toBeGreaterThanOrEqual(3);
        expect(glyphs.length, text).toBeLessThanOrEqual(10);
        for (const char of glyphs) {
          if (KANJI.test(char)) expect(allowed.has(char), `${text}: ${char}`).toBe(true);
          else expect(KANA.test(char), `${text}: ${char}`).toBe(true);
        }
        expect(Array.from(speech.replace(/ /g, '')).every((char) => KANA.test(char)), speech).toBe(true);
        expect(hint.length).toBeGreaterThan(0);
        expect(/[぀-ヿ一-鿿]/u.test(hint), hint).toBe(false);
      }
    });
  }

  it('los niveles generados cubren cada kanji al menos dos veces', () => {
    for (const level of KANJI_LEVELS) {
      const rows = ROWS[level];
      if (rows.length === 0) continue;
      const counts = new Map<string, number>();
      for (const [, text] of rows) for (const char of new Set(glyphsOf(text))) counts.set(char, (counts.get(char) ?? 0) + 1);
      // 嵯, 瑚 y 菖 solo se usan en 嵯峨, 珊瑚 y 菖蒲, cuyo otro kanji no está en el curso (sin datos de trazo).
      const missing = KANJI_BY_LEVEL[level].filter((c) => !UNREACHABLE.has(c) && (counts.get(c) ?? 0) < 2);
      expect(missing, `${level} sin cubrir`).toEqual([]);
    }
  });

  it('la lección de dictado no muestra el texto en el título y lee la lectura', () => {
    const lesson = dictationLesson('N5', ['N5-0001', '日よう日に あう', 'にちようびに あう', 'Nos vemos el domingo']);
    expect(lesson.id).toBe('jpd-N5-0001');
    expect(lesson.group).toBe('Dictado N5');
    expect(lesson.dictation).toBe(true);
    expect(lesson.title).toBe('Nos vemos el domingo');
    expect(lesson.speech).toBe('にちようびに あう');
    expect(lesson.reading).toBeUndefined();
  });
});

describe('validador del pipeline', () => {
  const n5 = KANJI_BY_LEVEL.N5;
  const kana = Array.from('あいうえおかがきくけこさしすせそただちっつてでとなにのはひへまみめもゃやゅよらりるれろわをんコヒ');
  const ctx = {
    level: 'N5',
    allowedKanji: new Set(n5),
    charset: new Set([...kana, ...n5]),
    targets: N5.map((e) => ({ c: e.c, r: e.r, m: e.m })),
    seen: new Set<string>()
  };
  const check = (text: string, reading: string, hint = 'Algo') => validateItem({ text, reading, hint }, ctx).errors as string[];

  it('acepta una frase correcta', () => {
    expect(check('山へ 行く', 'やまへ いく')).toEqual([]);
  });
  it('rechaza kanji de otro nivel, ー, puntuación y pistas en japonés', () => {
    expect(check('会社へ 行く', 'かいしゃへ いく').join()).toMatch(/fuera del nivel/);
    expect(check('コーヒーを 見る', 'こーひーを みる').join()).toMatch(/sin datos de trazo/);
    expect(check('山へ 行く。', 'やまへ いく').join()).toMatch(/sin datos de trazo/);
    expect(check('山へ 行く', 'やまへ いく', 'やま').join()).toMatch(/pista/);
  });
  it('rechaza frases muy cortas, sin kanji del nivel o con lectura en kanji', () => {
    expect(check('山', 'やま').join()).toMatch(/largo/);
    expect(check('これは なに', 'これは なに').join()).toMatch(/ningún kanji/);
    expect(check('山へ 行く', '山へ いく').join()).toMatch(/solo en kana/);
  });
});

describe('plan del día: dictado japonés', () => {
  const dict = (id: string, text: string): Lesson => ({
    id, category: 'japanese', group: 'Dictado N5', title: id, subTitle: '', instructions: '',
    characterOrWord: text, recommendedTool: 'fude', suggestedGrid: 'genkouyoushi', dictation: true
  });
  const kanji = (c: string): Lesson => ({
    id: `kanji-N5-${c}`, category: 'japanese', group: 'N5', title: c, subTitle: '', instructions: '',
    characterOrWord: c, recommendedTool: 'fude', suggestedGrid: 'genkouyoushi'
  });
  const fakeProgress = (complete: string[]) =>
    ({ get: (id: string) => (complete.includes(id) ? { complete: true } : undefined) }) as unknown as ProgressStore;

  it('elige un dictado con kanji ya aprendidos; si no hay, uno en kana', () => {
    const lessons = [kanji('山'), kanji('川'), dict('a', '山へ 行く'), dict('b', '山と 川'), dict('c', 'ありがとう')];
    expect(pickDictation(lessons, fakeProgress(['kanji-N5-山', 'kanji-N5-川']), 0)?.id).toBe('b');
    expect(pickDictation(lessons, fakeProgress([]), 0)?.id).toBe('c');
  });
});
