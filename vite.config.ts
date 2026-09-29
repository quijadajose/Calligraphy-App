import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // Accesible en red local para probar directo en la Samsung Tab
    port: 5173
  }
});
