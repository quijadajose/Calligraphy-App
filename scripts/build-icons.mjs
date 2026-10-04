#!/usr/bin/env node
// Genera src/styles/icons.css con solo los íconos de Tabler que usa la app.
// Cada ícono es una máscara SVG embebida: no hace falta red ni la fuente completa.
// Se usa igual que la fuente web: <i class="ti ti-flame"></i>, con el tamaño de font-size.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconDir = join(root, 'node_modules', '@tabler', 'icons', 'icons', 'outline');

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

const sources = [join(root, 'index.html'), ...listFiles(join(root, 'src')).filter((file) => /\.(ts|html)$/.test(file))];
const names = new Set();
for (const file of sources) {
  for (const match of readFileSync(file, 'utf8').matchAll(/\bti-([a-z0-9]+(?:-[a-z0-9]+)*)/g)) names.add(match[1]);
}

const rules = [];
const missing = [];
for (const name of [...names].sort()) {
  let svg;
  try {
    svg = readFileSync(join(iconDir, `${name}.svg`), 'utf8');
  } catch {
    missing.push(name);
    continue;
  }
  const compact = svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sclass="[^"]*"/g, '')
    .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim();
  const data = `url("data:image/svg+xml,${encodeURIComponent(compact).replace(/'/g, '%27')}")`;
  rules.push(`.ti-${name} { --ti: ${data}; }`);
}

const css = `/* Generado por scripts/build-icons.mjs. No editar a mano. */
.ti {
  display: inline-block;
  width: 1em;
  height: 1em;
  line-height: 1;
  vertical-align: -0.125em;
  flex-shrink: 0;
  font-style: normal;
}

.ti::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background-color: currentColor;
  -webkit-mask: var(--ti) center / contain no-repeat;
  mask: var(--ti) center / contain no-repeat;
}

${rules.join('\n')}
`;
writeFileSync(join(root, 'src', 'styles', 'icons.css'), css);
console.log(`icons: ${rules.length} íconos${missing.length ? `; sin archivo: ${missing.join(', ')}` : ''}.`);
