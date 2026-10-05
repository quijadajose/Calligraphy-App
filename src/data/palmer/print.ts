import { Lesson, LessonStep, Point2 } from '../../types/ink';
import { ASC, BASE, DESC, WAIST, XM, XR, dot, ellipse, pts } from './paths';

/**
 * Letra de imprenta (manuscrita escolar): vertical, cada letra separada, y el orden de
 * trazos de cuaderno: los círculos en sentido antihorario empezando arriba a la derecha,
 * los palotes de arriba abajo y las barras de izquierda a derecha.
 *
 * Coordenadas como en Palmer (x de la casilla, y de la pauta: 0 ascendente, 1 descendente).
 * Una unidad de x mide ~0,75 de una de y, así que un círculo lleva rx = ry × 1,33.
 */

type Part = { name: string; points: Point2[] };

const ROUND = 1.33;
/** Radio horizontal del cuerpo redondo de la minúscula. */
const R = XR * ROUND;
const TOP = -Math.PI / 2;
const TAU = Math.PI * 2;

/** Círculo en sentido antihorario (en pantalla) desde el ángulo `from`. */
function ccw(cx: number, cy: number, rx: number, ry: number, from: number, sweep = TAU): Point2[] {
  return ellipse(cx, cy, rx, ry, from, from - sweep, 24);
}

/** Círculo en sentido horario desde el ángulo `from`. */
function cw(cx: number, cy: number, rx: number, ry: number, from: number, sweep = TAU): Point2[] {
  return ellipse(cx, cy, rx, ry, from, from + sweep, 24);
}

/** Arco de n, m, h, r: sube por el palote, dobla arriba y baja a la base. */
function arch(x0: number, x1: number, down = true): Point2[] {
  const r = (x1 - x0) / 2;
  const cx = x0 + r;
  const ry = (XM - WAIST) * 1.1;
  const top = ellipse(cx, XM, r, ry, Math.PI, TAU, 12);
  return down ? [...top, { x: x1, y: BASE }] : top;
}

const ONE_O_CLOCK = -Math.PI / 3;

