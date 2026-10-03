import { PALMER_SLANT_DEG } from './gridMetrics';

/** Margen izquierdo de la oración punteada: deja sitio a la etiqueta de la línea. */
export const SHEET_TEXT_X = 100;
const SHEET_MARGIN = 118;

export function sentenceFont(size: number): string {
  return `600 ${Math.max(12, size)}px Caveat, cursive`;
}

/** Cizalla que inclina el texto modelo a los 52° de Palmer. */
export function sentenceSkew(): number {
  return -1 / Math.tan((PALMER_SLANT_DEG * Math.PI) / 180);
}

/**
 * Tamaño de fuente con el que la x del texto mide la x de la pauta,
 * encogido si hace falta para que la oración quepa en la línea.
 */
export function sentenceFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  xHeight: number,
  canvasWidth: number
): number {
  const fit = (px: number): { ascent: number; width: number } => {
    ctx.font = `600 ${px}px Caveat, cursive`;
    const sample = ctx.measureText('x');
    return { ascent: sample.actualBoundingBoxAscent || px * 0.46, width: ctx.measureText(text).width };
  };
  let size = 80;
  let measured = fit(size);
  if (measured.ascent > 0) size *= (xHeight * 0.9) / measured.ascent;
  measured = fit(size);
  const maxWidth = Math.max(40, canvasWidth - SHEET_MARGIN);
  if (measured.width > maxWidth) size *= maxWidth / measured.width;
  return size;
}
