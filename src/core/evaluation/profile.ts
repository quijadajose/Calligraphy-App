import { Point2 } from '../../types/ink';
import { clamp } from './geometry';

/**
 * Silueta de una línea de escritura: por cada columna, hasta dónde sube y baja
 * la tinta. Las alturas van en alturas de x sobre la línea de base
 * (1 = línea media, 2 = ascendente, negativo = descendente).
 */
export interface Column {
  top: number;
  bottom: number;
}

export type ColumnProfile = Array<Column | null>;

/** Ancho de columna, en alturas de x. */
export const PROFILE_STEP = 0.25;

function columnCount(canvasWidth: number, xHeight: number): number {
  return Math.max(1, Math.ceil(canvasWidth / (xHeight * PROFILE_STEP)));
}

function widen(profile: ColumnProfile, index: number, height: number): void {
  if (index < 0 || index >= profile.length) return;
  const column = profile[index];
  if (!column) profile[index] = { top: height, bottom: height };
  else {
    column.top = Math.max(column.top, height);
    column.bottom = Math.min(column.bottom, height);
  }
}

export function profileFromStrokes(
  strokes: Point2[][],
  baseY: number,
  xHeight: number,
  canvasWidth: number
): ColumnProfile {
  const profile: ColumnProfile = Array.from({ length: columnCount(canvasWidth, xHeight) }, () => null);
  const columnWidth = xHeight * PROFILE_STEP;
  const spacing = Math.max(0.5, columnWidth / 2);
  for (const stroke of strokes) {
    for (let i = 0; i < stroke.length; i++) {
      const to = stroke[i];
      const from = stroke[Math.max(0, i - 1)];
      const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / spacing));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        widen(profile, Math.floor(x / columnWidth), (baseY - y) / xHeight);
      }
    }
  }
  return profile;
}

/** Silueta de un texto ya dibujado. `data` es RGBA y `scale`, píxeles de imagen por píxel de hoja. */
export function profileFromAlpha(
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  scale: number,
  baseY: number,
  xHeight: number,
  canvasWidth: number
): ColumnProfile {
  const profile: ColumnProfile = Array.from({ length: columnCount(canvasWidth, xHeight) }, () => null);
  const columnWidth = xHeight * PROFILE_STEP;
  for (let px = 0; px < imageWidth; px++) {
    let first = -1;
    let last = -1;
    for (let py = 0; py < imageHeight; py++) {
      if (data[(py * imageWidth + px) * 4 + 3] > 48) {
        if (first < 0) first = py;
        last = py;
      }
    }
    if (first < 0) continue;
    const index = Math.floor(px / scale / columnWidth);
    widen(profile, index, (baseY - first / scale) / xHeight);
    widen(profile, index, (baseY - last / scale) / xHeight);
  }
  return profile;
}

export function trimProfile(profile: ColumnProfile): ColumnProfile {
  let start = 0;
  let end = profile.length;
  while (start < end && !profile[start]) start += 1;
  while (end > start && !profile[end - 1]) end -= 1;
  return profile.slice(start, end);
}

export function inkedColumns(profile: ColumnProfile): number {
  return profile.reduce((count, column) => count + (column ? 1 : 0), 0);
}

export interface ProfileMatch {
  /** 0–100: cuánto se parece la silueta escrita a la del modelo. */
  score: number;
  /** Ancho de lo escrito respecto al modelo. */
  widthRatio: number;
}

/**
 * Compara dos siluetas. Con `align` se recortan los márgenes y lo escrito se
 * estira al ancho del modelo, así no importa dónde empezó la línea; sin `align`
 * se compara columna a columna, que es lo que pide el calco.
 */
export function compareProfiles(user: ColumnProfile, guide: ColumnProfile, align: boolean): ProfileMatch {
  const a = align ? trimProfile(user) : user;
  const b = align ? trimProfile(guide) : guide;
  if (inkedColumns(a) === 0 || inkedColumns(b) === 0) return { score: 0, widthRatio: 0 };
  const widthRatio = align ? a.length / b.length : 1;
  const length = align ? b.length : Math.max(a.length, b.length);

  let error = 0;
  let counted = 0;
  for (let i = 0; i < length; i++) {
    const g = b[i] ?? null;
    const source = align ? Math.round((i * (a.length - 1)) / Math.max(1, b.length - 1)) : i;
    const u = a[source] ?? null;
    if (!g && !u) continue;
    counted += 1;
    if (!g || !u) error += 1;
    else error += Math.min(1, (Math.abs(u.top - g.top) + Math.abs(u.bottom - g.bottom)) / 2);
  }
  if (counted === 0) return { score: 0, widthRatio };
  const stretch = align ? clamp((Math.abs(Math.log(widthRatio)) - 0.3) * 60, 0, 30) : 0;
  return { score: clamp(Math.round(100 * (1 - error / counted) - stretch)), widthRatio };
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Altura de la x en letra enlazada: las columnas de cuerpo (las que no son
 * ascendente) deben coronar en la línea media y apoyarse en la base.
 */
export function bodyHeightScore(profiles: ColumnProfile[]): number | null {
  const tops: number[] = [];
  const feet: number[] = [];
  for (const profile of profiles) {
    for (const column of profile) {
      if (!column) continue;
      if (column.top >= 0.5 && column.top <= 1.5) tops.push(column.top);
      if (column.bottom >= -0.5 && column.bottom <= 0.5) feet.push(column.bottom);
    }
  }
  if (tops.length < 4) return null;
  const middle = median(tops);
  const spread = Math.sqrt(tops.reduce((sum, value) => sum + (value - middle) ** 2, 0) / tops.length);
  const foot = feet.length >= 4 ? Math.abs(median(feet)) : 0;
  return clamp(Math.round(100 - Math.abs(middle - 1) * 110 - spread * 90 - foot * 80));
}
