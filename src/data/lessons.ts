import { Lesson } from '../types/ink';
import { HIRAGANA_LESSONS, JP_DICTATION_LESSONS, KATAKANA_LESSONS, VOCABULARY_LESSONS } from './japanese/kana';
import { kanjiLessons } from './japanese/kanjiDatabase';
import { EXERCISE_LESSONS } from './palmer/exercises';
import { COPPERPLATE_LESSONS } from './styles/copperplate';
import { PRINT_LESSONS } from './styles/imprenta';
import { ITALICA_LESSONS } from './styles/italica';
import { LIGADA_LESSONS } from './styles/ligada';
import { JOIN_LESSONS, LINE_LESSONS } from './palmer/lines';
import { PALMER_DICTATION_LESSONS, WORD_LESSONS, customLesson } from './palmer/words';

export type { Lesson };
export { JAPANESE_GROUPS, PALMER_GROUPS } from './groups';

export const LESSONS: Lesson[] = [
  ...EXERCISE_LESSONS,
  ...PRINT_LESSONS,
  ...LIGADA_LESSONS,
  ...ITALICA_LESSONS,
  ...COPPERPLATE_LESSONS,
  ...JOIN_LESSONS,
  ...LINE_LESSONS,
  ...WORD_LESSONS,
  ...PALMER_DICTATION_LESSONS,
  ...HIRAGANA_LESSONS,
  ...KATAKANA_LESSONS,
  ...kanjiLessons(),
  ...VOCABULARY_LESSONS,
  ...JP_DICTATION_LESSONS
];

/** Lecciones fijas más las oraciones que escribió el usuario. */
export function allLessons(customTexts: string[]): Lesson[] {
  return [...LESSONS, ...customTexts.map((text) => customLesson(text))];
}
