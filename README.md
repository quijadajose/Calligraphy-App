# Calligraphy

Práctica diaria de caligrafía Palmer (cursiva) y japonesa (kana y kanji) con lápiz óptico, pensada para tableta. Funciona sin conexión y guarda todo en el dispositivo.

## Uso

```bash
npm install
npm run dev        # http://localhost:5173, también accesible desde la tableta en la red local
npm test           # pruebas de evaluación, progreso y plan del día (Vitest)
npm run build      # descarga datos de trazo, comprueba tipos y compila en dist/
```

`npm run build` ejecuta antes `scripts/fetch-chardata.mjs`, que guarda en `public/chardata/` los trazos de kana, kanji N5 y el vocabulario para que esas lecciones funcionen sin red. Si no hay conexión, avisa y el build sigue: esos caracteres se piden al CDN la primera vez que se abren y el service worker los guarda.

## Cómo está organizado

| Carpeta | Qué hay |
|---|---|
| `src/main.ts` | Arranque, pantallas (con historial: el botón atrás funciona), respaldo, recordatorio. |
| `src/app/Studio.ts` | La hoja de práctica: abrir lección, pasos Palmer, dictado, calificar, borradores. |
| `src/core/engine/` | Motor de tinta: cuatro capas de canvas, filtro One Euro, rechazo de palma, goma por trazo. |
| `src/core/evaluation/` | Nota: silueta de líneas (oraciones, planas, dictado), copias de kanji por cuadro, inclinación, altura. |
| `src/core/progress/` | Progreso con esquema versionado, repaso espaciado, racha y registro diario. |
| `src/core/daily/` | Plan del día: calentamiento, repasos, nuevas, plana. |
| `src/core/storage/` | `localStorage` seguro y hojas/borradores en IndexedDB. |
| `src/data/` | Lecciones: Palmer, enlaces, planas, palabras, oraciones, dictados, kana, kanji N5–N1, vocabulario. |
| `src/ui/` | Componentes de interfaz. |
| `tests/` | Pruebas con Vitest. |

## Datos

Todo vive en el dispositivo: progreso y ajustes en `localStorage`, hojas calificadas y borradores en IndexedDB. Desde Ajustes o Progreso se exporta un respaldo JSON (progreso, ajustes, tema y hojas) que se puede importar en otro dispositivo.

## Créditos

Trazos de [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) y [KanjiVG](https://kanjivg.tagaini.net/) (CC BY-SA 3.0).
