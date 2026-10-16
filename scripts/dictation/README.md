# Dictados japoneses: generación y validación

Los dictados de la pestaña **Japonés → Dictado** (niveles Kana, N5 … N1) se generan con un LLM,
se validan con reglas y con un analizador morfológico, y se guardan como datos. La app no llama a
ningún LLM: solo lee `src/data/japanese/dictation/<nivel>.json`.

```
LLM ──► generate / ingest ──► validación ──► dictation/<nivel>.json ──► build ──► src/data/japanese/dictation/
            (lotes)             │                (fuente de verdad,          (solo frases «ok»)
                                │                 se versiona)
                                ├─ errores → dictation/rejected.jsonl
                                └─ avisos  → status «review» → judge / approve / drop
```

## Estado

Generado el 2026-10-15: 4.277 frases aprobadas (Kana 184, N5 158, N4 249, N3 619, N2 694, N1 2.373).
Cada objetivo aparece al menos 2 veces, salvo 嵯, 瑚 y 菖: solo se usan en 嵯峨, 珊瑚 y 菖蒲, y
峨/珊/蒲 no están en el curso (sin datos de trazo). Las lecturas marcadas por kuromoji se revisaron
a mano.

## Uso rápido

```bash
npm run dictation -- status --verbose          # cobertura: qué kanji faltan por nivel
ANTHROPIC_API_KEY=… npm run dictation -- generate --level N4      # genera hasta cubrir N4
npm run dictation -- judge --level N4          # un LLM resuelve las frases con avisos
npm run dictation -- review --level N4         # lo que siga dudoso, para revisarlo a mano
npm run dictation:build                        # escribe los datos que usa la app
npm test                                       # comprueba los datos generados
```

`generate --all` recorre Kana → N1. Es reanudable: cada lote se guarda al terminar, así que se puede
cortar y volver a lanzar.

## Proveedores

| `--provider` | Qué usa | Variables / opciones |
|---|---|---|
| `anthropic` (por defecto) | API de Anthropic | `ANTHROPIC_API_KEY`, `--model` (por defecto `claude-sonnet-5-5`) |
| `openai` | Cualquier API compatible: OpenAI, OpenRouter, **Ollama** (`http://host:11434/v1`), LM Studio, vLLM | `--base-url`, `--model`, `OPENAI_API_KEY` si hace falta |
| `claude-cli` | `claude -p` (tu sesión de Claude Code) | `--model`, `CLAUDE_BIN` |
| manual | Pegar el prompt en un chat | `prompt --level N4` y luego `ingest <respuesta.json> --level N4` |

Los modelos locales chicos fallan bastante en japonés: el validador los frena, pero se descartan
muchas frases. Con un modelo grande el rendimiento es mucho mejor.

## Cómo se asegura la cobertura

- Cada nivel tiene sus **objetivos**: los kanji de ese nivel (de `kanjiDatabase.ts`) o, en Kana,
  todos los kana con datos de trazo (salvo ぢヂヅヲ, que casi no se usan).
- `generate` toma hasta `--batch` (20) objetivos que tengan menos de `--min` (2) frases y pide
  `--per` (2) frases para cada uno. Repite hasta que ninguno quede por debajo del mínimo.
- Un objetivo que falla 4 lotes seguidos se informa al final y se salta (para no gastar sin fin).
- El modelo solo puede usar kanji de su nivel o de niveles anteriores: N5 solo N5, N4 hasta N4, etc.

## Validación

Errores (la frase se rechaza y queda en `dictation/rejected.jsonl`):

- de 3 a 10 signos sin contar espacios (cada signo ocupa un cuadro de la hoja);
- kanji de un nivel superior;
- signos sin datos de trazo o no permitidos: `ー`, vocales pequeñas, puntuación, letras, números;
- en N5–N1, al menos un kanji del nivel; en Kana, ningún kanji;
- lectura solo en kana; pista en español sin japonés;
- frases repetidas.

Avisos (la frase queda en `review` y no entra a la app hasta resolverse):

- la lectura del modelo no coincide con la de **kuromoji** (IPADIC);
- kuromoji no conoce alguna palabra.

kuromoji se equivoca a menudo con contadores (九時 → きゅうじ, 二人 → ににん) y con
〜よう日 escrito en kana. Por eso un aviso no descarta la frase: lo resuelve `judge` (un LLM ve
las dos lecturas y decide) o una persona con:

```bash
npm run dictation -- approve N5-0015 N5-0023          # la lectura del modelo está bien
npm run dictation -- use-kuromoji N4-0102             # usar la de kuromoji
npm run dictation -- set-reading N4-0102 きょうは あめ   # escribirla a mano
npm run dictation -- drop N4-0102 --note "poco natural"
```

`validate` vuelve a pasar todas las frases por las reglas (útil si cambian).

## Formato

`dictation/<nivel>.json` (una frase por línea):

```json
{"id":"N5-0001","status":"ok","text":"日よう日に あう","reading":"にちようびに あう","hint":"Nos vemos el domingo","targets":["日"],"source":"…","createdAt":"2026-10-15"}
```

`status`: `ok` (entra a la app), `review` (pendiente), `dropped` (descartada; se guarda para que no
se vuelva a generar).

`src/data/japanese/dictation/<nivel>.json` es compacto: `[id, texto, lectura, pista]`. La app lee
la **lectura** en voz alta (las voces del sistema leen mal muchos kanji) y muestra la **pista**
durante el dictado.

## Audio de los dictados

Cada lección que se puede dictar tiene su audio grabado en `public/audio/<id>.ogg` (Opus 24 kbps,
mono, ~5 KB por frase; 4.402 archivos, 23 MB). La app lo reproduce y, si falta, usa la voz del
sistema. No se precarga al instalar: se guarda al oírlo o con «Descargar todo» en Ajustes.

Se graba con las voces neuronales de Microsoft Edge (`edge-tts`, necesita internet) y `ffmpeg`:

```bash
python3 -m venv ~/.edge-venv && ~/.edge-venv/bin/pip install edge-tts
npm run audio:list                                        # textos a grabar → dictation/audio-list.json
~/.edge-venv/bin/python scripts/dictation/audio.py --jobs 16
```

Solo graba lo nuevo o lo que cambió (`dictation/audio-manifest.json` guarda voz, velocidad y texto)
y borra los audios de lecciones que ya no existen. Voces: `VOICE_JA` (por defecto
`ja-JP-NanamiNeural`), `VOICE_ES` (`es-CL-CatalinaNeural`), velocidad `VOICE_RATE` (`-10%`).
En japonés se lee la lectura en kana revisada, no el texto con kanji. Las planas y enlaces de
español no se graban (son letras repetidas). `edge-tts` usa el servicio de lectura en voz alta de
Edge, que no es una API oficial: sirve para un proyecto personal, pero puede dejar de funcionar.
