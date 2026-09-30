import { defineConfig } from 'vite';

const pagesBase = process.env.GITHUB_ACTIONS ? '/Calligraphy-App/' : '/';

export default defineConfig({
  base: pagesBase,
  server: {
    host: '0.0.0.0', // Accesible en red local para probar directo en la Samsung Tab
    port: 5173
  }
});
