import { Lesson } from '../../types/ink';

type KanaRow = [string, string, number];

const HIRAGANA: KanaRow[] = [
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

const KATAKANA: KanaRow[] = [
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

/** Sonoras (dakuten) y semisonoras (handakuten): la base más dos o un trazo. */
const H_VOICED: KanaRow[] = [
  ['が', 'ga', 5], ['ぎ', 'gi', 6], ['ぐ', 'gu', 3], ['げ', 'ge', 5], ['ご', 'go', 4],
  ['ざ', 'za', 5], ['じ', 'ji', 3], ['ず', 'zu', 4], ['ぜ', 'ze', 5], ['ぞ', 'zo', 3],
  ['だ', 'da', 6], ['ぢ', 'dji', 4], ['づ', 'dzu', 3], ['で', 'de', 3], ['ど', 'do', 4],
  ['ば', 'ba', 5], ['び', 'bi', 3], ['ぶ', 'bu', 6], ['べ', 'be', 3], ['ぼ', 'bo', 6],
  ['ぱ', 'pa', 4], ['ぴ', 'pi', 2], ['ぷ', 'pu', 5], ['ぺ', 'pe', 2], ['ぽ', 'po', 5]
];

const K_VOICED: KanaRow[] = [
  ['ガ', 'ga', 4], ['ギ', 'gi', 5], ['グ', 'gu', 4], ['ゲ', 'ge', 5], ['ゴ', 'go', 4],
  ['ザ', 'za', 5], ['ジ', 'ji', 5], ['ズ', 'zu', 4], ['ゼ', 'ze', 4], ['ゾ', 'zo', 4],
  ['ダ', 'da', 5], ['ヂ', 'dji', 5], ['ヅ', 'dzu', 5], ['デ', 'de', 5], ['ド', 'do', 4],
  ['バ', 'ba', 4], ['ビ', 'bi', 4], ['ブ', 'bu', 3], ['ベ', 'be', 3], ['ボ', 'bo', 6],
  ['パ', 'pa', 3], ['ピ', 'pi', 3], ['プ', 'pu', 2], ['ペ', 'pe', 2], ['ポ', 'po', 5]
];

const H_SMALL: KanaRow[] = [['ゃ', 'ya pequeña', 3], ['ゅ', 'yu pequeña', 2], ['ょ', 'yo pequeña', 2], ['っ', 'tsu pequeña', 1]];
const K_SMALL: KanaRow[] = [['ャ', 'ya pequeña', 2], ['ュ', 'yu pequeña', 2], ['ョ', 'yo pequeña', 3], ['ッ', 'tsu pequeña', 3]];

const YOON = ['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'び', 'ぴ'];
const YOON_ROMA: Record<string, string> = {
  き: 'ky', し: 'sh', ち: 'ch', に: 'ny', ひ: 'hy', み: 'my', り: 'ry', ぎ: 'gy', じ: 'j', び: 'by', ぴ: 'py'
};

function kanaLesson(char: string, reading: string, strokes: number, group: string): Lesson {
  return {
    id: `kana-${group}-${char}`,
    category: 'japanese',
    group,
    title: `${char}  ${reading}`,
    subTitle: `${strokes} trazos`,
    instructions: 'El primer cuadrado es el ejemplo. Copia la letra en los demás, con el mismo orden y el mismo remate. Cada copia se califica por separado.',
    characterOrWord: char,
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    strokesExpected: strokes,
    reading
  };
}

/** Combinación de dos signos: la fila de ejemplo muestra los dos y se copian en orden. */
function comboLesson(text: string, reading: string, group: string, strokes: number): Lesson {
  return {
    id: `kana-${group}-${text}`,
    category: 'japanese',
    group,
    title: `${text}  ${reading}`,
    subTitle: 'Combinación',
    instructions: 'Los primeros cuadrados muestran la combinación. Cópiala en los siguientes, un signo por cuadrado. El pequeño ocupa medio cuadro.',
    characterOrWord: text,
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    strokesExpected: strokes,
    reading
  };
}

const HIRA_STROKES = new Map([...HIRAGANA, ...H_VOICED, ...H_SMALL].map(([c, , s]) => [c, s]));
const yoonLessons = (): Lesson[] =>
  YOON.flatMap((base) =>
    (['ゃ', 'ゅ', 'ょ'] as const).map((small, index) => {
      const roma = YOON_ROMA[base] + ['a', 'u', 'o'][index];
      return comboLesson(`${base}${small}`, roma, 'Hiragana', (HIRA_STROKES.get(base) ?? 2) + (HIRA_STROKES.get(small) ?? 2));
    })
  );

export const HIRAGANA_LESSONS: Lesson[] = [
  ...HIRAGANA.map(([char, reading, strokes]) => kanaLesson(char, reading, strokes, 'Hiragana')),
  ...H_VOICED.map(([char, reading, strokes]) => kanaLesson(char, reading, strokes, 'Hiragana')),
  ...H_SMALL.map(([char, reading, strokes]) => kanaLesson(char, reading, strokes, 'Hiragana')),
  ...yoonLessons()
];

export const KATAKANA_LESSONS: Lesson[] = [
  ...KATAKANA.map(([char, reading, strokes]) => kanaLesson(char, reading, strokes, 'Katakana')),
  ...K_VOICED.map(([char, reading, strokes]) => kanaLesson(char, reading, strokes, 'Katakana')),
  ...K_SMALL.map(([char, reading, strokes]) => kanaLesson(char, reading, strokes, 'Katakana'))
];

/** Palabras con los kanji de N5. Los primeros cuadrados muestran la palabra; se copia signo a signo. */
const WORDS: Array<[string, string, string, number]> = [
  ['日本', 'にほん', 'Japón', 9],
  ['山川', 'やまかわ', 'montañas y ríos', 6],
  ['大学', 'だいがく', 'universidad', 11],
  ['学生', 'がくせい', 'estudiante', 13],
  ['先生', 'せんせい', 'profesor', 11],
  ['名前', 'なまえ', 'nombre', 15],
  ['今日', 'きょう', 'hoy', 8],
  ['時間', 'じかん', 'tiempo, hora', 22],
  ['電車', 'でんしゃ', 'tren', 20],
  ['水', 'みず', 'agua', 4],
  ['火山', 'かざん', 'volcán', 7],
  ['毎日', 'まいにち', 'cada día', 10],
  ['人口', 'じんこう', 'población', 5],
  ['子ども', 'こども', 'niño', 6],
  ['お金', 'おかね', 'dinero', 11]
];

export const VOCABULARY_LESSONS: Lesson[] = WORDS.map(([text, reading, meaning, strokes]) => ({
  id: `vocab-${text}`,
  category: 'japanese',
  group: 'Vocabulario',
  title: `${text}  ${reading}`,
  subTitle: meaning,
  instructions: 'Los primeros cuadrados muestran la palabra. Cópiala en los siguientes, un signo por cuadrado y en orden.',
  characterOrWord: text,
  recommendedTool: 'fude',
  suggestedGrid: 'genkouyoushi',
  strokesExpected: strokes,
  reading,
  meaning
}));

export const JP_DICTATION_LESSONS: Lesson[] = [
  {
    id: 'jp-d-1',
    category: 'japanese',
    group: 'Dictado',
    title: 'きょうは いい てんき',
    subTitle: 'Frase corta',
    instructions: 'Escucha y escribe la frase, un signo por cuadrado. Los espacios no ocupan cuadro.',
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
    instructions: 'Escribe las dos palabras con el orden de trazo de cada kanji o kana, un signo por cuadrado.',
    characterOrWord: '水 と 木',
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    dictation: true,
    strokesExpected: 10
  },
  {
    id: 'jp-d-3',
    category: 'japanese',
    group: 'Dictado',
    title: 'やまと かわ',
    subTitle: 'Montaña y río',
    instructions: 'Escucha y escribe en kanji: montaña y río.',
    characterOrWord: '山 川',
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    dictation: true,
    strokesExpected: 6
  },
  {
    id: 'jp-d-4',
    category: 'japanese',
    group: 'Dictado',
    title: 'にほんご',
    subTitle: 'Idioma japonés',
    instructions: 'Escucha y escribe la palabra en hiragana.',
    characterOrWord: 'にほんご',
    recommendedTool: 'fude',
    suggestedGrid: 'genkouyoushi',
    dictation: true,
    strokesExpected: 12
  }
];
