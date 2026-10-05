import { PALMER_ASCENDER_RATIO, PALMER_XHEIGHT_RATIO } from '../core/engine/gridMetrics';
import { Point2 } from '../types/ink';

const BASE_Y = PALMER_ASCENDER_RATIO + PALMER_XHEIGHT_RATIO;
/** Misma proporción que en la hoja: una unidad de x mide 0,58 × 3,7 alturas de x. */
const X_ASPECT = 0.58 * 3.7 * PALMER_XHEIGHT_RATIO;

/**
 * Dibuja una letra de estilo con sus propios trazos, inclinada, para las fichas del
 * catálogo. La altura va del ascendente al descendente, así todas comparten la base.
 */
export function letterSvg(strokes: Point2[][], slant: number, height = 52): string {
  const lean = slant >= 89.9 ? 0 : 1 / Math.tan((slant * Math.PI) / 180);
  const mapped = strokes.map((stroke) => stroke.map((p) => ({ x: p.x * X_ASPECT + (BASE_Y - p.y) * lean, y: p.y })));
  let minX = Infinity;
  let maxX = -Infinity;
  for (const stroke of mapped) for (const p of stroke) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  const pad = 0.06;
  const top = -0.06;
  const bottom = 1.02;
  const width = Math.max(0.2, maxX - minX) + pad * 2;
  const paths = mapped
    .map((stroke) => `<polyline points="${stroke.map((p) => `${(p.x - minX + pad).toFixed(3)},${p.y.toFixed(3)}`).join(' ')}"/>`)
    .join('');
  const w = Math.round((width / (bottom - top)) * height);
  return `<svg class="letter-svg" width="${w}" height="${height}" viewBox="0 ${top} ${width.toFixed(3)} ${bottom - top}" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="0.045" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}
