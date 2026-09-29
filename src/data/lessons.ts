import { Lesson } from '../types/ink';
import { HIRAGANA_LESSONS, JP_DICTATION_LESSONS, KATAKANA_LESSONS } from './japanese/kana';
import { kanjiLessons } from './japanese/kanjiDatabase';
import { LOWERCASE_LESSONS, UPPERCASE_LESSONS } from './palmer/alphabet';
import { EXERCISE_LESSONS } from './palmer/exercises';
import { LINE_LESSONS } from './palmer/lines';
import { PALMER_DICTATION_LESSONS, WORD_LESSONS } from './palmer/words';

export type { Lesson };

export const PALMER_GROUPS = ['Ejercicios', 'Minúsculas', 'Mayúsculas', 'Planas', 'Palabras', 'Oraciones', 'Dictado'];
export const JAPANESE_GROUPS = ['Hiragana', 'Katakana', 'N5', 'N4', 'N3', 'N2', 'N1', 'Dictado'];

export const LESSONS: Lesson[] = [
  ...EXERCISE_LESSONS,
  ...LOWERCASE_LESSONS,
  ...UPPERCASE_LESSONS,
  ...LINE_LESSONS,
  ...WORD_LESSONS,
  ...PALMER_DICTATION_LESSONS,
  ...HIRAGANA_LESSONS,
  ...KATAKANA_LESSONS,
  ...kanjiLessons(),
  ...JP_DICTATION_LESSONS
];
