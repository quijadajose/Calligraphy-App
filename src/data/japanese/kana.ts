import { Lesson } from '../../types/ink';

const HIRAGANA: Array<[string, string, number]> = [
  ['あ', 'a', 3], ['い', 'i', 2], ['う', 'u', 2], ['え', 'e', 2], ['お', 'o', 3],
  ['か', 'ka', 3], ['き', 'ki', 4], ['く', 'ku', 1], ['け', 'ke', 3], ['こ', 'ko', 2],
  ['さ', 'sa', 3], ['し', 'shi', 1], ['す', 'su', 2], ['せ', 'se', 3], ['そ', 'so', 1],
  ['た', 'ta', 4], ['ち', 'chi', 2], ['つ', 'tsu', 1], ['て', 'te', 1], ['と', 'to', 2],
  ['な', 'na', 4], ['に', 'ni', 3], ['ぬ', 'nu', 2], ['ね', 'ne', 2], ['の', 'no', 1],
  ['は', 'ha', 3], ['ひ', 'hi', 1], ['ふ', 'fu', 4], ['へ', 'he', 1], ['ほ', 'ho', 4],
  ['ま', 'ma', 3], ['み', 'mi', 2], ['む', 'mu', 3], ['め', 'me', 2], ['も', 'mo', 3],
  ['や', 'ya', 3], ['ゆ', 'yu', 2], ['よ', 'yo', 2],
  ['ら', 'ra', 2], ['り', 'ri', 2], ['る', 'ru', 1], ['れ', 're', 2], ['ろ', 'ro', 1],
  ['わ', 'wa', 2], ['を', 'wo', 3], ['ん', 'n', 1]
];

const KATAKANA: Array<[string, string, number]> = [
  ['ア', 'a', 2], ['イ', 'i', 2], ['ウ', 'u', 3], ['エ', 'e', 3], ['オ', 'o', 3],
  ['カ', 'ka', 2], ['キ', 'ki', 3], ['ク', 'ku', 2], ['ケ', 'ke', 3], ['コ', 'ko', 2],
  ['サ', 'sa', 3], ['シ', 'shi', 3], ['ス', 'su', 2], ['セ', 'se', 2], ['ソ', 'so', 2],
  ['タ', 'ta', 3], ['チ', 'chi', 3], ['ツ', 'tsu', 3], ['テ', 'te', 3], ['ト', 'to', 2],
  ['ナ', 'na', 2], ['ニ', 'ni', 2], ['ヌ', 'nu', 2], ['ネ', 'ne', 4], ['ノ', 'no', 1],
  ['ハ', 'ha', 2], ['ヒ', 'hi', 2], ['フ', 'fu', 1], ['ヘ', 'he', 1], ['ホ', 'ho', 4],
  ['マ', 'ma', 2], ['ミ', 'mi', 3], ['ム', 'mu', 2], ['メ', 'me', 2], ['モ', 'mo', 3],
  ['ヤ', 'ya', 2], ['ユ', 'yu', 2], ['ヨ', 'yo', 3],
  ['ラ', 'ra', 2], ['リ', 'ri', 2], ['ル', 'ru', 2], ['レ', 're', 1], ['ロ', 'ro', 3],
  ['ワ', 'wa', 2], ['ヲ', 'wo', 3], ['ン', 'n', 2]
];

function kanaLesson(char: string, reading: string, strokes: number, group: string): Lesson {
  return {
    id: `kana-${group}-${char}`,
    category: 'japanese',
    group,
    title: `${char}  ${reading}`,
    subTitle: `${strokes} trazos`,
    instructions: 'El primer cuadrado es el ejemplo. Copia la letra en los demás, con el mismo orden y el mismo remate.',
    characterOrWord: char,
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    strokesExpected: strokes
  };
}

export const HIRAGANA_LESSONS = HIRAGANA.map(([char, reading, strokes]) =>
  kanaLesson(char, reading, strokes, 'Hiragana')
);

export const KATAKANA_LESSONS = KATAKANA.map(([char, reading, strokes]) =>
  kanaLesson(char, reading, strokes, 'Katakana')
);

export const JP_DICTATION_LESSONS: Lesson[] = [
  {
    id: 'jp-d-1',
    category: 'japanese',
    group: 'Dictado',
    title: 'きょうは いい てんき',
    subTitle: 'Frase corta',
    instructions: 'Escucha y escribe la frase. El tiempo corre desde la primera lectura.',
    characterOrWord: 'きょうは いい てんき',
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    dictation: true,
    strokesExpected: 16
  },
  {
    id: 'jp-d-2',
    category: 'japanese',
    group: 'Dictado',
    title: 'みず と き',
    subTitle: 'Agua y árbol',
    instructions: 'Escribe las dos palabras con el orden de trazo de cada kanji o kana.',
    characterOrWord: '水 と 木',
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    dictation: true,
    strokesExpected: 10
  }
];
