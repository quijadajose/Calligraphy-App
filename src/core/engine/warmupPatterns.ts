import { Point2, WarmupPattern } from '../../types/ink';
import { PalmerRow, slantOffset } from './gridMetrics';

/**
 * Ejercicios de soltura: filas continuas de lazos, arcos, guirnaldas… como en los
 * cuadernos de caligrafía. Cada patrón se describe en unidades de la altura de x
 * (dy hacia arriba desde la base) y se repite hasta llenar el renglón.
 */

type Local = { dx: number; dy: number };
/** Genera puntos locales de un ciclo a partir de `x0` (en unidades de x). Devuelve el x final. */
type Cycle = (x0: number, out: Local[]) => number;

const STEPS = 28;

/** Lazo de cursiva: sube, cierra arriba retrocediendo y baja (e con H = 1, l con H = 2). */
function loop(height: number, advance: number, swing: number): Cycle {
  return (x0, out) => {
    for (let i = 0; i <= STEPS; i++) {
      const t = (i / STEPS) * Math.PI * 2;
      out.push({ dx: x0 + (advance / (Math.PI * 2)) * t + swing * Math.sin(t), dy: height * (0.5 - 0.5 * Math.cos(t)) });
    }
    return x0 + advance;
  };
}

function curve(width: number, dy: (s: number) => number): Cycle {
  return (x0, out) => {
    for (let i = 0; i <= STEPS; i++) {
      const s = i / STEPS;
      out.push({ dx: x0 + width * s, dy: dy(s) });
    }
    return x0 + width;
  };
}

/** Arco con hombros redondos y lados casi rectos (0 en los extremos, 1 al centro). */
function arch(s: number): number {
  const p = 2.6;
  return Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * s - 1), p)), 1 / p);
}

const E = loop(1, 1.0, 0.45);
const L = loop(2, 1.15, 0.38);

const PATTERNS: Record<WarmupPattern, Cycle[]> = {
  'lazos-e': [E],
  'lazos-l': [L],
  'e-e-l': [E, E, L],
  espiral: [loop(1.7, 0.55, 0.62)],
  // Media superelipse: lados rectos que, ya inclinados, corren paralelos a la pauta, como en n y u.
  arcos: [curve(1.2, (s) => arch(s))],
  guirnaldas: [curve(1.2, (s) => 1 - arch(s))],
  zigzag: [curve(0.7, (s) => (s < 0.5 ? s * 2 : 2 - s * 2))],
  ondas: [curve(1.6, (s) => 0.5 + 0.5 * Math.sin(Math.PI * 2 * s))]
};

/** Margen izquierdo de la fila, igual que el texto de las planas. */
const START_X = 100;

/** El patrón como un solo trazo continuo, en píxeles, para una fila de la hoja. */
export function warmupStroke(pattern: WarmupPattern, row: PalmerRow, width: number): Point2[] {
  const unit = row.xHeight;
  const limit = (width - START_X - 24) / unit;
  const cycles = PATTERNS[pattern];
  const local: Local[] = [];
  let x = 0;
  for (let i = 0; i < 400; i++) {
    const cycle = cycles[i % cycles.length];
    const probe: Local[] = [];
    const next = cycle(x, probe);
    if (Math.max(...probe.map((p) => p.dx)) > limit) break;
    // Sin repetir el punto de unión entre ciclos.
    local.push(...(local.length > 0 ? probe.slice(1) : probe));
    x = next;
  }
  return local.map(({ dx, dy }) => ({
    x: START_X + dx * unit + slantOffset(dy * unit),
    y: row.baseY - dy * unit
  }));
}

export const WARMUP_PATTERNS = Object.keys(PATTERNS) as WarmupPattern[];
