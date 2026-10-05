import { Point2 } from '../../types/ink';

export const PALMER_ASCENDER_RATIO = 0.35;
export const PALMER_XHEIGHT_RATIO = 0.35;
export const PALMER_DESCENDER_RATIO = 0.30;
/** Inclinación por defecto de la cursiva (ligada): ejercicios, planas, palabras y oraciones. */
export const CURSIVE_SLANT_DEG = 70;
/** Grosor del modelo, como fracción de la altura de x. El óvalo se ajusta para que el borde caiga en la pauta. */
export const PALMER_PEN_RATIO = 0.18;

/**
 * Inclinación del estilo que se está practicando (90° = vertical, como la imprenta).
 * La fija el estudio al abrir cada lección; la usan el modelo, la pauta y la calificación.
 */
let scriptSlantDeg = CURSIVE_SLANT_DEG;

export function setScriptSlant(deg: number): boolean {
  const changed = deg !== scriptSlantDeg;
  scriptSlantDeg = deg;
  return changed;
}

export function scriptSlant(): number {
  return scriptSlantDeg;
}

/** Desplazamiento horizontal de un punto a la altura `dy` sobre la base, según la inclinación. */
export function slantOffset(dy: number): number {
  return scriptSlantDeg >= 89.9 ? 0 : dy / Math.tan((scriptSlantDeg * Math.PI) / 180);
}

/** Hueco que se deja arriba para el aviso flotante y abajo como margen de la hoja. */
let practiceChrome = { top: 56, bottom: 20 };

export function setPracticeChrome(top: number, bottom: number): boolean {
  const next = {
    top: Math.max(16, Math.round(top)),
    bottom: Math.max(24, Math.round(bottom))
  };
  const changed = next.top !== practiceChrome.top || next.bottom !== practiceChrome.bottom;
  practiceChrome = next;
  return changed;
}

/** El pautado vive en el hueco libre y queda centrado entre la ficha y los botones. */
export function palmerFrame(canvasHeight: number): { rows: number; rowHeight: number; topOffset: number } {
  const top = practiceChrome.top;
  const bottom = practiceChrome.bottom;
  const usable = Math.max(220, canvasHeight - top - bottom);
  const rows = usable >= 560 ? 2 : 1;
  return { rows, rowHeight: usable / rows, topOffset: top };
}

export interface PalmerRow {
  ascenderY: number;
  waistY: number;
  baseY: number;
  descenderY: number;
  xHeight: number;
}

export function palmerRowCount(height: number): number {
  return palmerFrame(height).rows;
}

/** Varias líneas bajo la ficha: la primera con guía y el resto en blanco. */
export function sentenceFrame(canvasHeight: number): { rows: number; rowHeight: number; topOffset: number } {
  const topOffset = practiceChrome.top;
  const usable = Math.max(220, canvasHeight - topOffset - practiceChrome.bottom);
  const rows = Math.max(2, Math.min(4, Math.floor(usable / 132)));
  return { rows, rowHeight: usable / rows, topOffset };
}

export function sentenceRowGeometry(rowIndex: number, canvasHeight: number): PalmerRow {
  const { rowHeight, topOffset, rows } = sentenceFrame(canvasHeight);
  const index = Math.max(0, Math.min(rows - 1, rowIndex));
  const topY = index * rowHeight + topOffset;
  const ascenderY = topY;
  const waistY = topY + rowHeight * PALMER_ASCENDER_RATIO;
  const baseY = waistY + rowHeight * PALMER_XHEIGHT_RATIO;
  const descenderY = baseY + rowHeight * PALMER_DESCENDER_RATIO;
  return { ascenderY, waistY, baseY, descenderY, xHeight: baseY - waistY };
}

export function palmerRowGeometry(rowIndex: number, canvasHeight = 800): PalmerRow {
  const { rowHeight, topOffset } = palmerFrame(canvasHeight);
  const topY = rowIndex * rowHeight + topOffset;
  const ascenderY = topY;
  const waistY = topY + rowHeight * PALMER_ASCENDER_RATIO;
  const baseY = waistY + rowHeight * PALMER_XHEIGHT_RATIO;
  const descenderY = baseY + rowHeight * PALMER_DESCENDER_RATIO;
  return { ascenderY, waistY, baseY, descenderY, xHeight: baseY - waistY };
}

