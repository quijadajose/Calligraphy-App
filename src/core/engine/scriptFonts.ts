import { COPPERPLATE_SLANT } from '../../data/styles/copperplate';
import { IMPRENTA_SLANT } from '../../data/styles/imprenta';
import { ITALICA_SLANT } from '../../data/styles/italica';
import { LIGADA_SLANT } from '../../data/styles/ligada';

/** Estilos de letra del español (las pestañas Imprenta, Ligada, Itálica y Copperplate). */
export type ScriptStyle = 'Imprenta' | 'Ligada' | 'Itálica' | 'Copperplate';
export const SCRIPT_STYLES: ScriptStyle[] = ['Imprenta', 'Ligada', 'Itálica', 'Copperplate'];

interface ScriptFont {
  family: string;
  weight: number;
  italic: boolean;
  /** Inclinación propia de la fuente (90 = vertical). La hoja corrige solo la diferencia. */
  native: number;
  /** Inclinación del estilo: la de la pauta y la que se califica. */
  slant: number;
  /** Nombre para mostrar. */
  label: string;
}

const FONTS: Record<ScriptStyle, ScriptFont> = {
  Imprenta: { family: 'Andika', weight: 400, italic: false, native: 90, slant: IMPRENTA_SLANT, label: 'Imprenta' },
  Ligada: { family: 'Playwrite ES', weight: 400, italic: false, native: 78, slant: LIGADA_SLANT, label: 'Ligada' },
  Itálica: { family: 'Cormorant Garamond', weight: 600, italic: true, native: 78, slant: ITALICA_SLANT, label: 'Itálica' },
  Copperplate: { family: 'Pinyon Script', weight: 400, italic: false, native: 60, slant: COPPERPLATE_SLANT, label: 'Copperplate' }
};

let current: ScriptStyle = 'Imprenta';

/** La letra de las hojas de texto (planas, palabras, oraciones y dictado). */
export function setSheetScript(style: ScriptStyle): boolean {
  const changed = style !== current;
  current = style;
  return changed;
}

export function sheetScript(): ScriptStyle {
  return current;
}

export function scriptSlantFor(style: ScriptStyle): number {
  return FONTS[style].slant;
}

/** Valor de `font` del canvas para la letra actual. */
export function sheetFontSpec(size: number): string {
  const font = FONTS[current];
  return `${font.italic ? 'italic ' : ''}${font.weight} ${Math.max(12, size)}px "${font.family}", cursive`;
}

/** Inclinación propia de la fuente actual, para corregir solo lo que falta. */
export function sheetFontNativeSlant(): number {
  return FONTS[current].native;
}

export function isScriptStyle(value: unknown): value is ScriptStyle {
  return SCRIPT_STYLES.includes(value as ScriptStyle);
}
