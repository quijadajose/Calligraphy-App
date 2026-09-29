# Plan de Arquitectura y Desarrollo: CalligraphyApp (Vite + TypeScript)

## 1. Visión del Producto
Una aplicación web progresiva (PWA) de alto rendimiento optimizada para tablets con stylus (Samsung Tab / S-Pen), enfocada en el aprendizaje y perfeccionamiento de:
1. **Caligrafía Palmer / Cursiva (Español):** Dominio de inclinación a 52°, altura constante de x, ritmo y presión.
2. **Caligrafía Japonesa (Kanji / Kana):** Desglose trazo a trazo con orden estricto (*kakijun*), remates (*tome, hane, harai*), balance y proporciones.
3. **Modo Dictado y Velocidad:** Entrenamiento auditivo donde se exige escribir con rapidez mientras un algoritmo evalúa la legibilidad y precisión geométrica.

---

## 2. Pila Tecnológica (Tech Stack)

* **Core & Build Tool:** Vite + TypeScript.
* **Canvas Engine:** HTML5 Canvas 2D Context optimizado con doble buffer (OffscreenCanvas) o Pixi.js / WebGL para renderizado de curvas fluidas.
* **Manejo de Entrada Stylus:**
  * Pointer Events API (`pointerdown`, `pointermove`, `pointerup`).
  * `e.getCoalescedEvents()` para captura sub-frame de alta frecuencia.
  * `e.pressure`, `e.tiltX`, `e.tiltY`, y filtro `e.pointerType === 'pen'`.
  * `touch-action: none` para rechazo de palma.
* **Algoritmos y Matemáticas:**
  * **Splines:** Catmull-Rom o Curvas de Bézier cúbicas con grosor dinámico variable según presión y velocidad.
  * **Evaluación de Trazos:** DTW (*Dynamic Time Warping*) + Distancia de Fréchet discreta para comparar trazos del usuario contra vectores ideales.
* **Datos & Recursos:**
  * Base de datos vectorial de Kanjis: Datos abiertos de **KanjiVG** (trazos SVG y secuencias ordenadas).
  * Lecciones Palmer: Curvas maestras vectorizadas con puntos de control y vectores de inclinación (52°).
  * Dictado: Web Speech API (SpeechSynthesis) para reproducción de audio de frases y palabras.

---

## 3. Arquitectura Modular del Software

```
src/
├── core/
│   ├── engine/
│   │   ├── InkCanvas.ts           # Control del canvas, listeners de PointerEvents
│   │   ├── StrokeSmoother.ts      # Interpolación y suavizado de curvas (Catmull-Rom/Bézier)
│   │   ├── BrushRenderer.ts       # Renderizado de estilos de pluma (Estilográfica, Pincel Fude, Lápiz)
│   │   └── PalmRejection.ts       # Filtro estricto de eventos de stylus vs touch
│   ├── evaluation/
│   │   ├── StrokeEvaluator.ts     # Comparación geométrica (DTW / Fréchet)
│   │   ├── SlantAnalyzer.ts       # Medición de ángulo e inclinación (Palmer 52°)
│   │   ├── KanjiOrderValidator.ts # Verificación de secuencia y dirección de trazos
│   │   └── ScoringEngine.ts       # Cálculo de notas (0-100), velocidad y legibilidad
│   └── audio/
│       └── DictationService.ts    # Motor de voz (Web Speech TTS) y temporizador
├── data/
│   ├── palmer/
│   │   ├── exercises.ts           # Ejercicios básicos (óvalos, espirales, bucles)
│   │   ├── alphabet.ts            # Minúsculas y mayúsculas Palmer
│   │   └── words.ts               # Palabras y oraciones cursivas en español
│   └── japanese/
│       ├── kanjiDatabase.ts       # Kanjis N5 -> N1 (KanjiVG)
│       └── kana.ts                # Hiragana y Katakana
├── ui/
│   ├── components/
│   │   ├── Toolbar.ts             # Selección de plumas, color, grosor, guía
│   │   ├── LessonNavigator.ts     # Selector de niveles y lecciones
│   │   ├── ScoreModal.ts          # Feedback visual del puntaje y zonas a corregir
│   │   └── DictationOverlay.ts    # Interfaz para modo dictado contrarreloj
│   └── styles/
│       └── main.css               # Tema oscuro premium, estilo papel y minimalista
└── main.ts
```

---

## 4. Fases de Implementación

### Fase 1: Motor de Tinta y Sensibilidad S-Pen
- Configurar proyecto Vite + TS.
- Implementar `InkCanvas` con captura precisa de presión y coordenadas coalescidas.
- Algoritmo de suavizado de trazo para pluma caligráfica (ancho variable por presión y velocidad).
- Configuración de rechazo de palma para tablet.

### Fase 2: Pautas y Guías Visuales
- Cuadrícula milimétrica / Guías Palmer:
  - Línea de base, línea media (x-height), ascendente, descendente y líneas de inclinación a 52°.
- Cuadrícula Japonesa:
  - Cuadrícula con cruz centrada (*Genkouyoushi*).

### Fase 3: Módulo de Caligrafía Palmer (Español)
- Ejercicios preparatorios Palmer (taladrados rítmicos, óvalos continuos).
- Banco de letras y palabras conectadas.
- Algoritmo de evaluación: consistencia de inclinación y altura de letras.

### Fase 4: Módulo de Kanjis (Japonés)
- Integrador de KanjiVG (animación de orden de trazo, visualización fantasma).
- Validador en tiempo real: ¿empezó en el orden correcto?, ¿dirección correcta?
- Detección de remates (*tome, hane, harai*).

### Fase 5: Modo Dictado Contrarreloj
- Sintetizador de voz en español y japonés.
- Cronómetro dinámico con penalización por trazos desviados o ilegibles.
- Pantalla de estadísticas: PPM (palabras por minuto) vs precisión.
