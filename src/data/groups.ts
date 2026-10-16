/** Pestañas de español: ejercicios, los estilos de letra y la práctica con texto. */
export const LETTER_STYLES = ['Imprenta', 'Ligada', 'Itálica', 'Copperplate'];
export const PALMER_GROUPS = ['Ejercicios', ...LETTER_STYLES, 'Enlaces', 'Planas', 'Palabras', 'Oraciones', 'Dictado'];
export const KANJI_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const JAPANESE_TABS = ['Hiragana', 'Katakana', 'Kanji', 'Vocabulario', 'Dictado'];
/** Niveles de los dictados japoneses: solo kana y luego por nivel de kanji. */
export const DICTATION_LEVELS = ['Kana', ...KANJI_LEVELS];
export const DICTATION_GROUPS = DICTATION_LEVELS.map((level) => `Dictado ${level}`);
export const JAPANESE_GROUPS = ['Hiragana', 'Katakana', ...KANJI_LEVELS, 'Vocabulario', ...DICTATION_GROUPS];
