import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const pagesBase = process.env.GITHUB_ACTIONS ? '/Calligraphy-App/' : '/';

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/** Fuentes .woff: los navegadores que corren la app usan .woff2; no hace falta guardarlas. */
const isLegacyFont = (file: string) => file.endsWith('.woff');
/** Los trozos de la fuente japonesa: se bajan al usarse o con «Descargar todo». */
const isJapaneseFont = (file: string) => /noto-serif-jp-.*\.woff2$/.test(file);

/**
 * La fuente japonesa viene partida en ~120 trozos por rango Unicode. Devuelve los números
 * de trozo que cubren `codes` (kana, N5 y vocabulario), para precargar solo esos.
 */
function fontChunksFor(codes: number[]): Set<number> {
  const needed = new Set<number>();
  let css = '';
  try {
    css = readFileSync(join('node_modules', '@fontsource', 'noto-serif-jp', '400.css'), 'utf8');
  } catch {
    return needed;
  }
  for (const block of css.split('@font-face').slice(1)) {
    const index = block.match(/noto-serif-jp-(\d+)-400-normal\.woff2/);
    const ranges = block.match(/unicode-range:\s*([^;]+);/);
    if (!index || !ranges) continue;
    const spans = ranges[1].split(',').map((part) => {
      const [from, to] = part.trim().replace(/^U\+/i, '').split('-');
      return [parseInt(from, 16), parseInt(to ?? from, 16)] as const;
    });
    if (codes.some((code) => spans.some(([a, b]) => code >= a && code <= b))) needed.add(Number(index[1]));
  }
  return needed;
}

/**
 * Al terminar el build:
 * - dist/sw.js recibe la lista de archivos a precargar al instalar: la app, los íconos y
 *   los trazos de kana, N5 y vocabulario.
 * - dist/offline-manifest.json lista lo demás (trazos de N4 a N1 y la fuente japonesa)
 *   para que «Descargar todo» en Ajustes lo guarde y la app funcione entera sin red.
 */
function precacheManifest(): Plugin {
  let outDir = 'dist';
  return {
    name: 'calligraphy-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      const files = listFiles(outDir)
        .map((file) => relative(outDir, file).split('\\').join('/'))
        .filter((file) => file !== 'sw.js' && !file.endsWith('.map') && !isLegacyFont(file));

      let core = new Set<string>();
      try {
        const index = JSON.parse(readFileSync(join(outDir, 'chardata', 'index.json'), 'utf8')) as { core?: string[] };
        core = new Set((index.core ?? []).map((name) => `chardata/${name}`));
      } catch {
        // Sin datos de trazo descargados: la app los pide al CDN.
      }
      const coreCodes = [...core].map((file) => parseInt(file.slice('chardata/'.length), 16)).filter(Number.isFinite);
      const coreFont = fontChunksFor(coreCodes);
      const isCoreFont = (file: string) => {
        const match = file.match(/noto-serif-jp-(\d+)-400-normal/);
        return !!match && coreFont.has(Number(match[1]));
      };
      const isExtraChar = (file: string) => file.startsWith('chardata/') && file !== 'chardata/index.json' && !core.has(file);
      const later = files.filter((file) => isExtraChar(file) || (isJapaneseFont(file) && !isCoreFont(file)));
      const deferred = new Set(later);
      const precache = files.filter((file) => !deferred.has(file));

      const bytes = later.reduce((sum, file) => sum + statSync(join(outDir, file)).size, 0);
      writeFileSync(join(outDir, 'offline-manifest.json'), JSON.stringify({ files: later, bytes }));
      const source = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, source.replace('/*__PRECACHE__*/[]', JSON.stringify(precache.map((file) => `./${file}`))));
    }
  };
}

export default defineConfig({
  base: pagesBase,
  plugins: [precacheManifest()],
  server: {
    host: '0.0.0.0', // Accesible en red local para probar directo en la Samsung Tab
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        // Los datos de kanji van aparte: cambian poco y el navegador los guarda en caché.
        manualChunks(id) {
          if (id.includes('/src/data/japanese/')) return 'kanji-data';
          if (id.includes('node_modules/hanzi-writer')) return 'hanzi-writer';
          return undefined;
        }
      }
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
} as Parameters<typeof defineConfig>[0]);
