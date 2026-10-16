// Validación de un dictado: reglas duras (errores → se rechaza) y avisos (→ revisión).
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { MAX_GLYPHS, MIN_GLYPHS, ROOT, glyphsOf, hasJapanese, isKana, isKanji, normalizeText, textKey, toHiragana } from './lib.mjs';

let tokenizerPromise = null;

/** Analizador morfológico (kuromoji + IPADIC) para comprobar la lectura que dio el modelo. */
export function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      let kuromoji;
      try {
        kuromoji = createRequire(import.meta.url)('kuromoji');
      } catch {
        reject(new Error('Falta kuromoji. Ejecuta: npm install'));
        return;
      }
      kuromoji.builder({ dicPath: join(ROOT, 'node_modules', 'kuromoji', 'dict') }).build((error, tokenizer) => {
        if (error) reject(error);
        else resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

/** Lectura según kuromoji, en hiragana y sin espacios. `unknown`: palabras sin lectura en el diccionario. */
export function kuromojiReading(tokenizer, text) {
  const unknown = [];
  let reading = '';
  for (const token of tokenizer.tokenize(textKey(text))) {
    const surface = token.surface_form;
    if (token.reading && token.reading !== '*') reading += token.reading;
    else if (Array.from(surface).every(isKana)) reading += surface;
    else {
      unknown.push(surface);
      reading += surface;
    }
  }
  return { reading: toHiragana(reading), unknown };
}

function readingKey(reading) {
  return toHiragana(String(reading ?? '')).replace(/[\s　]+/gu, '');
}

/**
 * Valida un dictado. Devuelve el dictado normalizado, los errores (no se acepta) y los avisos
 * (se acepta como «review» hasta que alguien o el juez lo resuelva).
 *
 * ctx: { level, allowedKanji, charset, targets, seen: Set<textKey>, tokenizer? }
 */
export function validateItem(raw, ctx) {
  const errors = [];
  const warnings = [];
  const text = normalizeText(raw?.text);
  const reading = normalizeText(raw?.reading);
  const hint = normalizeText(raw?.hint);
  const glyphs = glyphsOf(text);
  const targetSet = new Set(ctx.targets.map((target) => target.c));

  if (!text) errors.push('sin texto');
  if (glyphs.length < MIN_GLYPHS || glyphs.length > MAX_GLYPHS) {
    errors.push(`largo ${glyphs.length} (debe ser ${MIN_GLYPHS}–${MAX_GLYPHS} signos)`);
  }
  const outOfLevel = [];
  const noData = [];
  for (const char of new Set(glyphs)) {
    if (isKanji(char)) {
      if (!ctx.allowedKanji.has(char)) outOfLevel.push(char);
      else if (!ctx.charset.has(char)) noData.push(char);
    } else if (!isKana(char) || !ctx.charset.has(char)) {
      noData.push(char);
    }
  }
  if (outOfLevel.length) errors.push(`kanji fuera del nivel: ${outOfLevel.join(' ')}`);
  if (noData.length) errors.push(`signos sin datos de trazo o no permitidos: ${noData.join(' ')}`);

  const usedTargets = [...new Set(glyphs.filter((char) => targetSet.has(char)))];
  if (ctx.level !== 'Kana' && usedTargets.length === 0) errors.push('no usa ningún kanji del nivel');

  if (!reading) errors.push('sin lectura');
  else if (!Array.from(reading.replace(/ /g, '')).every(isKana)) errors.push('la lectura debe ir solo en kana');
  if (ctx.level === 'Kana' && reading && readingKey(reading) !== readingKey(text)) {
    errors.push('en kana la lectura debe ser el mismo texto');
  }

  if (!hint) errors.push('sin pista en español');
  else if (hasJapanese(hint)) errors.push('la pista no puede llevar japonés');
  else if (hint.length > 90) warnings.push('pista larga');

  const key = textKey(text);
  if (ctx.seen?.has(key)) errors.push('frase repetida');

  let suggestion;
  if (!errors.length && ctx.tokenizer && ctx.level !== 'Kana') {
    const result = kuromojiReading(ctx.tokenizer, text);
    if (result.unknown.length) {
      warnings.push(`kuromoji no conoce: ${result.unknown.join(' ')}`);
    } else if (result.reading !== readingKey(reading)) {
      warnings.push(`lectura distinta: modelo «${reading}», kuromoji «${result.reading}»`);
      suggestion = result.reading;
    }
  }

  const item = {
    text,
    reading,
    hint,
    targets: ctx.level === 'Kana' ? [] : usedTargets
  };
  return { item, errors, warnings, suggestion };
}
