#!/usr/bin/env node
// Descarga los datos de trazo de kana, kanji N5 y vocabulario a public/chardata/
// para que esas lecciones funcionen sin conexión. Se ejecuta antes de `vite build`.
// Si no hay red, avisa y deja seguir el build: la app recurre al CDN en tiempo de uso.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'chardata');
mkdirSync(out, { recursive: true });

const JAPANESE = /[぀-ヿ一-鿿]/u;
const chars = new Set();

const kana = readFileSync(join(root, 'src/data/japanese/kana.ts'), 'utf8');
for (const char of kana) if (JAPANESE.test(char)) chars.add(char);

const kanji = readFileSync(join(root, 'src/data/japanese/kanjiDatabase.ts'), 'utf8');
const n5 = kanji.match(/const N5_TABLE = `([\s\S]*?)`/);
if (n5) for (const line of n5[1].trim().split('\n')) chars.add(line.split('|')[0]);

const fileName = (char) => `${char.codePointAt(0).toString(16)}.json`;
const sources = (char) => [
  `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/${encodeURIComponent(char)}.json`,
  `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`
];

let fetched = 0;
let skipped = 0;
const missing = [];
const queue = [...chars];

async function worker() {
  while (queue.length > 0) {
    const char = queue.shift();
    const target = join(out, fileName(char));
    if (existsSync(target)) {
      skipped += 1;
      continue;
    }
    let saved = false;
    for (const url of sources(char)) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        if (!Array.isArray(data.medians)) continue;
        writeFileSync(target, JSON.stringify(data));
        saved = true;
        fetched += 1;
        break;
      } catch {
        // Sin red: se intenta la siguiente fuente.
      }
    }
    if (!saved) missing.push(char);
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
console.log(`chardata: ${fetched} descargados, ${skipped} ya estaban, ${missing.length} sin datos.`);
if (missing.length > 0) console.warn(`chardata: sin datos para ${missing.join('')}. Se cargarán del CDN al usarse.`);
