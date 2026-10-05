import { CharGeometry, Point2 } from '../../types/ink';
import { strokesFromKanjiVg } from './svgPath';

const MIN_Y = -124;
const SIZE = 1024;
const KANJIVG_RELEASE = 'r20230110';

export interface CharRecord {
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

/** Nombre del archivo local de un carácter: su código en hexadecimal (evita problemas con nombres en japonés). */
export function charFileName(char: string): string {
  return `${(char.codePointAt(0) ?? 0).toString(16)}.json`;
}

function localBase(): string | null {
  try {
    // Vite reemplaza esta expresión al compilar; fuera de Vite (scripts, tests) lanza y se ignora.
    const base = import.meta.env.BASE_URL;
    return typeof base === 'string' ? base : null;
  } catch {
    return null;
  }
}

function fromHanziJson(char: string, raw: { medians?: number[][][] }): CharRecord | null {
  if (!raw.medians?.length) return null;
  return {
    raw,
    geometry: {
      char,
      strokes: raw.medians.map((median) => median.map(([x, y]) => medianToUnit(x, y)))
    }
  };
}

async function fetchChar(char: string): Promise<CharRecord> {
  const base = localBase();
  const urls = [
    // Kana, N5 y vocabulario vienen empaquetados con la app (scripts/fetch-chardata.mjs).
    ...(base !== null ? [`${base}chardata/${charFileName(char)}`] : []),
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/${encodeURIComponent(char)}.json`,
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const record = fromHanziJson(char, (await response.json()) as { medians?: number[][][] });
      if (record) return record;
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
  const base = localBase();
  // Primero la copia que viene con la app; luego una versión fija de KanjiVG en el CDN,
  // así un cambio aguas arriba no rompe el lector de trazos.
  const urls = [
    ...(base !== null ? [`${base}chardata/${code.toString(16)}.svg`] : []),
    ...[KANJIVG_RELEASE, 'master'].map((ref) => `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@${ref}/kanji/${hex}.svg`)
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const strokes = strokesFromKanjiVg(await response.text());
      if (strokes.length > 0) return { char, strokes };
    } catch {
      continue;
    }
  }
  return null;
}

export function loadCharRecord(char: string): Promise<CharRecord> {
  const cached = cache.get(char);
  if (cached) return cached;
  const pending = fetchChar(char).then((record) => {
    // Un fallo de red no se queda en caché: se reintenta la próxima vez.
    if (!record.geometry) cache.delete(char);
    return record;
  });
  cache.set(char, pending);
  return pending;
}

export function loadCharGeometry(char: string): Promise<CharGeometry | null> {
  return loadCharRecord(char).then((record) => record.geometry);
}

/** Descarga de una vez una lista de caracteres para tenerlos sin conexión (el service worker los guarda). */
export async function prefetchChars(chars: string[], onProgress?: (done: number, total: number) => void): Promise<number> {
  const unique = [...new Set(chars)];
  let done = 0;
  let ok = 0;
  const queue = [...unique];
  const worker = async () => {
    while (queue.length > 0) {
      const char = queue.shift();
      if (!char) break;
      const record = await loadCharRecord(char);
      if (record.geometry) ok += 1;
      done += 1;
      onProgress?.(done, unique.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return ok;
}
