import { Lesson, LessonStep, WarmupPattern } from '../../types/ink';
import { ASC, BASE, WAIST, XM, XR, bodyOval, ellipse, pts } from './paths';

function step(title: string, hint: string, strokes: LessonStep['strokes'], mode: LessonStep['mode'] = 'repeat'): LessonStep {
  return { title, hint, strokes, mode };
}

const closedOval = bodyOval(0.48, 0.2);
const opened = ellipse(0.46, XM, 0.2, XR, 0.65, 5.45);
const openedEnd = opened[opened.length - 1];
const linked = [...opened, { x: Math.min(0.9, openedEnd.x + 0.22), y: BASE }, { x: 0.94, y: XM }];

const xStroke = pts([0.5, WAIST, 0.5, BASE]);
const longStroke = pts([0.5, ASC, 0.5, BASE]);

const underOne = pts([0.12, BASE, 0.3, BASE, 0.46, WAIST + 0.015, 0.64, WAIST + 0.015, 0.86, BASE]);
const underTwo = pts([
  0.08, BASE, 0.16, BASE, 0.24, WAIST + 0.015, 0.34, WAIST + 0.015, 0.44, BASE,
  0.52, BASE, 0.62, WAIST + 0.015, 0.72, WAIST + 0.015, 0.9, BASE
]);

const overOne = pts([0.14, BASE, 0.34, WAIST + 0.02, 0.52, WAIST + 0.02, 0.74, BASE]);
const overTwo = pts([
  0.08, BASE, 0.2, WAIST + 0.02, 0.32, WAIST + 0.02, 0.44, BASE,
  0.44, BASE, 0.58, WAIST + 0.02, 0.72, WAIST + 0.02, 0.9, BASE
]);

const loopOnly = pts([0.4, BASE, 0.5, ASC, 0.68, ASC + 0.05, 0.56, WAIST, 0.44, BASE]);
const loopFoot = pts([0.4, BASE, 0.5, ASC, 0.68, ASC + 0.05, 0.56, WAIST, 0.44, BASE - 0.01, 0.66, BASE]);

function drill(
  id: string,
  title: string,
  subTitle: string,
  instructions: string,
  characterOrWord: string,
  steps: LessonStep[]
): Lesson {
  const last = steps[steps.length - 1];
  return {
    id,
    category: 'palmer',
    group: 'Ejercicios',
    title,
    subTitle,
    instructions,
    characterOrWord,
    recommendedTool: 'fountain',
    suggestedGrid: 'palmer',
    idealStrokes: last.strokes,
    idealMode: last.mode,
    steps
  };
}