const lower: Record<string, Part[]> = {
  a: [
    { name: 'Círculo', points: ccw(0.42, XM, R, XR, ONE_O_CLOCK) },
    { name: 'Palote', points: pts([0.42 + R, WAIST, 0.42 + R, BASE]) }
  ],
  b: [
    { name: 'Palote alto', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Panza', points: cw(0.3 + R, XM, R, XR, Math.PI) }
  ],
  c: [{ name: 'Curva', points: ccw(0.48, XM, R, XR, ONE_O_CLOCK, TAU - 1.6) }],
  d: [
    { name: 'Círculo', points: ccw(0.42, XM, R, XR, ONE_O_CLOCK) },
    { name: 'Palote alto', points: pts([0.42 + R, ASC, 0.42 + R, BASE]) }
  ],
  e: [
    { name: 'Barra', points: pts([0.48 - R, XM, 0.48 + R, XM]) },
    { name: 'Curva', points: ccw(0.48, XM, R, XR, 0, TAU - 0.9) }
  ],
  f: [
    { name: 'Gancho y palote', points: [...ellipse(0.5, ASC + 0.07, 0.11, 0.06, -0.3, -Math.PI, 10), { x: 0.39, y: BASE }] },
    { name: 'Barra', points: pts([0.26, WAIST, 0.56, WAIST]) }
  ],
  g: [
    { name: 'Círculo', points: ccw(0.42, XM, R, XR, ONE_O_CLOCK) },
    { name: 'Cola', points: [{ x: 0.42 + R, y: WAIST }, { x: 0.42 + R, y: DESC - 0.08 }, ...ellipse(0.42, DESC - 0.08, R, 0.07, 0, Math.PI * 0.95, 8)] }
  ],
  h: [
    { name: 'Palote alto', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Arco', points: [{ x: 0.3, y: BASE }, ...arch(0.3, 0.3 + 2 * R)] }
  ],
  i: [
    { name: 'Palote', points: pts([0.48, WAIST, 0.48, BASE]) },
    { name: 'Punto', points: dot(0.48, WAIST - 0.11) }
  ],
  j: [
    { name: 'Palote con gancho', points: [{ x: 0.54, y: WAIST }, { x: 0.54, y: DESC - 0.08 }, ...ellipse(0.42, DESC - 0.08, 0.12, 0.07, 0, Math.PI * 0.95, 8)] },
    { name: 'Punto', points: dot(0.54, WAIST - 0.11) }
  ],
  k: [
    { name: 'Palote alto', points: pts([0.32, ASC, 0.32, BASE]) },
    { name: 'Brazo', points: pts([0.66, WAIST, 0.32, XM + 0.03]) },
    { name: 'Pierna', points: pts([0.42, XM - 0.01, 0.68, BASE]) }
  ],
  l: [{ name: 'Palote alto', points: pts([0.48, ASC, 0.48, BASE]) }],
  m: [
    { name: 'Palote', points: pts([0.2, WAIST, 0.2, BASE]) },
    { name: 'Primer arco', points: [{ x: 0.2, y: BASE }, ...arch(0.2, 0.49)] },
    { name: 'Segundo arco', points: [{ x: 0.49, y: BASE }, ...arch(0.49, 0.78)] }
  ],
  n: [
    { name: 'Palote', points: pts([0.32, WAIST, 0.32, BASE]) },
    { name: 'Arco', points: [{ x: 0.32, y: BASE }, ...arch(0.32, 0.32 + 2 * R)] }
  ],
  o: [{ name: 'Círculo', points: ccw(0.5, XM, R, XR, TOP) }],
  p: [
    { name: 'Palote largo', points: pts([0.32, WAIST, 0.32, DESC]) },
    { name: 'Panza', points: cw(0.32 + R, XM, R, XR, Math.PI) }
  ],
  q: [
    { name: 'Círculo', points: ccw(0.42, XM, R, XR, ONE_O_CLOCK) },
    { name: 'Palote largo', points: pts([0.42 + R, WAIST, 0.42 + R, DESC]) }
  ],
  r: [
    { name: 'Palote', points: pts([0.38, WAIST, 0.38, BASE]) },
    { name: 'Hombro', points: [{ x: 0.38, y: XM + 0.02 }, ...ellipse(0.38 + R * 0.75, XM, R * 0.75, (XM - WAIST) * 1.05, Math.PI, Math.PI * 1.75, 8)] }
  ],
  s: [{
    name: 'Ese',
    points: [
      // Dos medias curvas que se tocan en la línea central del cuerpo.
      ...ellipse(0.5, WAIST + (BASE - WAIST) / 4, R * 0.85, (BASE - WAIST) / 4, -0.4, -Math.PI * 1.5, 12),
      ...ellipse(0.5, BASE - (BASE - WAIST) / 4, R * 0.9, (BASE - WAIST) / 4, -Math.PI / 2, Math.PI * 0.85, 12).slice(1)
    ]
  }],
  t: [
    { name: 'Palote', points: pts([0.46, 0.14, 0.46, BASE]) },
    { name: 'Barra', points: pts([0.3, WAIST, 0.62, WAIST]) }
  ],
  u: [
    { name: 'Copa', points: [{ x: 0.32, y: WAIST }, { x: 0.32, y: XM }, ...ellipse(0.32 + R, XM, R, BASE - XM, Math.PI, 0, 12), { x: 0.32 + 2 * R, y: WAIST }] },
    { name: 'Palote', points: pts([0.32 + 2 * R, WAIST, 0.32 + 2 * R, BASE]) }
  ],
  v: [{ name: 'Uve', points: pts([0.28, WAIST, 0.5, BASE, 0.72, WAIST]) }],
  w: [{ name: 'Doble uve', points: pts([0.14, WAIST, 0.3, BASE, 0.5, WAIST + 0.04, 0.7, BASE, 0.86, WAIST]) }],
  x: [
    { name: 'Diagonal', points: pts([0.3, WAIST, 0.7, BASE]) },
    { name: 'Contradiagonal', points: pts([0.7, WAIST, 0.3, BASE]) }
  ],
  y: [
    { name: 'Diagonal corta', points: pts([0.3, WAIST, 0.5, BASE]) },
    { name: 'Diagonal larga', points: pts([0.7, WAIST, 0.36, DESC]) }
  ],
  z: [{ name: 'Zeta', points: pts([0.3, WAIST, 0.7, WAIST, 0.3, BASE, 0.7, BASE]) }],
  ñ: [
    { name: 'Palote', points: pts([0.32, WAIST, 0.32, BASE]) },
    { name: 'Arco', points: [{ x: 0.32, y: BASE }, ...arch(0.32, 0.32 + 2 * R)] },
    { name: 'Virgulilla', points: pts([0.32, WAIST - 0.08, 0.4, WAIST - 0.12, 0.5, WAIST - 0.08, 0.6, WAIST - 0.12]) }
  ]
};

/** Mayúsculas: de la base al ascendente, sin inclinación. */
const CAP = BASE - ASC;
const CM = ASC + CAP / 2;
const CR = (CAP / 2) * 0.98;

const upper: Record<string, Part[]> = {
  A: [
    { name: 'Diagonal izquierda', points: pts([0.5, ASC, 0.22, BASE]) },
    { name: 'Diagonal derecha', points: pts([0.5, ASC, 0.78, BASE]) },
    { name: 'Barra', points: pts([0.33, CM + 0.08, 0.67, CM + 0.08]) }
  ],
  B: [
    { name: 'Palote', points: pts([0.28, ASC, 0.28, BASE]) },
    { name: 'Panza alta', points: [{ x: 0.28, y: ASC }, ...ellipse(0.46, ASC + CAP / 4, 0.18, CAP / 4, -Math.PI / 2, Math.PI / 2, 12), { x: 0.28, y: CM }] },
    { name: 'Panza baja', points: [{ x: 0.28, y: CM }, ...ellipse(0.48, CM + CAP / 4, 0.2, CAP / 4, -Math.PI / 2, Math.PI / 2, 12), { x: 0.28, y: BASE }] }
  ],
  C: [{ name: 'Curva', points: ccw(0.52, CM, CR * 0.8, CR, ONE_O_CLOCK, TAU - 1.5) }],
  D: [
    { name: 'Palote', points: pts([0.28, ASC, 0.28, BASE]) },
    { name: 'Panza', points: [{ x: 0.28, y: ASC }, ...ellipse(0.38, CM, 0.36, CR, -Math.PI / 2, Math.PI / 2, 16), { x: 0.28, y: BASE }] }
  ],
  E: [
    { name: 'Palote', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Barra alta', points: pts([0.3, ASC, 0.72, ASC]) },
    { name: 'Barra media', points: pts([0.3, CM, 0.64, CM]) },
    { name: 'Barra baja', points: pts([0.3, BASE, 0.72, BASE]) }
  ],
  F: [
    { name: 'Palote', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Barra alta', points: pts([0.3, ASC, 0.72, ASC]) },
    { name: 'Barra media', points: pts([0.3, CM, 0.64, CM]) }
  ],
  G: [
    { name: 'Curva', points: ccw(0.5, CM, CR * 0.8, CR, ONE_O_CLOCK, TAU - 0.9) },
    { name: 'Barra', points: pts([0.52, CM + 0.04, 0.5 + CR * 0.8, CM + 0.04, 0.5 + CR * 0.8, BASE - 0.04]) }
  ],
  H: [
    { name: 'Palote izquierdo', points: pts([0.28, ASC, 0.28, BASE]) },
    { name: 'Palote derecho', points: pts([0.72, ASC, 0.72, BASE]) },
    { name: 'Barra', points: pts([0.28, CM, 0.72, CM]) }
  ],
  I: [
    { name: 'Palote', points: pts([0.5, ASC, 0.5, BASE]) },
    { name: 'Remate alto', points: pts([0.36, ASC, 0.64, ASC]) },
    { name: 'Remate bajo', points: pts([0.36, BASE, 0.64, BASE]) }
  ],
  J: [{ name: 'Palote con gancho', points: [{ x: 0.62, y: ASC }, { x: 0.62, y: BASE - 0.1 }, ...ellipse(0.47, BASE - 0.1, 0.15, 0.1, 0, Math.PI, 10)] }],
  K: [
    { name: 'Palote', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Brazo', points: pts([0.72, ASC, 0.3, CM + 0.04]) },
    { name: 'Pierna', points: pts([0.44, CM - 0.04, 0.74, BASE]) }
  ],
  L: [{ name: 'Palote y base', points: pts([0.32, ASC, 0.32, BASE, 0.72, BASE]) }],
  M: [
    { name: 'Palote izquierdo', points: pts([0.18, BASE, 0.18, ASC]) },
    { name: 'Uve', points: pts([0.18, ASC, 0.5, CM + 0.12, 0.82, ASC]) },
    { name: 'Palote derecho', points: pts([0.82, ASC, 0.82, BASE]) }
  ],
  N: [
    { name: 'Palote izquierdo', points: pts([0.26, BASE, 0.26, ASC]) },
    { name: 'Diagonal', points: pts([0.26, ASC, 0.74, BASE]) },
    { name: 'Palote derecho', points: pts([0.74, BASE, 0.74, ASC]) }
  ],
  O: [{ name: 'Óvalo', points: ccw(0.5, CM, CR * 0.85, CR, TOP) }],
  P: [
    { name: 'Palote', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Panza', points: [{ x: 0.3, y: ASC }, ...ellipse(0.48, ASC + CAP / 4, 0.2, CAP / 4, -Math.PI / 2, Math.PI / 2, 12), { x: 0.3, y: CM }] }
  ],
  Q: [
    { name: 'Óvalo', points: ccw(0.48, CM, CR * 0.85, CR, TOP) },
    { name: 'Cola', points: pts([0.56, CM + 0.12, 0.78, BASE + 0.02]) }
  ],
  R: [
    { name: 'Palote', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Panza', points: [{ x: 0.3, y: ASC }, ...ellipse(0.48, ASC + CAP / 4, 0.2, CAP / 4, -Math.PI / 2, Math.PI / 2, 12), { x: 0.3, y: CM }] },
    { name: 'Pierna', points: pts([0.46, CM, 0.74, BASE]) }
  ],
  S: [{
    name: 'Ese',
    points: [
      ...ellipse(0.5, ASC + CAP / 4, 0.2, CAP / 4, -0.4, -Math.PI * 1.5, 12),
      ...ellipse(0.5, BASE - CAP / 4, 0.22, CAP / 4, -Math.PI / 2, Math.PI * 0.85, 12).slice(1)
    ]
  }],
  T: [
    { name: 'Barra', points: pts([0.22, ASC, 0.78, ASC]) },
    { name: 'Palote', points: pts([0.5, ASC, 0.5, BASE]) }
  ],
  U: [{ name: 'Copa', points: [{ x: 0.26, y: ASC }, { x: 0.26, y: BASE - 0.14 }, ...ellipse(0.5, BASE - 0.14, 0.24, 0.14, Math.PI, 0, 12), { x: 0.74, y: ASC }] }],
  V: [{ name: 'Uve', points: pts([0.2, ASC, 0.5, BASE, 0.8, ASC]) }],
  W: [{ name: 'Doble uve', points: pts([0.1, ASC, 0.28, BASE, 0.5, ASC + 0.12, 0.72, BASE, 0.9, ASC]) }],
  X: [
    { name: 'Diagonal', points: pts([0.24, ASC, 0.76, BASE]) },
    { name: 'Contradiagonal', points: pts([0.76, ASC, 0.24, BASE]) }
  ],
  Y: [
    { name: 'Brazo izquierdo', points: pts([0.22, ASC, 0.5, CM]) },
    { name: 'Brazo derecho y palote', points: pts([0.78, ASC, 0.5, CM, 0.5, BASE]) }
  ],
  Z: [{ name: 'Zeta', points: pts([0.24, ASC, 0.76, ASC, 0.24, BASE, 0.76, BASE]) }],
  Ñ: [
    { name: 'Palote izquierdo', points: pts([0.26, BASE, 0.26, ASC + 0.06]) },
    { name: 'Diagonal', points: pts([0.26, ASC + 0.06, 0.74, BASE]) },
    { name: 'Palote derecho', points: pts([0.74, BASE, 0.74, ASC + 0.06]) },
    { name: 'Virgulilla', points: pts([0.34, ASC - 0.02, 0.44, ASC - 0.05, 0.56, ASC - 0.01, 0.66, ASC - 0.04]) }
  ]
};

function printLessons(chars: Record<string, Part[]>, capital: boolean): Lesson[] {
  const zone = capital
    ? 'La mayúscula va de la base al ascendente, recta.'
    : 'El cuerpo de la minúscula queda entre la línea media y la base, recto.';
  return Object.entries(chars).map(([char, parts]) => {
    const steps: LessonStep[] = parts.map((part, index) => ({
      title: part.name,
      hint: `Paso ${index + 1} de ${parts.length}: ${part.name}. El trazo oscuro es este paso y los claros ya están hechos. ${zone}`,
      strokes: parts.slice(0, index + 1).map((item) => ({ points: item.points })),
      mode: 'sequence'
    }));
    const last = steps[steps.length - 1];
    return {
      id: `imprenta-${capital ? 'mayus' : 'minus'}-${char}`,
      category: 'palmer' as const,
      group: 'Imprenta',
      title: char,
      subTitle: capital ? 'Imprenta mayúscula' : 'Imprenta minúscula',
      instructions: `«${char}» de imprenta: recta, sin inclinar. Las primeras casillas muestran cada trazo en orden; el resto es para copiarlo.`,
      characterOrWord: char,
      recommendedTool: 'pencil' as const,
      suggestedGrid: 'palmer' as const,
      idealStrokes: last.strokes,
      idealMode: 'sequence' as const,
      strokesExpected: parts.length,
      steps,
      upright: true
    };
  });
}

export const PRINT_LESSONS: Lesson[] = [...printLessons(lower, false), ...printLessons(upper, true)];
