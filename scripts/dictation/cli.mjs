#!/usr/bin/env node
// Pipeline de dictados japoneses: genera con un LLM por lotes, valida, lleva la cobertura
// de cada kanji y construye los datos que usa la app. Ver scripts/dictation/README.md.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  DATA_DIR, LEVELS, OUT_DIR, ROOT, coverage, glyphsOf, levelContext, loadCharset, loadItems, loadKanji,
  logRejected, nextId, saveItems, textKey
} from './lib.mjs';
import { generationPrompt, judgePrompt } from './prompts.mjs';
import { complete, parseJsonArray } from './providers.mjs';
import { getTokenizer, validateItem } from './validate.mjs';

// ------------------------------------------------------------------ argumentos
const argv = process.argv.slice(2);
const command = argv[0] ?? 'help';
const positional = [];
const flags = {};
for (let i = 1; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith('--')) {
    const [key, inline] = arg.slice(2).split('=');
    if (inline !== undefined) flags[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
    else flags[key] = true;
  } else positional.push(arg);
}
const num = (key, fallback) => (flags[key] !== undefined ? Number(flags[key]) : fallback);
const MIN = num('min', 2);
const BATCH = num('batch', 20);
const PER = num('per', 2);

function levelsFromFlags() {
  if (flags.level) return String(flags.level).split(',');
  if (flags.all) return LEVELS;
  return LEVELS;
}

let shared;
function context(level) {
  shared ??= { kanji: loadKanji(), charset: loadCharset() };
  return levelContext(level, shared.kanji, shared.charset);
}

