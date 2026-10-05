import { scriptSlant } from './gridMetrics';
import { sheetFontNativeSlant, sheetFontSpec } from './scriptFonts';

/** Margen izquierdo de la oración punteada: deja sitio a la etiqueta de la línea. */
export const SHEET_TEXT_X = 100;
const SHEET_MARGIN = 118;

export function sentenceFont(size: number): string {
  return sheetFontSpec(size);
}

/** Cizalla que lleva el texto modelo a la inclinación del estilo (la fuente ya trae la suya). */
export function sentenceSkew(): number {
  const cot = (deg: number) => (deg >= 89.9 ? 0 : 1 / Math.tan((deg * Math.PI) / 180));
  return -(cot(scriptSlant()) - cot(sheetFontNativeSlant()));
}

/** Para saber si la fuente de la hoja ya cargó (y cargarla). */
export function sentenceFontProbe(): string {
  return sheetFontSpec(16);
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
    ctx.font = sheetFontSpec(px);
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
