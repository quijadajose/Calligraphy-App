// Lista de textos a grabar: cada lección que se puede dictar (dictados generados incluidos).
// La usa scripts/dictation/audio.py. Uso: npx tsx scripts/dictation/audio-list.ts
import { writeFileSync } from 'node:fs';
import { LESSONS } from '../../src/data/lessons';
import { DICTATION_LEVELS } from '../../src/data/groups';
import { dictationLesson } from '../../src/data/japanese/dictation/index';
import { audioPath, isDictatable, speechLang, spokenText } from '../../src/core/audio/speech';
import type { Lesson } from '../../src/types/ink';
import Kana from '../../src/data/japanese/dictation/Kana.json';
import N5 from '../../src/data/japanese/dictation/N5.json';
import N4 from '../../src/data/japanese/dictation/N4.json';
import N3 from '../../src/data/japanese/dictation/N3.json';
import N2 from '../../src/data/japanese/dictation/N2.json';
import N1 from '../../src/data/japanese/dictation/N1.json';

type Row = [string, string, string, string];
const ROWS: Record<string, Row[]> = { Kana, N5, N4, N3, N2, N1 } as unknown as Record<string, Row[]>;
const generated: Lesson[] = DICTATION_LEVELS.flatMap((level) => ROWS[level].map((row) => dictationLesson(level, row)));

const items = [...LESSONS, ...generated]
  .filter(isDictatable)
  // Enlaces y planas repiten letras sueltas: no tiene sentido grabarlas.
  .filter((lesson) => !(lesson.category === 'palmer' && (lesson.group === 'Enlaces' || lesson.group === 'Planas')))
  .map((lesson) => ({ id: lesson.id, file: audioPath(lesson.id), lang: speechLang(lesson), text: spokenText(lesson) }));

writeFileSync('dictation/audio-list.json', JSON.stringify(items));
console.log(`${items.length} textos → dictation/audio-list.json`);
