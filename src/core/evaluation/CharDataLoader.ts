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

/** Lo que no responde en este tiempo se da por perdido: una red lenta no deja la hoja esperando. */
const NETWORK_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string, remote: boolean): Promise<Response | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = remote && controller ? setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS) : null;
  try {
    const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
    return response.ok ? response : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function hanziFrom(char: string, url: string, remote: boolean): Promise<CharRecord | null> {
  const response = await fetchWithTimeout(url, remote);
  if (!response) return null;
  try {
    return fromHanziJson(char, (await response.json()) as { medians?: number[][][] });
  } catch {
    return null;
  }
}

async function kanjiVgFrom(char: string, url: string, remote: boolean): Promise<CharRecord | null> {
  const response = await fetchWithTimeout(url, remote);
  if (!response) return null;
  try {
    const strokes = strokesFromKanjiVg(await response.text());
    return strokes.length > 0 ? { geometry: { char, strokes }, raw: null } : null;
  } catch {
    return null;
  }
}

/**
 * Primero lo que viene con la app o ya se descargó (JSON y luego el SVG de KanjiVG),
 * y solo si falta, internet. Antes se probaba el CDN antes que el SVG local, y con
 * la red lenta la hoja se quedaba en «Cargando orden de trazos…» aunque el dato estuviera.
 */
async function fetchChar(char: string): Promise<CharRecord> {
  const base = localBase();
  const code = char.codePointAt(0);
  if (base !== null && code !== undefined) {
    const local = (await hanziFrom(char, `${base}chardata/${charFileName(char)}`, false))
      ?? (await kanjiVgFrom(char, `${base}chardata/${code.toString(16)}.svg`, false));
    if (local) return local;
  }
  for (const url of [
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/${encodeURIComponent(char)}.json`,
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`
  ]) {
    const record = await hanziFrom(char, url, true);
    if (record) return record;
  }
  if (code !== undefined) {
    const hex = code.toString(16).padStart(5, '0');
    // Una versión fija de KanjiVG: un cambio aguas arriba no rompe el lector de trazos.
    for (const ref of [KANJIVG_RELEASE, 'master']) {
      const record = await kanjiVgFrom(char, `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@${ref}/kanji/${hex}.svg`, true);
      if (record) return record;
    }
  }
  return { geometry: null, raw: null };
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
