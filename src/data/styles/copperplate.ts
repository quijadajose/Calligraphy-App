import { Lesson } from '../../types/ink';
import { Letters, styleLessons } from './common';
import { LIGADA_LETTERS } from './ligada';

/**
 * Copperplate: la cursiva inglesa clásica. Comparte el esqueleto de la ligada (entrada,
 * bucles y salida), con minúsculas más estrechas y mucho más inclinada (55°). Lo que la distingue
 * es el contraste: se carga la pluma al bajar y se aligera al subir.
 */

export const COPPERPLATE_SLANT = 55;

const narrow = (letters: Letters, factor: number): Letters =>
  Object.fromEntries(
    Object.entries(letters).map(([char, parts]) => [
      char,
      parts.map((part) => ({ ...part, points: part.points.map((p) => ({ x: 0.45 + (p.x - 0.45) * factor, y: p.y })) }))
    ])
  );

export const COPPERPLATE_LESSONS: Lesson[] = styleLessons(
  {
    id: 'copperplate',
    group: 'Copperplate',
    slant: COPPERPLATE_SLANT,
    tool: 'fountain',
    lowerNote: 'Aprieta al bajar (trazo grueso) y suelta al subir (trazo fino), siempre a 55°.',
    upperNote: 'Mayúscula amplia, de la base al ascendente: grueso al bajar, fino al subir.',
    intro: (char) => `«${char}» copperplate: muy inclinada, con trazos finos al subir y gruesos al bajar. Usa un lápiz con presión. Las primeras casillas muestran cada paso; el resto es para copiarlo.`
  },
  narrow(LIGADA_LETTERS.lower, 0.85),
  // Las mayúsculas mantienen su ancho: a 55° una capital estrecha se vuelve una raya.
  LIGADA_LETTERS.upper
);
