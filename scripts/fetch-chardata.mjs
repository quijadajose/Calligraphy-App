#!/usr/bin/env node
// Descarga a public/chardata/ los datos de trazo de todos los signos japoneses del curso:
// kana, vocabulario y kanji N5 a N1. Se ejecuta antes de `vite build`.
//
// - Primero hanzi-writer-data (JSON). Si un signo no está, el SVG de KanjiVG.
// - Escribe chardata/index.json con dos listas: `core` (kana, N5 y vocabulario, que se
//   precargan al instalar la app) y `all` (todo, para «Descargar todo» en Ajustes).
// - Si no hay red, avisa y deja seguir el build: la app recurre al CDN en tiempo de uso.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'chardata');
mkdirSync(out, { recursive: true });

const JAPANESE = /[぀-ヿ一-鿿]/u;
const core = new Set();
const all = new Set();

const kana = readFileSync(join(root, 'src/data/japanese/kana.ts'), 'utf8');
for (const char of kana) {
  if (!JAPANESE.test(char)) continue;
  core.add(char);
  all.add(char);
}

const kanji = readFileSync(join(root, 'src/data/japanese/kanjiDatabase.ts'), 'utf8');
for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
  const table = kanji.match(new RegExp(`const ${level}_TABLE = \`([\\s\\S]*?)\``));
  if (!table) continue;
  for (const line of table[1].trim().split('\n')) {
    const char = line.split('|')[0].trim();
    if (!JAPANESE.test(char)) continue;
    all.add(char);
    if (level === 'N5') core.add(char);
  }
}

const KANJIVG_RELEASE = (readFileSync(join(root, 'src/core/evaluation/CharDataLoader.ts'), 'utf8').match(/KANJIVG_RELEASE = '([^']+)'/) ?? [])[1] ?? 'master';
const hex = (char) => char.codePointAt(0).toString(16);
const jsonName = (char) => `${hex(char)}.json`;
const svgName = (char) => `${hex(char)}.svg`;
const hanziSources = (char) => [
  `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/${encodeURIComponent(char)}.json`,
  `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`
];
const kanjiVgSource = (char) => `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@${KANJIVG_RELEASE}/kanji/${hex(char).padStart(5, '0')}.svg`;

let fetched = 0;
let skipped = 0;
const missing = [];
const fileOf = new Map();
const queue = [...all];

async function tryFetch(url, check) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const text = await response.text();
    return check(text) ? text : null;
  } catch {
    return null;
  }
}

async function worker() {
  while (queue.length > 0) {
    const char = queue.shift();
    const json = join(out, jsonName(char));
    const svg = join(out, svgName(char));
    if (existsSync(json)) {
      fileOf.set(char, jsonName(char));
      skipped += 1;
      continue;
    }
    if (existsSync(svg)) {
      fileOf.set(char, svgName(char));
      skipped += 1;
      continue;
    }
    let saved = false;
    for (const url of hanziSources(char)) {
      const text = await tryFetch(url, (body) => {
        try {
          return Array.isArray(JSON.parse(body).medians);
        } catch {
          return false;
        }
      });
      if (!text) continue;
      writeFileSync(json, text);
      fileOf.set(char, jsonName(char));
      saved = true;
      break;
    }
    if (!saved) {
      const text = await tryFetch(kanjiVgSource(char), (body) => body.includes('<path'));
      if (text) {
        writeFileSync(svg, text);
        fileOf.set(char, svgName(char));
        saved = true;
      }
    }
    if (saved) fetched += 1;
    else missing.push(char);
  }
}

await Promise.all(Array.from({ length: 12 }, worker));

const files = (set) => [...set].flatMap((char) => (fileOf.has(char) ? [fileOf.get(char)] : [])).sort();
writeFileSync(join(out, 'index.json'), JSON.stringify({ core: files(core), all: files(all) }));
console.log(`chardata: ${fetched} descargados, ${skipped} ya estaban, ${missing.length} sin datos (de ${all.size}).`);
if (missing.length > 0) console.warn(`chardata: sin datos para ${missing.join('')}. Se cargarán del CDN al usarse.`);
