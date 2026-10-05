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

/** Tramos rectos entre puntos [dx, dy] (relativos al inicio del ciclo), con puntos intermedios. */
function poly(width: number, corners: Array<[number, number]>): Cycle {
  return (x0, out) => {
    for (let i = 0; i < corners.length - 1; i++) {
      const [ax, ay] = corners[i];
      const [bx, by] = corners[i + 1];
      for (let k = i === 0 ? 0 : 1; k <= 8; k++) {
        const t = k / 8;
        out.push({ dx: x0 + ax + (bx - ax) * t, dy: ay + (by - ay) * t });
      }
    }
    return x0 + width;
  };
}

/**
 * Ocho acostado (∞): una vuelta completa y media más hasta la punta derecha,
 * donde empieza el siguiente. Lemniscata de Gerono: x = 1 − cos t, y = sen 2t.
 */
function eight(half: number): Cycle {
  return (x0, out) => {
    const end = Math.PI * 3;
    const steps = STEPS * 3;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * end;
      out.push({ dx: x0 + half * (1 - Math.cos(t)), dy: 0.5 + 0.45 * Math.sin(2 * t) });
    }
    return x0 + half * 2;
  };
}

/** Profundidad del descendente en unidades de x (la pauta: 0,30 contra 0,35 de la x). */
const DESC = 0.3 / 0.35;

const E = loop(1, 1.0, 0.45);
const L = loop(2, 1.15, 0.38);
/** Lazo hacia abajo, como el de la g y la j: cierra en el descendente. */
const G = loop(-DESC, 1.0, 0.36);

const PATTERNS: Record<WarmupPattern, Cycle[]> = {
  'lazos-e': [E],
  'lazos-l': [L],
  'e-e-l': [E, E, L],
  espiral: [loop(1.7, 0.55, 0.62)],
  // Media superelipse: lados rectos que, ya inclinados, corren paralelos a la pauta, como en n y u.
  arcos: [curve(1.2, (s) => arch(s))],
  guirnaldas: [curve(1.2, (s) => 1 - arch(s))],
  zigzag: [curve(0.7, (s) => (s < 0.5 ? s * 2 : 2 - s * 2))],
  ondas: [curve(1.6, (s) => 0.5 + 0.5 * Math.sin(Math.PI * 2 * s))],
  // Rectos: verticales y horizontales (almenas) y oblicuos con vuelta recta (sierra).
  almenas: [poly(1.4, [[0, 0], [0, 1], [0.7, 1], [0.7, 0], [1.4, 0]])],
  sierra: [poly(0.9, [[0, 0], [0.9, 1], [0.9, 0]])],
  // Ola del alto del ascendente: el brazo recorre más.
  'olas-altas': [curve(2.6, (s) => 1 - Math.cos(Math.PI * 2 * s))],
  // Puente y copa alternados: n seguida de u, como en «mu», «nu».
  'puente-copa': [curve(1.2, (s) => arch(s)), curve(1.2, (s) => 1 - arch(s))],
  'bucles-bajos': [G],
  // Arriba y abajo sin cortar: la l y la g en un mismo movimiento.
  'bucles-mixtos': [L, G],
  ochos: [eight(0.95)]
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