// ------------------------------------------------------------------ núcleo
/** Valida respuestas del modelo y agrega las buenas. Devuelve cuántas entraron y cuántas no. */
function ingestRaw(level, ctx, items, rawList, tokenizer, source) {
  const seen = new Set(items.map((item) => textKey(item.text)));
  const makeId = nextId(level, items);
  let added = 0;
  let review = 0;
  let rejected = 0;
  for (const raw of rawList) {
    const result = validateItem(raw, { ...ctx, seen, tokenizer });
    if (result.errors.length) {
      rejected += 1;
      logRejected({ level, source, raw, errors: result.errors });
      continue;
    }
    seen.add(textKey(result.item.text));
    const item = {
      id: makeId(added),
      status: result.warnings.length ? 'review' : 'ok',
      ...result.item,
      source,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    if (result.warnings.length) {
      item.warnings = result.warnings;
      if (result.suggestion) item.suggestion = result.suggestion;
      review += 1;
    }
    items.push(item);
    added += 1;
  }
  return { added, review, rejected };
}

function pendingTargets(ctx, items, attempts) {
  const counts = coverage(ctx, items);
  return ctx.targets.filter((target) => counts.get(target.c) < MIN && (attempts.get(target.c) ?? 0) < 4);
}

/** Algunas frases ya hechas con los mismos objetivos, para que el modelo no las repita. */
function avoidFor(batch, items) {
  const chars = new Set(batch.map((target) => target.c));
  return items
    .filter((item) => item.status !== 'dropped' && glyphsOf(item.text).some((char) => chars.has(char)))
    .slice(-40)
    .map((item) => item.text);
}

function batchPrompt(ctx, items, attempts = new Map()) {
  const pending = pendingTargets(ctx, items, attempts);
  if (!pending.length) return null;
  const batch = pending.slice(0, BATCH);
  return { batch, prompt: generationPrompt(ctx, batch, { per: PER, avoid: avoidFor(batch, items) }) };
}

function providerOptions() {
  return { model: flags.model, baseUrl: flags['base-url'], temperature: flags.temperature ? Number(flags.temperature) : undefined };
}

// ------------------------------------------------------------------ comandos
async function generate() {
  const provider = flags.provider ?? 'anthropic';
  const maxBatches = num('max-batches', Infinity);
  const tokenizer = await getTokenizer();
  let done = 0;
  for (const level of levelsFromFlags()) {
    const ctx = context(level);
    const items = loadItems(level);
    const attempts = new Map();
    while (done < maxBatches) {
      const next = batchPrompt(ctx, items, attempts);
      if (!next) break;
      const before = coverage(ctx, items);
      const label = next.batch.map((target) => target.c).join('');
      process.stdout.write(`[${level}] lote ${label} … `);
      let raw;
      try {
        raw = parseJsonArray(await complete(provider, next.prompt, providerOptions()));
      } catch (error) {
        console.log(`falló: ${error.message}`);
        for (const target of next.batch) attempts.set(target.c, (attempts.get(target.c) ?? 0) + 1);
        done += 1;
        continue;
      }
      const result = ingestRaw(level, ctx, items, raw, tokenizer, `${provider}:${flags.model ?? 'default'}`);
      const after = coverage(ctx, items);
      for (const target of next.batch) {
        if (after.get(target.c) <= before.get(target.c)) attempts.set(target.c, (attempts.get(target.c) ?? 0) + 1);
      }
      saveItems(level, items);
      console.log(`+${result.added} (${result.review} a revisar), ${result.rejected} rechazadas`);
      done += 1;
    }
    const stuck = [...attempts.entries()].filter(([, n]) => n >= 4).map(([char]) => char);
    if (stuck.length) console.log(`[${level}] sin lograr tras 4 intentos: ${stuck.join(' ')}`);
    if (done >= maxBatches) break;
  }
  status();
}

/** Modo manual: deja el prompt del siguiente lote en dictation/inbox para pegarlo en un chat. */
function prompt() {
  const level = String(flags.level ?? 'N5');
  const ctx = context(level);
  const items = loadItems(level);
  const next = batchPrompt(ctx, items);
  if (!next) {
    console.log(`[${level}] cobertura completa: no hay lote pendiente.`);
    return;
  }
  const dir = join(DATA_DIR, 'inbox');
  mkdirSync(dir, { recursive: true });
  const name = `${level}-${Date.now()}`;
  const path = join(dir, `${name}.prompt.md`);
  writeFileSync(path, next.prompt);
  console.log(`Prompt: ${relative(ROOT, path)}`);
  console.log(`Objetivos: ${next.batch.map((target) => target.c).join(' ')}`);
  console.log(`Guarda la respuesta en dictation/inbox/${name}.json y corre:\n  npm run dictation -- ingest dictation/inbox/${name}.json --level ${level}`);
}

async function ingest() {
  const level = String(flags.level ?? '');
  if (!LEVELS.includes(level)) throw new Error('ingest necesita --level');
  const ctx = context(level);
  const items = loadItems(level);
  const tokenizer = await getTokenizer();
  let total = { added: 0, review: 0, rejected: 0 };
  for (const file of positional) {
    const raw = file.endsWith('.txt') ? parseLines(readFileSync(file, 'utf8'), level) : parseJsonArray(readFileSync(file, 'utf8'));
    const result = ingestRaw(level, ctx, items, raw, tokenizer, String(flags.source ?? 'manual'));
    total = { added: total.added + result.added, review: total.review + result.review, rejected: total.rejected + result.rejected };
  }
  saveItems(level, items);
  console.log(`[${level}] +${total.added} (${total.review} a revisar), ${total.rejected} rechazadas (ver dictation/rejected.jsonl)`);
}

/** Formato rápido para lotes escritos a mano: una frase por línea, «texto|lectura|pista» (en Kana, «texto|pista»). */
function parseLines(source, level) {
  return source.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    if (level === 'Kana' && parts.length === 2) return { text: parts[0], reading: parts[0], hint: parts[1] };
    return { text: parts[0], reading: parts[1], hint: parts[2] };
  });
}

