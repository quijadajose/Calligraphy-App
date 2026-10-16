import { DICTATION_LEVELS } from '../../groups';
import { Lesson, glyphsOf } from '../../../types/ink';

/**
 * Dictados japoneses generados y validados con `npm run dictation` (ver scripts/dictation).
 * Cada fila: [id, texto, lectura en kana (lo que se lee en voz alta), pista en español].
 * Van en un archivo aparte que se carga después de abrir la app.
 */
type Row = [id: string, text: string, speech: string, hint: string];

const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  Kana: () => import('./Kana.json'),
  N5: () => import('./N5.json'),
  N4: () => import('./N4.json'),
  N3: () => import('./N3.json'),
  N2: () => import('./N2.json'),
  N1: () => import('./N1.json')
};

export function dictationLesson(level: string, [id, text, speech, hint]: Row): Lesson {
  const count = glyphsOf(text).length;
  return {
    id: `jpd-${id}`,
    category: 'japanese',
    group: `Dictado ${level}`,
    title: hint,
    subTitle: `${level} · ${count} signos`,
    instructions: 'Pulsa «Dictado», escucha y escribe la frase: un signo por cuadro, los espacios no ocupan cuadro.',
    characterOrWord: text,
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    dictation: true,
    dictationSeconds: 15 + count * 8,
    speech,
    meaning: hint
  };
}

let cache: Promise<Lesson[]> | null = null;

/** Todos los dictados generados, de Kana a N1. Si un nivel no carga, se sigue con los demás. */
export function loadDictationLessons(): Promise<Lesson[]> {
  cache ??= Promise.all(
    DICTATION_LEVELS.map(async (level) => {
      try {
        const module = await LOADERS[level]();
        return (module.default as Row[]).map((row) => dictationLesson(level, row));
      } catch {
        return [];
      }
    })
  ).then((levels) => levels.flat());
  return cache;
}