export function palmerCellWidth(row: PalmerRow): number {
  return Math.max(156, row.xHeight * 3.7);
}

/**
 * y=0 es el ascendente y y=1 el descendente. La x vive entre 0.35 y 0.70.
 * La x de la letra ocupa la izquierda de la casilla para que la inclinación
 * de 52° no invada el modelo siguiente.
 */
export function mapPalmerPoint(point: Point2, originX: number, row: PalmerRow): Point2 {
  const span = row.descenderY - row.ascenderY;
  const y = row.ascenderY + point.y * span;
  const lean = slantOffset(row.baseY - y);
  const glyphX = 0.08 + point.x * 0.58;
  return {
    x: originX + glyphX * palmerCellWidth(row) + lean,
    y
  };
}

export function palmerRowAt(y: number, height: number): PalmerRow {
  const { rows, rowHeight, topOffset } = palmerFrame(height);
  const raw = Math.floor((y - topOffset) / rowHeight);
  const index = Math.max(0, Math.min(rows - 1, raw));
  return palmerRowGeometry(index, height);
}

export interface GuideBox {
  x: number;
  y: number;
  size: number;
}

export interface GenkouLayout {
  boxes: GuideBox[];
  boxSize: number;
  cols: number;
  rows: number;
}

export function genkouyoushiLayout(width: number, height: number): GenkouLayout {
  const top = practiceChrome.top;
  const usableH = Math.max(180, height - top - practiceChrome.bottom);
  const boxSize = Math.min(200, Math.floor(Math.min(width, usableH) * 0.34));
  const gap = 16;
  const cols = Math.max(1, Math.floor((width - gap) / (boxSize + gap)));
  const rows = Math.max(1, Math.floor((usableH - gap) / (boxSize + gap)));
  const gridW = cols * (boxSize + gap) - gap;
  const gridH = rows * (boxSize + gap) - gap;
  const offsetX = (width - gridW) / 2;
  const offsetY = top + (usableH - gridH) / 2;
  const boxes: GuideBox[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      boxes.push({
        x: offsetX + c * (boxSize + gap),
        y: offsetY + r * (boxSize + gap),
        size: boxSize
      });
    }
  }

  return { boxes, boxSize, cols, rows };
}

/** El primer cuadrado, arriba a la izquierda, es el ejemplo. El resto se copia. */
export function exampleBox(layout: GenkouLayout): GuideBox {
  return layout.boxes[0] ?? { x: 0, y: practiceChrome.top, size: layout.boxSize };
}

export function dominantBox(points: Point2[], layout: GenkouLayout): GuideBox | null {
  if (layout.boxes.length === 0 || points.length === 0) return null;
  const counts = layout.boxes.map(() => 0);
  for (const point of points) {
    const index = layout.boxes.findIndex(
      (box) =>
        point.x >= box.x &&
        point.x <= box.x + box.size &&
        point.y >= box.y &&
        point.y <= box.y + box.size
    );
    if (index >= 0) counts[index] += 1;
  }
  let best = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > counts[best]) best = i;
  }
  return counts[best] > 0 ? layout.boxes[best] : null;
}

export function sentenceRowIndexAt(y: number, height: number): number {
  const { rows, rowHeight, topOffset } = sentenceFrame(height);
  return Math.max(0, Math.min(rows - 1, Math.floor((y - topOffset) / rowHeight)));
}

/** Índice del cuadro donde cae la mayor parte del trazo; si no toca ninguno, el más cercano. */
export function boxIndexFor(points: Point2[], layout: GenkouLayout): number {
  if (layout.boxes.length === 0 || points.length === 0) return -1;
  const box = dominantBox(points, layout);
  if (box) return layout.boxes.indexOf(box);
  let cx = 0;
  let cy = 0;
  for (const point of points) {
    cx += point.x;
    cy += point.y;
  }
  cx /= points.length;
  cy /= points.length;
  let best = 0;
  let bestDist = Infinity;
  layout.boxes.forEach((candidate, index) => {
    const dist = Math.hypot(candidate.x + candidate.size / 2 - cx, candidate.y + candidate.size / 2 - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  return best;
}
