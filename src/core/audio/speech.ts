import { Lesson } from '../../types/ink';

export type SpeechLang = 'es-ES' | 'ja-JP';

export function speechLang(lesson: Lesson): SpeechLang {
  return lesson.category === 'palmer' ? 'es-ES' : 'ja-JP';
}

/** Lo que se lee en un dictado: la lectura en kana si la hay (las voces leen mal muchos kanji). */
export function spokenText(lesson: Lesson): string {
  if (lesson.speech) return lesson.speech;
  if (lesson.category === 'japanese' && lesson.reading && /^[぀-ヿ\s]+$/u.test(lesson.reading)) return lesson.reading;
  return lesson.characterOrWord;
}

/** Se puede dictar: dictados, hojas de texto y palabras japonesas de más de un signo. */
export function isDictatable(lesson: Lesson): boolean {
  if (lesson.pattern) return false;
  return !!lesson.dictation || !!lesson.sheet || (lesson.category === 'japanese' && Array.from(lesson.characterOrWord.replace(/\s/g, '')).length > 1);
}

/**
 * Audio pregrabado de una lección (scripts/dictation/audio.py), relativo a la raíz de la app.
 * Los caracteres fuera de [A-Za-z0-9_-] se escriben como _<código> para que el nombre sea seguro.
 */
export function audioPath(lessonId: string): string {
  const safe = Array.from(lessonId).map((char) => (/^[A-Za-z0-9_-]$/.test(char) ? char : `_${char.codePointAt(0)!.toString(16)}`)).join('');
  return `audio/${safe}.ogg`;
}
