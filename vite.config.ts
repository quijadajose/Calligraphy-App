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

/** Escribe en dist/sw.js la lista de archivos del build para precargarlos (app sin conexión). */
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
        .filter((file) => file !== 'sw.js' && !file.endsWith('.map'));
      const source = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, source.replace('/*__PRECACHE__*/[]', JSON.stringify(files.map((file) => `./${file}`))));
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