/** Vuelve a validar todo (p. ej. tras cambiar las reglas o los datos de trazo). */
async function validate() {
  const tokenizer = await getTokenizer();
  for (const level of levelsFromFlags()) {
    const ctx = context(level);
    const items = loadItems(level);
    const seen = new Set();
    let dropped = 0;
    let review = 0;
    for (const item of items) {
      if (item.status === 'dropped') continue;
      const result = validateItem(item, { ...ctx, seen, tokenizer });
      seen.add(textKey(item.text));
      if (result.errors.length) {
        item.status = 'dropped';
        item.note = result.errors.join('; ');
        dropped += 1;
        continue;
      }
      item.targets = result.item.targets;
      if (item.approved || item.judged) continue;
      if (result.warnings.length) {
        item.status = 'review';
        item.warnings = result.warnings;
        if (result.suggestion) item.suggestion = result.suggestion;
        review += 1;
      } else {
        item.status = 'ok';
        delete item.warnings;
        delete item.suggestion;
      }
    }
    saveItems(level, items);
    console.log(`[${level}] ${items.length} frases · ${review} a revisar · ${dropped} descartadas ahora`);
  }
}

function review() {
  for (const level of levelsFromFlags()) {
    for (const item of loadItems(level).filter((entry) => entry.status === 'review')) {
      console.log(`${item.id}  ${item.text}  [${item.reading}]  «${item.hint}»`);
      for (const warning of item.warnings ?? []) console.log(`    ⚠ ${warning}`);
    }
  }
}

/** Un LLM decide los dudosos: confirma la lectura correcta o descarta la frase. */
async function judge() {
  const provider = flags.provider ?? 'anthropic';
  const size = num('batch', 25);
  for (const level of levelsFromFlags()) {
    const items = loadItems(level);
    const pending = items.filter((item) => item.status === 'review');
    for (let start = 0; start < pending.length; start += size) {
      const chunk = pending.slice(start, start + size);
      process.stdout.write(`[${level}] juzgando ${chunk.length} … `);
      let verdicts;
      try {
        verdicts = parseJsonArray(await complete(provider, judgePrompt(chunk), providerOptions()));
      } catch (error) {
        console.log(`falló: ${error.message}`);
        continue;
      }
      let ok = 0;
      let drop = 0;
      for (const verdict of verdicts) applyVerdict(items, verdict) === 'ok' ? ok++ : drop++;
      saveItems(level, items);
      console.log(`${ok} ok, ${drop} descartadas`);
    }
  }
}

function applyVerdict(items, verdict) {
  const item = items.find((entry) => entry.id === verdict.id);
  if (!item) return 'drop';
  const reading = String(verdict.reading ?? '').trim();
  const kanaOnly = reading && Array.from(reading.replace(/\s/g, '')).every((char) => /[ぁ-ゖァ-ヺ]/u.test(char));
  if (verdict.verdict === 'ok' && kanaOnly) {
    item.reading = reading.replace(/\s+/g, ' ');
    if (verdict.hint) item.hint = String(verdict.hint).trim();
    item.status = 'ok';
    item.judged = true;
    delete item.warnings;
    delete item.suggestion;
    return 'ok';
  }
  item.status = 'dropped';
  item.note = verdict.note ?? 'descartada por el juez';
  return 'drop';
}

function editItems(ids, change) {
  for (const level of LEVELS) {
    const items = loadItems(level);
    let touched = false;
    for (const item of items) {
      if (!ids.includes(item.id)) continue;
      change(item);
      touched = true;
      console.log(`${item.id}: ${item.status}  ${item.text} [${item.reading}]`);
    }
    if (touched) saveItems(level, items);
  }
}

function approve() {
  editItems(positional, (item) => {
    item.status = 'ok';
    item.approved = true;
    delete item.warnings;
    delete item.suggestion;
  });
}

function useKuromoji() {
  editItems(positional, (item) => {
    if (!item.suggestion) return;
    // La sugerencia viene sin espacios: se reparten como en el texto cuando el largo calza.
    item.reading = spaceLike(item.text, item.reading, item.suggestion);
    item.status = 'ok';
    item.approved = true;
    delete item.warnings;
    delete item.suggestion;
  });
}

