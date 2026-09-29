import { CharGeometry, Point2 } from '../../types/ink';
import { strokesFromKanjiVg } from './svgPath';

const MIN_Y = -124;
const SIZE = 1024;

interface CharRecord {
  geometry: CharGeometry | null;
  raw: unknown | null;
}

const cache = new Map<string, Promise<CharRecord>>();

function medianToUnit(x: number, y: number): Point2 {
  return {
    x: x / SIZE,
    y: 1 - (y - MIN_Y) / SIZE
  };
}

async function fetchChar(char: string): Promise<CharRecord> {
  const urls = [
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/${encodeURIComponent(char)}.json`,
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const raw = await response.json() as { medians?: number[][][] };
      if (!raw.medians?.length) continue;
      return {
        raw,
        geometry: {
          char,
          strokes: raw.medians.map((median) => median.map(([x, y]) => medianToUnit(x, y)))
        }
      };
    } catch {
      continue;
    }
  }
  const kanjiVg = await fetchKanjiVg(char);
  if (kanjiVg) return { geometry: kanjiVg, raw: null };
  return { geometry: null, raw: null };
}

async function fetchKanjiVg(char: string): Promise<CharGeometry | null> {
  const code = char.codePointAt(0);
  if (code === undefined) return null;
  const hex = code.toString(16).padStart(5, '0');
  try {
    const response = await fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`);
    if (!response.ok) return null;
    const svg = await response.text();
    const strokes = strokesFromKanjiVg(svg);
    if (strokes.length === 0) return null;
    return { char, strokes };
  } catch {
    return null;
  }
}

export function loadCharRecord(char: string): Promise<CharRecord> {
  const cached = cache.get(char);
  if (cached) return cached;
  const pending = fetchChar(char);
  cache.set(char, pending);
  return pending;
}

export function loadCharGeometry(char: string): Promise<CharGeometry | null> {
  return loadCharRecord(char).then((record) => record.geometry);
}
