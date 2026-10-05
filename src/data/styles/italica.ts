import { Lesson } from '../../types/ink';
import { ASC, BASE as B, DESC as D, Letters, Part, WAIST as W, XM as M, curve, dotAt, line, styleLessons } from './common';
import { IMPRENTA_LETTERS } from './imprenta';

/**
 * Itálica (cancilleresca): letra de pluma, estrecha y casi vertical. Las minúsculas
 * nacen del palote con arcos en punta, entran con un pequeño remate y salen con un
 * gancho. Las mayúsculas son capitales romanas estrechas.
 */

export const ITALICA_SLANT = 83;

const s = (name: string, coords: number[]): Part => ({ name, points: curve(coords, 6) });
/** Remate de entrada en la línea media antes de un palote en x. */
const serif = (x: number) => [x - 0.04, W + 0.04, x, W, x, W];
/** Gancho de salida al pie de un palote en x. */
const foot = (x: number) => [x, B - 0.04, x + 0.04, B, x + 0.1, B - 0.04];
/** Cuenco de a, d, g, q: gira a la izquierda y vuelve a subir al palote en x. */
const bowl = (x: number) => [x, W + 0.04, x - 0.08, W, x - 0.2, W + 0.06, x - 0.24, M, x - 0.22, B - 0.04, x - 0.16, B, x - 0.06, M + 0.06, x, W, x, W];
/** Arco de n, m, h: nace del palote en x y baja en x + w. */
const branch = (x: number, w: number) => [x + 0.04, M - 0.02, x + w * 0.5, W + 0.02, x + w * 0.85, W + 0.01, x + w, M - 0.04];

