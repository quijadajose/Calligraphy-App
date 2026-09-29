import { Lesson, LessonStep, Point2 } from '../../types/ink';
import { ASC, BASE, DESC, WAIST, XM, XR, bodyOval, dot, ellipse, pts } from './paths';

type Part = { name: string; points: Point2[] };

const lower: Record<string, Part[]> = {
  a: [
    { name: 'Óvalo', points: bodyOval(0.4) },
    { name: 'Palote', points: pts([0.58, WAIST + 0.02, 0.58, BASE]) }
  ],
  b: [
    { name: 'Ascendente', points: pts([0.32, ASC, 0.32, BASE]) },
    { name: 'Óvalo', points: bodyOval(0.5) }
  ],
  c: [{ name: 'Apertura', points: ellipse(0.5, XM, 0.2, XR, 0.65, 5.45) }],
  d: [
    { name: 'Óvalo', points: bodyOval(0.4) },
    { name: 'Ascendente', points: pts([0.58, ASC, 0.58, BASE]) }
  ],
  e: [
    { name: 'Barra', points: pts([0.64, XM, 0.32, XM]) },
    { name: 'Óvalo', points: ellipse(0.48, XM, 0.18, XR, Math.PI, Math.PI * 2.75) }
  ],
  f: [
    { name: 'Tallo', points: pts([0.62, WAIST - 0.06, 0.48, ASC, 0.4, WAIST - 0.02, 0.4, DESC]) },
    { name: 'Cruce', points: pts([0.26, WAIST, 0.62, WAIST]) }
  ],
  g: [
    { name: 'Óvalo', points: bodyOval(0.42) },
    { name: 'Descendiente', points: pts([0.6, XM, 0.6, DESC, 0.38, DESC]) }
  ],
  h: [
    { name: 'Ascendente', points: pts([0.32, ASC, 0.32, BASE]) },
    { name: 'Arco', points: pts([0.32, XM, 0.48, WAIST + 0.02, 0.64, XM, 0.64, BASE]) }
  ],
  i: [
    { name: 'Palote', points: pts([0.48, WAIST + 0.02, 0.48, BASE]) },
    { name: 'Punto', points: dot(0.48, 0.2) }
  ],
  j: [
    { name: 'Punto', points: dot(0.52, 0.2) },
    { name: 'Descendiente', points: pts([0.52, WAIST + 0.02, 0.52, DESC, 0.32, DESC]) }
  ],
  k: [
    { name: 'Ascendente', points: pts([0.32, ASC, 0.32, BASE]) },
    { name: 'Brazo de entrada', points: pts([0.66, WAIST + 0.02, 0.32, XM]) },
    { name: 'Brazo de salida', points: pts([0.42, XM, 0.68, BASE]) }
  ],
  l: [{ name: 'Bucle', points: pts([0.46, ASC, 0.46, BASE - 0.02, 0.64, BASE]) }],
  m: [
    { name: 'Palote', points: pts([0.22, WAIST + 0.04, 0.22, BASE]) },
    { name: 'Primer arco', points: pts([0.22, XM, 0.36, WAIST + 0.02, 0.48, XM, 0.48, BASE]) },
    { name: 'Segundo arco', points: pts([0.48, XM, 0.62, WAIST + 0.02, 0.76, XM, 0.76, BASE]) }
  ],
  n: [
    { name: 'Palote', points: pts([0.32, WAIST + 0.04, 0.32, BASE]) },
    { name: 'Arco', points: pts([0.32, XM, 0.5, WAIST + 0.02, 0.66, XM, 0.66, BASE]) }
  ],
  o: [{ name: 'Óvalo', points: bodyOval(0.5, 0.2) }],
  p: [
    { name: 'Descendiente', points: pts([0.34, WAIST + 0.02, 0.34, DESC]) },
    { name: 'Óvalo', points: bodyOval(0.52) }
  ],
  q: [
    { name: 'Óvalo', points: bodyOval(0.4) },
    { name: 'Descendiente', points: pts([0.58, WAIST + 0.02, 0.58, DESC]) }
  ],
  r: [
    { name: 'Palote', points: pts([0.36, WAIST + 0.04, 0.36, BASE]) },
    { name: 'Bandera', points: pts([0.36, XM, 0.54, WAIST + 0.03, 0.68, XM]) }
  ],
  s: [{ name: 'Curva', points: pts([0.66, WAIST + 0.04, 0.4, WAIST + 0.02, 0.32, XM, 0.62, XM + 0.04, 0.5, BASE, 0.3, BASE - 0.02]) }],
  t: [
    { name: 'Tallo', points: pts([0.48, 0.18, 0.48, BASE - 0.02, 0.64, BASE]) },
    { name: 'Cruce', points: pts([0.3, WAIST, 0.66, WAIST]) }
  ],
  u: [
    { name: 'Onda', points: pts([0.3, WAIST + 0.02, 0.3, XM + 0.04, 0.48, BASE, 0.66, XM + 0.04, 0.66, WAIST + 0.02]) },
    { name: 'Palote', points: pts([0.66, XM, 0.66, BASE]) }
  ],
  v: [{ name: 'Ángulo', points: pts([0.28, WAIST + 0.02, 0.5, BASE, 0.72, WAIST + 0.02]) }],
  w: [{ name: 'Doble ángulo', points: pts([0.16, WAIST + 0.02, 0.32, BASE, 0.5, XM, 0.68, BASE, 0.84, WAIST + 0.02]) }],
  x: [
    { name: 'Diagonal', points: pts([0.3, WAIST + 0.02, 0.7, BASE]) },
    { name: 'Cruce', points: pts([0.7, WAIST + 0.02, 0.3, BASE]) }
  ],
  y: [
    { name: 'Entrada', points: pts([0.3, WAIST + 0.02, 0.48, XM + 0.06]) },
    { name: 'Descendiente', points: pts([0.68, WAIST + 0.02, 0.42, DESC]) }
  ],
  z: [{ name: 'Tres trazos', points: pts([0.3, WAIST + 0.03, 0.7, WAIST + 0.03, 0.32, BASE, 0.72, BASE]) }]
};

