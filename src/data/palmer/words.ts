import { Lesson } from '../../types/ink';

function word(id: string, text: string, group: string, dictation = false, sheet = false): Lesson {
  return {
    id,
    category: 'palmer',
    group,
    title: text,
    subTitle: dictation ? 'Dictado en español' : 'Con guías y sin ellas',
    instructions: dictation
      ? 'Escucha la frase y escríbela sin parar el ritmo. La nota junta la silueta de lo escrito, la inclinación, la altura de la x y el tiempo.'
      : 'Las líneas punteadas son el nivel fácil: cálcalas. En las de abajo escribe la oración sin guía. Las letras sueltas se practican antes, en su estilo.',
    characterOrWord: text,
    recommendedTool: 'fountain',
    suggestedGrid: 'palmer',
    dictation,
    sheet: sheet || dictation
  };
}

const SHORT_WORDS = [
  'la', 'el', 'mi', 'un', 'yo',
  'sol', 'mar', 'luz', 'paz', 'ala', 'pan', 'mes',
  'casa', 'mesa', 'nido', 'rosa', 'lago', 'puro',
  'pluma', 'letra', 'mano', 'vida',
  'niño', 'año', 'sueño', 'mañana', 'canción', 'corazón', 'árbol', 'lápiz',
  'brazo', 'brisa', 'broma', 'osos', 'vela', 'verde', 'nube', 'libro',
  'hoja', 'tinta', 'papel', 'mundo', 'camino', 'ventana', 'música', 'jardín'
];

function wordRow(text: string): string {
  return Array.from({ length: 4 }, () => text).join('   ');
}

export const WORD_LESSONS: Lesson[] = [
  ...SHORT_WORDS.map((text) => ({
    ...word(`p-${text}`, text, 'Palabras', false, true),
    subTitle: 'Con las letras ya hechas',
    instructions: `Escribe «${text}» en cada línea. Repasa las líneas punteadas y repite la palabra sin guía en las de abajo.`,
    characterOrWord: wordRow(text)
  })),
  word('w-rio', 'El río baja entre los pinos.', 'Oraciones', false, true),
  word('w-ventana', 'Mi hermana abre la ventana.', 'Oraciones', false, true),
  word('w-viento', 'Hoy el viento mueve las hojas.', 'Oraciones', false, true),
  word('w-tiza', 'El maestro deja la tiza.', 'Oraciones', false, true),
  word('w-plaza', 'Caminamos hasta la plaza.', 'Oraciones', false, true),
  word('w-cafe', 'El café de la mañana está caliente.', 'Oraciones', false, true),
  word('w-gato', 'Un gato duerme bajo el sol.', 'Oraciones', false, true),
  word('w-tren', 'El tren llega a las nueve.', 'Oraciones', false, true),
  word('w-lluvia', 'La lluvia moja los tejados.', 'Oraciones', false, true),
  word('w-carta', 'Escribo una carta a mi abuela.', 'Oraciones', false, true),
  word('w-noche', 'Por la noche brillan las estrellas.', 'Oraciones', false, true),
  word('w-pan', 'Compramos pan y queso fresco.', 'Oraciones', false, true),
  word('w-puerta', 'Cierra la puerta con cuidado.', 'Oraciones', false, true),
  word('w-rio2', 'El agua del río corre sin prisa.', 'Oraciones', false, true),
  word('w-libro', 'Leo un libro junto a la ventana.', 'Oraciones', false, true),
  word('w-pinguino', 'El pingüino nada en el agua fría.', 'Oraciones', false, true),
  word('w-nino', 'El niño sueña con el mar.', 'Oraciones', false, true),
  word('w-pregunta', '¿Vienes mañana? ¡Claro que sí!', 'Oraciones', false, true),
  word('w-flores', 'Las flores del jardín ya abrieron.', 'Oraciones', false, true),
  word('w-pluma', 'Mi pluma deja una línea fina.', 'Oraciones', false, true)
];

export const PALMER_DICTATION_LESSONS: Lesson[] = [
  word('d-brazo', 'La pluma sigue el ritmo del brazo', 'Dictado', true),
  word('d-altura', 'La letra mantiene la misma altura', 'Dictado', true),
  word('d-inclinacion', 'Escribe con inclinación constante', 'Dictado', true),
  word('d-manana', 'Cada mañana practico un poco', 'Dictado', true),
  word('d-ritmo', 'El ritmo importa más que la prisa', 'Dictado', true),
  word('d-ovalo', 'El óvalo nace del movimiento del brazo', 'Dictado', true),
  word('d-ventana', 'La luz entra por la ventana abierta', 'Dictado', true),
  word('d-pagina', 'Una página limpia invita a escribir', 'Dictado', true)
];

/** Texto libre del usuario: se practica como una oración más. */
export function customLesson(text: string): Lesson {
  const clean = text.trim().slice(0, 80);
  return {
    ...word(`custom-${clean}`, clean, 'Oraciones', false, true),
    subTitle: 'Tu texto',
    custom: true
  };
}
