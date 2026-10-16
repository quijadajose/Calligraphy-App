#!/usr/bin/env python3
"""Graba el audio de cada dictado con las voces neuronales de Microsoft Edge (edge-tts).

Lee dictation/audio-list.json (lo escribe scripts/dictation/audio-list.ts) y deja un .ogg
(Opus 24 kbps, mono) por lección en public/audio/. Solo graba lo nuevo o lo que cambió:
dictation/audio-manifest.json guarda voz, velocidad y texto de cada archivo.

Requisitos: edge-tts (pip install edge-tts) y ffmpeg. Necesita internet.
Uso: python3 scripts/dictation/audio.py [--jobs 6] [--limit N] [--force]
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys
import tempfile

import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LIST = os.path.join(ROOT, 'dictation', 'audio-list.json')
MANIFEST = os.path.join(ROOT, 'dictation', 'audio-manifest.json')
OUT = os.path.join(ROOT, 'public')

VOICES = {
    'ja-JP': os.environ.get('VOICE_JA', 'ja-JP-NanamiNeural'),
    'es-ES': os.environ.get('VOICE_ES', 'es-CL-CatalinaNeural'),
}
RATE = os.environ.get('VOICE_RATE', '-10%')


def key(item):
    return f"{VOICES[item['lang']]}|{RATE}|{item['text']}"


async def record(item, tmpdir):
    mp3 = os.path.join(tmpdir, item['file'].replace('/', '_') + '.mp3')
    target = os.path.join(OUT, item['file'])
    os.makedirs(os.path.dirname(target), exist_ok=True)
    last = None
    for attempt in range(4):
        try:
            await edge_tts.Communicate(item['text'], VOICES[item['lang']], rate=RATE).save(mp3)
            subprocess.run(
                ['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-c:a', 'libopus', '-b:a', '24k', target],
                check=True,
            )
            os.remove(mp3)
            return True
        except Exception as error:  # red, límite de peticiones, etc.
            last = error
            await asyncio.sleep(2 * (attempt + 1))
    print(f"  ✗ {item['id']}: {last}", file=sys.stderr)
    return False


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--jobs', type=int, default=6)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    items = json.load(open(LIST, encoding='utf-8'))
    manifest = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {}
    todo = [
        item for item in items
        if args.force or manifest.get(item['file']) != key(item) or not os.path.exists(os.path.join(OUT, item['file']))
    ]
    if args.limit:
        todo = todo[: args.limit]
    print(f'{len(items)} textos, {len(todo)} por grabar ({args.jobs} a la vez)')

    semaphore = asyncio.Semaphore(args.jobs)
    done = 0
    failed = 0

    with tempfile.TemporaryDirectory() as tmpdir:
        async def run(item):
            nonlocal done, failed
            async with semaphore:
                ok = await record(item, tmpdir)
            if ok:
                manifest[item['file']] = key(item)
            else:
                failed += 1
            done += 1
            if done % 100 == 0 or done == len(todo):
                print(f'  {done}/{len(todo)}')
                json.dump(manifest, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

        await asyncio.gather(*(run(item) for item in todo))

    # Audios de lecciones que ya no existen.
    wanted = {item['file'] for item in items}
    for file in list(manifest):
        if file not in wanted:
            path = os.path.join(OUT, file)
            if os.path.exists(path):
                os.remove(path)
            del manifest[file]
    json.dump(manifest, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in manifest if os.path.exists(os.path.join(OUT, f)))
    print(f'Listo: {len(manifest)} audios, {total / 1e6:.1f} MB. Fallaron {failed}.')


asyncio.run(main())