const upper: Record<string, Part[]> = {
  A: [
    { name: 'Pierna izquierda', points: pts([0.5, ASC, 0.22, BASE]) },
    { name: 'Pierna derecha', points: pts([0.5, ASC, 0.78, BASE]) },
    { name: 'Barra', points: pts([0.34, XM, 0.66, XM]) }
  ],
  B: [
    { name: 'Tallo', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Copa superior', points: ellipse(0.48, 0.28, 0.16, 0.14, -1.2, 1.4) },
    { name: 'Copa inferior', points: ellipse(0.5, 0.56, 0.18, 0.14, -1.2, 1.5) }
  ],
  C: [{ name: 'Curva', points: ellipse(0.52, 0.36, 0.24, 0.3, 0.7, 5.6) }],
  D: [
    { name: 'Tallo', points: pts([0.28, ASC, 0.28, BASE]) },
    { name: 'Panza', points: ellipse(0.42, 0.36, 0.26, 0.3, -1.3, 1.3) }
  ],
  E: [
    { name: 'Lomo', points: pts([0.72, ASC, 0.3, ASC, 0.3, BASE, 0.72, BASE]) },
    { name: 'Barra', points: pts([0.3, 0.36, 0.6, 0.36]) }
  ],
  F: [
    { name: 'Lomo', points: pts([0.72, ASC, 0.3, ASC, 0.3, BASE]) },
    { name: 'Barra', points: pts([0.3, 0.36, 0.6, 0.36]) }
  ],
  G: [
    { name: 'Curva', points: ellipse(0.48, 0.36, 0.26, 0.3, 0.5, 5.8) },
    { name: 'Barra', points: pts([0.5, 0.36, 0.74, 0.36]) }
  ],
  H: [
    { name: 'Pierna izquierda', points: pts([0.28, ASC, 0.28, BASE]) },
    { name: 'Pierna derecha', points: pts([0.72, ASC, 0.72, BASE]) },
    { name: 'Barra', points: pts([0.28, 0.36, 0.72, 0.36]) }
  ],
  I: [
    { name: 'Tallo', points: pts([0.5, ASC, 0.5, BASE]) },
    { name: 'Remate alto', points: pts([0.34, ASC, 0.66, ASC]) },
    { name: 'Remate bajo', points: pts([0.34, BASE, 0.66, BASE]) }
  ],
  J: [
    { name: 'Remate', points: pts([0.38, ASC, 0.66, ASC]) },
    { name: 'Gancho', points: pts([0.58, ASC, 0.58, 0.58, 0.36, BASE]) }
  ],
  K: [
    { name: 'Tallo', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Brazo de entrada', points: pts([0.72, ASC, 0.3, 0.4]) },
    { name: 'Brazo de salida', points: pts([0.42, 0.38, 0.74, BASE]) }
  ],
  L: [{ name: 'Ángulo', points: pts([0.32, ASC, 0.32, BASE, 0.72, BASE]) }],
  M: [{ name: 'Arcos', points: pts([0.16, BASE, 0.16, ASC, 0.5, 0.55, 0.84, ASC, 0.84, BASE]) }],
  N: [{ name: 'Diagonales', points: pts([0.24, BASE, 0.24, ASC, 0.76, BASE, 0.76, ASC]) }],
  O: [{ name: 'Óvalo', points: ellipse(0.5, 0.36, 0.24, 0.3) }],
  P: [
    { name: 'Tallo', points: pts([0.32, ASC, 0.32, BASE]) },
    { name: 'Copa', points: ellipse(0.5, 0.24, 0.18, 0.16, -1.4, 1.4) }
  ],
  Q: [
    { name: 'Óvalo', points: ellipse(0.46, 0.36, 0.24, 0.3) },
    { name: 'Cola', points: pts([0.58, 0.48, 0.76, BASE]) }
  ],
  R: [
    { name: 'Tallo', points: pts([0.3, ASC, 0.3, BASE]) },
    { name: 'Copa', points: ellipse(0.5, 0.24, 0.18, 0.16, -1.4, 1.4) },
    { name: 'Pierna', points: pts([0.46, 0.4, 0.74, BASE]) }
  ],
  S: [{ name: 'Curva', points: pts([0.72, 0.14, 0.4, ASC, 0.28, 0.28, 0.7, 0.48, 0.56, BASE, 0.26, BASE - 0.04]) }],
  T: [
    { name: 'Barra', points: pts([0.2, ASC, 0.8, ASC]) },
    { name: 'Tallo', points: pts([0.5, ASC, 0.5, BASE]) }
  ],
  U: [{ name: 'Copa', points: pts([0.24, ASC, 0.24, 0.52, 0.5, BASE, 0.76, 0.52, 0.76, ASC]) }],
  V: [{ name: 'Ángulo', points: pts([0.16, ASC, 0.5, BASE, 0.84, ASC]) }],
  W: [{ name: 'Doble ángulo', points: pts([0.1, ASC, 0.28, BASE, 0.5, 0.28, 0.72, BASE, 0.9, ASC]) }],
  X: [
    { name: 'Diagonal', points: pts([0.2, ASC, 0.8, BASE]) },
    { name: 'Cruce', points: pts([0.8, ASC, 0.2, BASE]) }
  ],
  Y: [
    { name: 'Brazo izquierdo', points: pts([0.18, ASC, 0.5, 0.4]) },
    { name: 'Tallo', points: pts([0.82, ASC, 0.5, 0.4, 0.5, BASE]) }
  ],
  Z: [{ name: 'Tres trazos', points: pts([0.2, ASC, 0.8, ASC, 0.2, BASE, 0.8, BASE]) }]
};

function lessonsFor(chars: Record<string, Part[]>, group: string, toolNote: string): Lesson[] {
  return Object.entries(chars).map(([char, parts]) => {
    const zone =
      group === 'Mayúsculas'
        ? 'Apoya la mayúscula en la línea de base y llévala hasta el ascendente.'
        : 'El cuerpo de la minúscula queda entre la línea media y la base.';
    const steps: LessonStep[] = parts.map((part, index) => ({
      title: part.name,
      hint: `Paso ${index + 1} de ${parts.length}: ${part.name}. El trazo oscuro es este paso y los claros ya están hechos. ${zone}`,
      strokes: parts.slice(0, index + 1).map((item) => ({ points: item.points })),
      mode: 'sequence'
    }));
    const last = steps[steps.length - 1];
    return {
      id: `palmer-${group}-${char}`,
      category: 'palmer' as const,
      group,
      title: char,
      subTitle: toolNote,
      instructions: `«${char}» se construye por partes. Las primeras casillas de la fila muestran cada paso; el resto repite el paso elegido para copiarlo.`,
      characterOrWord: char,
      recommendedTool: 'fountain' as const,
      suggestedGrid: 'palmer' as const,
      idealStrokes: last.strokes,
      idealMode: 'sequence' as const,
      strokesExpected: parts.length,
      steps
    };
  });
}

export const LOWERCASE_LESSONS = lessonsFor(lower, 'Minúsculas', 'Cursiva minúscula');
export const UPPERCASE_LESSONS = lessonsFor(upper, 'Mayúsculas', 'Cursiva mayúscula');