export const EXERCISE_LESSONS: Lesson[] = [
  drill(
    'p-ovals',
    'Óvalos continuos',
    'Dentro de la altura de x',
    'El cuerpo del óvalo cabe entre la línea media y la base. Los pasos abren ese óvalo y le añaden el enlace.',
    'ooooo',
    [
      step(
        'Óvalo',
        'Paso 1. Cierra el óvalo entre la línea punteada y la línea de base. No toca el ascendente ni el descendente.',
        [{ points: closedOval }]
      ),
      step(
        'Apertura',
        'Paso 2. El mismo óvalo se abre por la derecha y queda en c, todavía dentro de la altura de x.',
        [{ points: opened }]
      ),
      step(
        'Enlace',
        'Paso 3. Sal por la línea de base y sube hacia la letra siguiente. Ese trazo es el que une la cadena.',
        [{ points: linked }]
      )
    ]
  ),
  drill(
    'p-push',
    'Empuje y arrastre',
    'Paralelo a la inclinación',
    'Cada trazo baja recto, paralelo a las líneas naranjas, y se detiene en una línea de la pauta.',
    '/////',
    [
      step(
        'Altura de x',
        'Paso 1. Baja desde la línea media hasta la base. El trazo queda dentro de la altura de x.',
        [{ points: xStroke }]
      ),
      step(
        'Trazo largo',
        'Paso 2. El mismo ángulo, ahora desde la línea de ascendente hasta la base.',
        [{ points: longStroke }]
      )
    ]
  ),
  drill(
    'p-under',
    'Curva inferior',
    'Unión entre letras',
    'La onda entra y sale por la línea de base y solo sube hasta la línea media.',
    'uuuuu',
    [
      step(
        'Una onda',
        'Paso 1. Entra por la base, sube a la línea media y vuelve a bajar a la base.',
        [{ points: underOne }]
      ),
      step(
        'Dos ondas',
        'Paso 2. La segunda onda repite el mismo alto y el mismo ancho.',
        [{ points: underTwo }]
      )
    ]
  ),
  drill(
    'p-over',
    'Curva superior',
    'Arco de n y m',
    'El arco arranca en la base, corona en la línea media y vuelve a la base.',
    'nnnnn',
    [
      step(
        'Un arco',
        'Paso 1. Un solo arco, de base a base, sin pasar de la línea media.',
        [{ points: overOne }]
      ),
      step(
        'Dos arcos',
        'Paso 2. El segundo arco mide lo mismo que el primero.',
        [{ points: overTwo }]
      )
    ]
  ),
  drill(
    'p-loop',
    'Bucles ascendentes',
    'l, e, b',
    'El bucle sube hasta la línea de ascendente y el pie se queda en la base.',
    'lllll',
    [
      step(
        'Bucle',
        'Paso 1. Sube al ascendente, cruza y baja por el mismo canal hasta la base.',
        [{ points: loopOnly }]
      ),
      step(
        'Bucle y pie',
        'Paso 2. Al tocar la base, el pie gira a la derecha y no entra en el descendente.',
        [{ points: loopFoot }]
      )
    ]
  )
];

/**
 * Soltura: filas continuas para calentar la mano antes de las letras, como las primeras
 * páginas de un cuaderno. Las primeras líneas se repasan; las de abajo, sin guía.
 */
function flow(pattern: WarmupPattern, title: string, subTitle: string, instructions: string, characterOrWord: string): Lesson {
  return {
    id: `soltura-${pattern}`,
    category: 'palmer',
    group: 'Ejercicios',
    title,
    subTitle,
    instructions: `${instructions} Repasa las líneas punteadas y sigue en las blancas sin levantar el lápiz.`,
    characterOrWord,
    recommendedTool: 'pencil',
    suggestedGrid: 'palmer',
    sheet: true,
    pattern
  };
}

export const FLOW_LESSONS: Lesson[] = [
  flow('ondas', 'Ondas', 'Soltura', 'Una ola suave entre la base y la línea media, siempre del mismo alto.', '∿∿∿'),
  flow('zigzag', 'Zigzag', 'Soltura', 'Sube y baja en línea recta. Las puntas tocan la base y la línea media.', '/\\/\\'),
  flow('arcos', 'Arcos', 'Soltura', 'Puentes como la n: sube redondo y baja recto hasta la base.', 'nnn'),
  flow('guirnaldas', 'Guirnaldas', 'Soltura', 'Copas como la u: baja redondo y sube a la línea media.', 'uuu'),
  flow('espiral', 'Espiral', 'Soltura', 'Óvalos encadenados que se pisan, con el brazo suelto y a ritmo parejo.', 'ℓℓℓ'),
  flow('lazos-e', 'Lazos chicos', 'Soltura', 'Lazos del alto de la e, todos iguales e inclinados.', 'eee'),
  flow('lazos-l', 'Lazos altos', 'Soltura', 'Lazos que suben hasta el ascendente, como la l, y vuelven a la base.', 'lll'),
  flow('e-e-l', 'e e l', 'Soltura', 'Dos lazos chicos y uno alto, sin cortar: el cambio de altura es lo que se practica.', 'eel')
];
