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
      ? `Repite «${char}» en cada línea. La primera lleva la guía punteada. Las de abajo van en blanco, con la misma letra y el mismo ritmo.`
      : `Repite «${char}» en cada línea, de la base al ascendente. La primera lleva la guía. Las de abajo van en blanco.`,
    characterOrWord: repeated(char),
    recommendedTool: 'fountain',
    suggestedGrid: 'palmer',
    sheet: true
  };
}

export const LINE_LESSONS: Lesson[] = [...LOWER, ...UPPER].map(lineLesson);