function spaceLike(text, oldReading, plain) {
  const groups = oldReading.split(' ');
  if (groups.length === 1) return plain;
  const total = groups.join('').length;
  if (total !== plain.length) return plain;
  let at = 0;
  return groups.map((group) => plain.slice(at, (at += group.length))).join(' ');
}

function setReading() {
  const [id, ...rest] = positional;
  editItems([id], (item) => {
    item.reading = rest.join(' ');
    item.status = 'ok';
    item.approved = true;
    delete item.warnings;
    delete item.suggestion;
  });
}

function drop() {
  editItems(positional, (item) => {
    item.status = 'dropped';
    item.note = flags.note ?? 'descartada a mano';
  });
}

/** Escribe src/data/japanese/dictation/<nivel>.json con los dictados aprobados. */
function build() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const level of LEVELS) {
    const rows = loadItems(level)
      .filter((item) => item.status === 'ok')
      .map((item) => [item.id, item.text, item.reading, item.hint]);
    writeFileSync(join(OUT_DIR, `${level}.json`), JSON.stringify(rows) + '\n');
    console.log(`${level}: ${rows.length} dictados → ${relative(ROOT, join(OUT_DIR, `${level}.json`))}`);
  }
}

function status() {
  console.log('\nNivel  objetivos  cubiertos(≥' + MIN + ')  faltan  frases ok  a revisar  descartadas');
  for (const level of LEVELS) {
    const ctx = context(level);
    const items = loadItems(level);
    const counts = coverage(ctx, items);
    const okCounts = coverage(ctx, items.filter((item) => item.status === 'ok'));
    const covered = [...counts.values()].filter((n) => n >= MIN).length;
    const missing = ctx.targets.filter((target) => counts.get(target.c) < MIN);
    const by = (status) => items.filter((item) => item.status === status).length;
    console.log(
      `${level.padEnd(6)} ${String(ctx.targets.length).padStart(9)}  ${String(covered).padStart(15)}  ${String(missing.length).padStart(6)}  ${String(by('ok')).padStart(9)}  ${String(by('review')).padStart(9)}  ${String(by('dropped')).padStart(11)}`
    );
    if (flags.verbose && missing.length) console.log(`       faltan: ${missing.map((target) => target.c).join('')}`);
    const weak = ctx.targets.filter((target) => counts.get(target.c) >= MIN && okCounts.get(target.c) < MIN);
    if (flags.verbose && weak.length) console.log(`       cubiertos solo con frases a revisar: ${weak.map((target) => target.c).join('')}`);
  }
}

function help() {
  console.log(`Uso: npm run dictation -- <comando> [opciones]

  status [--verbose] [--min 2]          Cobertura por nivel (qué kanji faltan).
  generate --level N5 [--all]           Genera lotes con un LLM hasta cubrir cada objetivo --min veces.
           --provider anthropic|openai|claude-cli  --model <id>  --base-url <url>
           --batch 20 --per 2 --max-batches N
  prompt --level N5                     Modo manual: escribe el prompt del siguiente lote en dictation/inbox.
  ingest <archivo.json|.txt> --level N5 Agrega un lote validándolo (.txt: «texto|lectura|pista» por línea).
  validate [--level N5]                 Revalida todo con las reglas actuales.
  review [--level N5]                   Lista las frases con avisos.
  judge [--level N5] --provider …       Un LLM resuelve los avisos (lectura correcta o descartar).
  approve <id…> | use-kuromoji <id…> | set-reading <id> <lectura> | drop <id…> [--note …]
  build                                 Escribe los dictados aprobados en src/data/japanese/dictation/.`);
}

const COMMANDS = { generate, prompt, ingest, validate, review, judge, approve, 'use-kuromoji': useKuromoji, 'set-reading': setReading, drop, build, status, help };
const run = COMMANDS[command] ?? help;
Promise.resolve(run()).catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
