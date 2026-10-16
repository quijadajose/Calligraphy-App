// Prompts para generar dictados y para juzgar los dudosos.
import { MAX_GLYPHS, MIN_GLYPHS } from './lib.mjs';

const FORMAT = `Responde SOLO con un arreglo JSON, sin texto antes ni después:
[{"text": "...", "reading": "...", "hint": "...", "targets": ["..."]}]`;

/**
 * batch: objetivos de este lote ({c, r, m}); avoid: frases ya hechas (para no repetir).
 */
export function generationPrompt(ctx, batch, { per, avoid = [] }) {
  const kana = ctx.kana.join('');
  const rules = [
    `Cada frase tiene entre ${MIN_GLYPHS} y ${MAX_GLYPHS} signos japoneses sin contar los espacios (cada signo ocupa un cuadro de la hoja). Prefiere frases de 5 a 9 signos.`,
    ctx.level === 'Kana'
      ? 'No uses ningún kanji: todo va en hiragana o katakana.'
      : `Kanji permitidos (solo estos; cualquier otra palabra va en kana): ${[...ctx.allowedKanji].join('')}`,
    `Kana permitidos (solo estos): ${kana}`,
    'Prohibido: la raya de alargamiento ー, las vocales pequeñas ぁぃぅぇぉァィゥェォ, puntuación (、。！？「」), espacios japoneses, letras latinas y números.',
    'Separa las palabras o grupos con un espacio normal, como en los libros infantiles (ej: きょうは いい てんき).',
    'reading: la frase entera en hiragana, con los mismos espacios. Partículas como se escriben (は, へ, を), no como suenan. Usa la lectura más natural en ese contexto.',
    'hint: traducción breve al español neutro (máximo 8 palabras), sin japonés ni romaji. Debe bastar para saber qué palabra es cuando hay homófonos.',
    ctx.level === 'Kana' ? 'targets: deja el arreglo vacío.' : 'targets: los kanji de la lista objetivo que aparecen en la frase.',
    'Frases naturales y útiles para la vida diaria; nada forzado, ofensivo ni repetido. Varía la gramática (afirmaciones, preguntas sin signo, pedidos, pasado).'
  ];
  const goal = ctx.level === 'Kana'
    ? `Escribe frases que, entre todas, usen varias veces cada uno de estos kana: ${batch.map((t) => t.c).join(' ')}. Unas ${per * Math.ceil(batch.length / 2)} frases en total; mezcla hiragana y algunas palabras en katakana que no lleven ー.`
    : `Escribe ${per} frases distintas para CADA uno de estos kanji (la frase debe contenerlo, usado en una palabra común):\n` +
      batch.map((t) => `- ${t.c} (${t.r}): ${t.m}`).join('\n');
  const avoidList = avoid.length ? `\nNo repitas estas frases ya existentes:\n${avoid.map((text) => `- ${text}`).join('\n')}\n` : '';
  return `Eres profesor de japonés y preparas dictados para alguien de habla hispana que practica escritura a mano (nivel ${ctx.level}).

Reglas:
${rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

${goal}
${avoidList}
${FORMAT}`;
}

/** Revisión de dictados con avisos (sobre todo lecturas que no coinciden con kuromoji). */
export function judgePrompt(items) {
  const list = items.map((item) => ({
    id: item.id,
    text: item.text,
    reading_model: item.reading,
    reading_kuromoji: item.suggestion ?? null,
    hint: item.hint,
    warnings: item.warnings
  }));
  return `Eres un revisor experto de japonés. Cada entrada es una frase de dictado con la lectura que dio un modelo y la que calcula un analizador morfológico (kuromoji, que a veces se equivoca con lecturas poco comunes o nombres).

Para cada una decide:
- "ok": la frase es natural y correcta. Devuelve en "reading" la lectura correcta en hiragana, con los espacios de "text" (partículas como se escriben: は, へ, を). Puede ser la del modelo, la de kuromoji u otra.
- "drop": la frase es poco natural, ambigua sin remedio o tiene errores.

Si "hint" no corresponde a la frase, corrígelo en "hint" (español, máximo 8 palabras).

Entradas:
${JSON.stringify(list, null, 1)}

Responde SOLO con un arreglo JSON:
[{"id": "...", "verdict": "ok" | "drop", "reading": "...", "hint": "...", "note": "motivo breve"}]`;
}