const lower: Letters = {
  a: [s('Cuenco, palote y gancho', [...bowl(0.5), ...foot(0.5)])],
  b: [s('Palote alto y cuenco', [0.26, ASC + 0.06, 0.3, ASC, 0.3, ASC, 0.3, B, 0.3, B, 0.36, W + 0.08, 0.46, W, 0.54, M, 0.48, B - 0.02, 0.36, B, 0.3, B - 0.04])],
  c: [s('Curva', [0.5, W + 0.05, 0.42, W, 0.3, W + 0.06, 0.26, M, 0.28, B - 0.04, 0.36, B, 0.48, B - 0.04])],
  d: [s('Cuenco, palote alto y gancho', [...bowl(0.5), 0.51, 0.2, 0.52, ASC, 0.52, ASC, 0.51, M, ...foot(0.5)])],
  e: [s('Lazo', [0.3, M + 0.02, 0.44, M - 0.04, 0.48, W + 0.03, 0.4, W, 0.3, W + 0.06, 0.26, M + 0.02, 0.29, B - 0.04, 0.38, B, 0.5, B - 0.05])],
  f: [
    s('Gancho y palote', [0.56, ASC + 0.04, 0.5, ASC, 0.42, ASC + 0.04, 0.4, 0.2, 0.39, B, 0.38, D - 0.06, 0.32, D]),
    { name: 'Barra', points: line([0.3, W, 0.52, W]) }
  ],
  g: [s('Cuenco y cola', [...bowl(0.5), 0.5, 0.85, 0.44, D, 0.3, D - 0.02, 0.26, 0.9])],
  h: [s('Palote alto, arco y gancho', [0.26, ASC + 0.06, 0.3, ASC, 0.3, ASC, 0.3, B, 0.3, B, ...branch(0.3, 0.22), 0.52, B - 0.04, 0.56, B, 0.62, B - 0.04])],
  i: [
    s('Palote', [...serif(0.4), ...foot(0.4)]),
    { name: 'Punto', points: dotAt(0.42, W - 0.1, 0.025) }
  ],
  j: [
    s('Palote y cola', [...serif(0.42), 0.42, 0.88, 0.36, D, 0.28, D - 0.03]),
    { name: 'Punto', points: dotAt(0.44, W - 0.1, 0.025) }
  ],
  k: [
    s('Palote alto', [0.26, ASC + 0.06, 0.3, ASC, 0.3, ASC, 0.3, B]),
    s('Lazo y pierna', [0.3, M + 0.02, 0.42, W + 0.01, 0.5, W + 0.06, 0.44, M, 0.34, M + 0.03, 0.34, M + 0.03, 0.46, M + 0.06, 0.5, B - 0.04, 0.54, B, 0.6, B - 0.04])
  ],
  l: [s('Palote alto y gancho', [0.34, ASC + 0.06, 0.38, ASC, 0.38, ASC, ...foot(0.38)])],
  m: [s('Palote y dos arcos', [...serif(0.2), 0.2, B, 0.2, B, ...branch(0.2, 0.18), 0.38, B, 0.38, B, ...branch(0.38, 0.18), 0.56, B - 0.04, 0.6, B, 0.66, B - 0.04])],
  n: [s('Palote y arco', [...serif(0.28), 0.28, B, 0.28, B, ...branch(0.28, 0.22), 0.5, B - 0.04, 0.54, B, 0.6, B - 0.04])],
  ñ: [
    s('Palote y arco', [...serif(0.28), 0.28, B, 0.28, B, ...branch(0.28, 0.22), 0.5, B - 0.04, 0.54, B, 0.6, B - 0.04]),
    s('Virgulilla', [0.26, W - 0.07, 0.33, W - 0.11, 0.4, W - 0.07, 0.48, W - 0.11])
  ],
  o: [s('Óvalo', [0.44, W, 0.32, W + 0.05, 0.27, M, 0.3, B - 0.03, 0.4, B, 0.5, M + 0.04, 0.5, W + 0.06, 0.44, W])],
  p: [s('Palote largo y cuenco', [...serif(0.3), 0.3, D, 0.3, D, 0.3, M, 0.36, W + 0.04, 0.46, W, 0.53, M, 0.48, B - 0.02, 0.36, B, 0.31, B - 0.04])],
  q: [s('Cuenco y palote largo', [...bowl(0.5), 0.5, D, 0.5, D, 0.56, D - 0.05])],
  r: [s('Palote y hombro', [...serif(0.32), 0.32, B, 0.32, B, 0.36, M - 0.02, 0.42, W + 0.02, 0.52, W + 0.01])],
  s: [s('Ese', [0.48, W + 0.03, 0.4, W, 0.32, W + 0.05, 0.33, M - 0.03, 0.44, M + 0.03, 0.47, B - 0.06, 0.38, B, 0.28, B - 0.04])],
  t: [
    s('Palote y gancho', [0.36, 0.2, 0.36, 0.2, ...foot(0.36)]),
    { name: 'Barra', points: line([0.28, W, 0.48, W]) }
  ],
  u: [s('Copa y palote', [...serif(0.26), 0.26, M + 0.06, 0.3, B - 0.02, 0.38, B, 0.46, B - 0.06, 0.48, W, 0.48, W, ...foot(0.48)])],
  v: [s('Uve', [...serif(0.28), 0.32, M + 0.06, 0.38, B, 0.38, B, 0.46, M, 0.5, W + 0.04, 0.48, W])],
  w: [s('Doble uve', [...serif(0.2), 0.24, M + 0.06, 0.29, B, 0.29, B, 0.35, M, 0.38, W + 0.02, 0.38, W + 0.02, 0.42, M + 0.06, 0.47, B, 0.47, B, 0.54, M, 0.58, W + 0.04, 0.56, W])],
  x: [
    s('Diagonal', [0.24, W + 0.03, 0.3, W, 0.36, W + 0.06, 0.44, B - 0.04, 0.5, B, 0.56, B - 0.04]),
    { name: 'Cruce', points: line([0.5, W, 0.28, B]) }
  ],
  y: [s('Copa y cola', [...serif(0.26), 0.26, M + 0.06, 0.3, B - 0.02, 0.38, B, 0.46, B - 0.06, 0.48, W, 0.48, W, 0.48, 0.88, 0.42, D, 0.3, D - 0.03])],
  z: [s('Zeta', [0.26, W + 0.03, 0.3, W, 0.5, W, 0.5, W, 0.26, B, 0.26, B, 0.46, B, 0.52, B - 0.04])]
};

/** Mayúsculas: las de imprenta, más estrechas (la itálica las inclina un poco). */
const narrow = (letters: Letters, factor: number): Letters =>
  Object.fromEntries(
    Object.entries(letters).map(([char, parts]) => [
      char,
      parts.map((part) => ({ ...part, points: part.points.map((p) => ({ x: 0.5 + (p.x - 0.5) * factor, y: p.y })) }))
    ])
  );

const upper: Letters = narrow(IMPRENTA_LETTERS.upper, 0.78);

export const ITALICA_LESSONS: Lesson[] = styleLessons(
  {
    id: 'italica',
    group: 'Itálica',
    slant: ITALICA_SLANT,
    tool: 'fountain',
    lowerNote: 'Letra estrecha y casi recta: los arcos nacen del palote, a dos tercios de la altura.',
    upperNote: 'Capital romana estrecha, de la base al ascendente.',
    intro: (char) => `«${char}» itálica: estrecha, apenas inclinada, con remates al entrar y salir. Las primeras casillas muestran cada trazo; el resto es para copiarlo.`
  },
  lower,
  upper
);
