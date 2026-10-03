import { ColumnProfile, profileFromAlpha } from '../evaluation/profile';
import { sentenceRowGeometry } from './gridMetrics';
import { SHEET_TEXT_X, sentenceFont, sentenceFontSize, sentenceSkew } from './sentenceLayout';

const SCALE = 0.5;
let cache: { key: string; profile: ColumnProfile } | null = null;

/**
 * Silueta de la oración modelo tal como se dibuja en la primera línea de la hoja.
 * Devuelve null si la fuente del modelo todavía no cargó: sin ella no hay con qué comparar.
 */
export function sheetGuideProfile(text: string, width: number, height: number): ColumnProfile | null {
  if (typeof document === 'undefined' || !text.trim() || width < 8) return null;
  if (!document.fonts?.check('600 16px Caveat')) return null;
  const key = `${Math.round(width)}x${Math.round(height)}:${text}`;
  if (cache?.key === key) return cache.profile;

  const row = sentenceRowGeometry(0, height);
  const pad = row.xHeight * 0.5;
  const rowSpan = row.descenderY - row.ascenderY + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width * SCALE));
  canvas.height = Math.max(1, Math.ceil(rowSpan * SCALE));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const baseLocal = row.baseY - row.ascenderY + pad;
  ctx.scale(SCALE, SCALE);
  const size = sentenceFontSize(ctx, text, row.xHeight, width);
  ctx.font = sentenceFont(size);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  ctx.translate(SHEET_TEXT_X, baseLocal);
  ctx.transform(1, 0, sentenceSkew(), 1, 0, 0);
  ctx.fillText(text, 0, 0);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const profile = profileFromAlpha(image.data, canvas.width, canvas.height, SCALE, baseLocal, row.xHeight, width);
  cache = { key, profile };
  return profile;
}
