import { Lesson, LessonStep, Point2 } from '../../types/ink';
import { ASC, BASE, DESC, WAIST, XM } from '../palmer/paths';

/**
 * Herramientas comunes para dibujar los estilos de letra.
 *
 * Coordenadas de pauta: y = 0 ascendente, 1 descendente (ASC, WAIST, BASE, DESC);
 * x de la casilla (una unidad de x mide ~0,75 de una de y). Las letras se dibujan
 * rectas y el estilo las inclina al mostrarlas (`slant`).
 */

export { ASC, BASE, DESC, WAIST, XM };
export type Part = { name: string; points: Point2[] };
export type Letters = Record<string, Part[]>;

/** Altura del cuerpo de la minúscula. */
export const XH = BASE - WAIST;
/** Altura de la mayúscula. */
export const CAP = BASE - ASC;

/**
 * Curva suave (Catmull-Rom) que pasa por los puntos dados [x0, y0, x1, y1…].
 * Un punto repetido dos veces seguidas hace una esquina.
 */
export function curve(coords: number[], samples = 7): Point2[] {
  const p: Point2[] = [];
  for (let i = 0; i < coords.length; i += 2) p.push({ x: coords[i], y: coords[i + 1] });
  if (p.length < 3) return p;
  const out: Point2[] = [p[0]];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    if (p1.x === p2.x && p1.y === p2.y) continue;
    for (let s = 1; s <= samples; s++) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  return out;
}

/** Une tramos en un solo trazo (sin levantar la pluma). */
export function join(...pieces: Point2[][]): Point2[] {
  const out: Point2[] = [];
  for (const piece of pieces) {
    for (const point of piece) {
      const last = out[out.length - 1];
      if (last && Math.abs(last.x - point.x) < 1e-6 && Math.abs(last.y - point.y) < 1e-6) continue;
      out.push(point);
    }
  }
  return out;
}

export function line(coords: number[]): Point2[] {
  const out: Point2[] = [];
  for (let i = 0; i < coords.length; i += 2) out.push({ x: coords[i], y: coords[i + 1] });
  return out;
}

export function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 14): Point2[] {
  const out: Point2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps;
    out.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry });
  }
  return out;
}

export function dotAt(cx: number, cy: number, r = 0.03): Point2[] {
  return arc(cx, cy, r * 1.33, r, 0, Math.PI * 2, 8);
}

export interface StyleSpec {
  /** Prefijo de los id: imprenta, ligada… */
  id: string;
  /** Nombre del grupo (pestaña). */
  group: string;
  /** Inclinación en grados (90 = vertical). */
  slant: number;
  tool: Lesson['recommendedTool'];
  lowerNote: string;
  upperNote: string;
  intro: (char: string) => string;
}

export function styleLessons(spec: StyleSpec, lower: Letters, upper: Letters): Lesson[] {
  const build = (chars: Letters, capital: boolean): Lesson[] =>
    Object.entries(chars).map(([char, parts]) => {
      const zone = capital ? spec.upperNote : spec.lowerNote;
      const steps: LessonStep[] = parts.map((part, index) => ({
        title: part.name,
        hint: `Paso ${index + 1} de ${parts.length}: ${part.name}. El trazo oscuro es este paso y los claros ya están hechos. ${zone}`,
        strokes: parts.slice(0, index + 1).map((item) => ({ points: item.points })),
        mode: 'sequence'
      }));
      const last = steps[steps.length - 1];
      return {
        id: `${spec.id}-${capital ? 'mayus' : 'minus'}-${char}`,
        category: 'palmer' as const,
        group: spec.group,
        title: char,
        subTitle: `${spec.group} ${capital ? 'mayúscula' : 'minúscula'}`,
        instructions: spec.intro(char),
        characterOrWord: char,
        recommendedTool: spec.tool,
        suggestedGrid: 'palmer' as const,
        idealStrokes: last.strokes,
        idealMode: 'sequence' as const,
        strokesExpected: parts.length,
        steps,
        slant: spec.slant,
        upright: spec.slant >= 89.9
      };
    });
  return [...build(lower, false), ...build(upper, true)];
}
