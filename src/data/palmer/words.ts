import { Lesson } from '../../types/ink';

function word(id: string, text: string, group: string, dictation = false, sheet = false): Lesson {
  return {
    id,
    category: 'palmer',
    group,
    title: text,
    subTitle: dictation ? 'Dictado en español' : 'Con guías y sin ellas',
    instructions: dictation
      ? 'Escucha la frase y escríbela sin parar el ritmo. La nota junta inclinación, altura de la x y el tiempo.'
      : 'La primera línea es el nivel fácil: calca la oración punteada. En las de abajo escríbela sin guía. Las letras sueltas se practican antes, en Minúsculas y Mayúsculas.',
    characterOrWord: text,
    recommendedTool: 'fountain',
    suggestedGrid: 'palmer',
    dictation,
    sheet
  };
}

const SHORT_WORDS = [
  'la', 'el', 'mi', 'un', 'yo',
  'sol', 'mar', 'luz', 'paz', 'ala', 'pan', 'mes',
  'casa', 'mesa', 'nido', 'rosa', 'lago', 'puro',
  'pluma', 'letra', 'mano', 'vida'
];

function wordRow(text: string): string {
  return Array.from({ length: 4 }, () => text).join('   ');
}

export const WORD_LESSONS: Lesson[] = [
  ...SHORT_WORDS.map((text) => ({
    ...word(`p-${text}`, text, 'Palabras', false, true),
    subTitle: 'Con las letras ya hechas',
    instructions: `Escribe «${text}» en cada línea. La primera va punteada. En las de abajo repite la palabra sin guía.`,
    characterOrWord: wordRow(text)
  })),
  word('w-rio', 'El río baja entre los pinos.', 'Oraciones', false, true),
  word('w-ventana', 'Mi hermana abre la ventana.', 'Oraciones', false, true),
  word('w-viento', 'Hoy el viento mueve las hojas.', 'Oraciones', false, true),
  word('w-tiza', 'El maestro deja la tiza.', 'Oraciones', false, true),
  word('w-plaza', 'Caminamos hasta la plaza.', 'Oraciones', false, true)
];

export const PALMER_DICTATION_LESSONS: Lesson[] = [
  word('d-brazo', 'La pluma sigue el ritmo del brazo', 'Dictado', true),
  word('d-altura', 'La letra mantiene la misma altura', 'Dictado', true),
  word('d-inclinacion', 'Escribe con inclinación constante', 'Dictado', true)
];
