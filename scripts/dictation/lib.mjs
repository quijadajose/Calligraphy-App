// Utilidades comunes del pipeline de dictados japoneses.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Fuente de verdad: los dictados generados y revisados (se versiona en git). */
export const DATA_DIR = join(ROOT, 'dictation');
/** Lo que la app importa: solo los dictados aprobados, en formato compacto. */
export const OUT_DIR = join(ROOT, 'src', 'data', 'japanese', 'dictation');

export const LEVELS = ['Kana', 'N5', 'N4', 'N3', 'N2', 'N1'];
export const KANJI_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const MIN_GLYPHS = 3;
/** Kana que casi no aparecen en palabras reales: no se exige cubrirlos. */
export const KANA_SKIP = new Set(Array.from('ぢヂヅヲゎヮヵヶ'));
export const MAX_GLYPHS = 10;

export function isKana(char) {
  return /^[ぁ-ゖァ-ヺ]$/u.test(char);
}

export function isKanji(char) {
  return /^[㐀-䶿一-鿿々]$/u.test(char);
}

export function hasJapanese(text) {
  return /[぀-ヿ㐀-䶿一-鿿]/u.test(text);
}

/** Katakana → hiragana (para comparar lecturas). */
export function toHiragana(text) {
  return Array.from(text).map((char) => {
    const code = char.codePointAt(0);
    return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : char;
  }).join('');
}

export function glyphsOf(text) {
  return Array.from(text).filter((char) => char.trim().length > 0);
}

export function normalizeText(text) {
  return String(text ?? '').replace(/[\s　]+/gu, ' ').trim();
}

/** Clave para detectar frases repetidas: sin espacios. */
export function textKey(text) {
  return normalizeText(text).replace(/ /g, '');
}

/** Kanji del curso por nivel, leídos de src/data/japanese/kanjiDatabase.ts. */
export function loadKanji() {
  const source = readFileSync(join(ROOT, 'src/data/japanese/kanjiDatabase.ts'), 'utf8');
  const byLevel = new Map();
  for (const level of KANJI_LEVELS) {
    const table = source.match(new RegExp(`const ${level}_TABLE = \`([\\s\\S]*?)\``));
    const entries = [];
    for (const line of (table?.[1] ?? '').trim().split('\n')) {
      const [c, s, r, m] = line.split('|').map((part) => part?.trim());
      if (c && isKanji(c)) entries.push({ c, s: Number(s), r, m });
    }
    byLevel.set(level, entries);
  }
  return byLevel;
}

/** Signos con datos de trazo (public/chardata/index.json, lo genera `npm run chardata`). */
export function loadCharset() {
  const path = join(ROOT, 'public', 'chardata', 'index.json');
  if (!existsSync(path)) {
    throw new Error('Falta public/chardata/index.json. Ejecuta antes: npm run chardata');
  }
  const index = JSON.parse(readFileSync(path, 'utf8'));
  return new Set((index.all ?? []).map((file) => String.fromCodePoint(parseInt(file, 16))));
}

/** Contexto de un nivel: qué kanji son objetivo, cuáles se permiten y qué kana hay. */
export function levelContext(level, kanjiByLevel = loadKanji(), charset = loadCharset()) {
  if (!LEVELS.includes(level)) throw new Error(`Nivel desconocido: ${level}. Usa uno de ${LEVELS.join(', ')}`);
  const kana = [...charset].filter(isKana).sort();
  const allowedKanji = new Set();
  let targets = [];
  if (level === 'Kana') {
    targets = kana.filter((c) => !KANA_SKIP.has(c)).map((c) => ({ c, r: '', m: '' }));
  } else {
    for (const name of KANJI_LEVELS) {
      for (const entry of kanjiByLevel.get(name) ?? []) allowedKanji.add(entry.c);
      if (name === level) {
        targets = kanjiByLevel.get(name) ?? [];
        break;
      }
    }
  }
  const strokes = new Map();
  for (const entries of kanjiByLevel.values()) for (const entry of entries) strokes.set(entry.c, entry.s);
  return { level, targets, allowedKanji, kana, charset, strokes };
}

export function itemsPath(level) {
  return join(DATA_DIR, `${level}.json`);
}

export function loadItems(level) {
  const path = itemsPath(level);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Un dictado por línea: los diffs de git quedan legibles. */
export function saveItems(level, items) {
  mkdirSync(DATA_DIR, { recursive: true });
  const body = items.map((item) => '  ' + JSON.stringify(item)).join(',\n');
  writeFileSync(itemsPath(level), items.length ? `[\n${body}\n]\n` : '[]\n');
}

export function logRejected(entry) {
  mkdirSync(DATA_DIR, { recursive: true });
  appendFileSync(join(DATA_DIR, 'rejected.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}

export function nextId(level, items) {
  let max = 0;
  for (const item of items) {
    const n = Number(String(item.id).split('-').pop());
    if (Number.isFinite(n) && n > max) max = n;
  }
  return (offset) => `${level}-${String(max + 1 + offset).padStart(4, '0')}`;
}

/** Cuántas frases vigentes (no descartadas) contienen cada objetivo del nivel. */
export function coverage(ctx, items) {
  const counts = new Map(ctx.targets.map((target) => [target.c, 0]));
  for (const item of items) {
    if (item.status === 'dropped') continue;
    for (const char of new Set(glyphsOf(item.text))) {
      if (counts.has(char)) counts.set(char, counts.get(char) + 1);
    }
  }
  return counts;
}
