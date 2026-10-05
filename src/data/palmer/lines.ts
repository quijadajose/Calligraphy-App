import { Lesson } from '../../types/ink';

const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function repeated(char: string): string {
  return Array.from({ length: 8 }, () => char).join(' ');
}

function lineLesson(char: string): Lesson {
  const lower = char === char.toLowerCase();
  return {
    id: `plana-${char}`,
    category: 'palmer',
    group: 'Planas',
    title: char,
    subTitle: 'Varias líneas',
    instructions: lower
      ? `Repite «${char}» en cada línea. Primero repasa las líneas punteadas; después sigue en las blancas, con la misma letra y el mismo ritmo.`
      : `Repite «${char}» en cada línea, de la base al ascendente. Repasa las líneas punteadas y sigue en las blancas.`,
    characterOrWord: repeated(char),
    recommendedTool: 'fountain',
    suggestedGrid: 'palmer',
    sheet: true
  };
}

/** Lo propio del español y lo que no son letras: también se practica en plana. */
const EXTRA: Array<[string, string, string]> = [
  ['ñ', 'ñ', 'La n con su virgulilla: la tilde se pone al final, sin levantar la mano antes.'],
  ['Ñ', 'Ñ', 'La mayúscula con virgulilla.'],
  ['tildes', 'á é í ó ú', 'Vocales con tilde: la tilde va inclinada como la letra, al terminar la palabra.'],
  ['dieresis', 'ü güe güi', 'La ü de pingüino y cigüeña.'],
  ['numeros', '0 1 2 3 4 5 6 7 8 9', 'Los números ocupan la altura de una mayúscula y se inclinan igual.'],
  ['signos', '¿Qué? ¡Sí! a, b; c.', 'Los signos de apertura ¿ ¡ se escriben bajo la línea media, sin dejar espacio.']
];

function extraLesson([id, text, hint]: [string, string, string]): Lesson {
  return {
    id: `plana-${id}`,
    category: 'palmer',
    group: 'Planas',
    title: text,
    subTitle: 'Español y signos',
    instructions: `${hint} Repasa las líneas punteadas y sigue en las blancas.`,
    characterOrWord: Array.from({ length: 3 }, () => text).join('   '),
    recommendedTool: 'fountain',
    suggestedGrid: 'palmer',
    sheet: true
  };
}

export const LINE_LESSONS: Lesson[] = [...[...LOWER, ...UPPER].map(lineLesson), ...EXTRA.map(extraLesson)];

/** Pares que más cuestan en cursiva: la salida alta de b, o, v y w cambia la letra siguiente. */
const JOINS: Array<[string, string]> = [
  ['br', 'La b sale por arriba: la r empieza en la línea media, sin bajar a la base.'],
  ['bi', 'Después de la b, el enlace corre por la línea media hasta el palote de la i.'],
  ['os', 'La o termina arriba. La s arranca desde ahí, sin volver a la base.'],
  ['oa', 'Desde la o, el enlace va recto a la línea media y entra en el óvalo de la a.'],
  ['ve', 'La v cierra con un rizo alto; la e nace de ese rizo.'],
  ['vi', 'De la v a la i el enlace es corto y horizontal.'],
  ['wr', 'La w acaba arriba: la r se apoya en ese mismo punto.'],
  ['we', 'La e sale del rizo de la w, sin bajar.'],
  ['on', 'El enlace de la o pasa por arriba y cae en el primer palote de la n.'],
  ['ss', 'Dos s seguidas: la segunda empieza donde termina la primera.'],
  ['ll', 'Dos bucles iguales. El segundo nace del pie del primero.'],
  ['tt', 'Escribe los dos tallos y cruza ambos con una sola barra.']
];

function joinLesson([pair, hint]: [string, string]): Lesson {
  return {
    id: `enlace-${pair}`,
    category: 'palmer',
    group: 'Enlaces',
    title: pair,
    subTitle: 'Enlace entre letras',
    instructions: `${hint} Repasa las líneas punteadas y repite el par sin levantar la pluma entre las dos letras.`,
    characterOrWord: Array.from({ length: 6 }, () => pair).join('  '),
    recommendedTool: 'fountain',
    suggestedGrid: 'palmer',
    sheet: true
  };
}

export const JOIN_LESSONS: Lesson[] = JOINS.map(joinLesson);
