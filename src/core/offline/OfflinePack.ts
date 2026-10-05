/**
 * «Descargar todo para usar sin conexión».
 *
 * El build deja en offline-manifest.json lo que no se precarga al instalar (trazos de
 * N4 a N1 y los trozos de la fuente japonesa). Aquí se bajan y se guardan en una caché
 * propia que el service worker consulta y no borra al actualizar la app.
 */

const CACHE = 'calligraphy-offline';

export interface OfflineStatus {
  /** false: el navegador no tiene Cache API o no es la app publicada (modo desarrollo). */
  available: boolean;
  have: number;
  total: number;
  bytes: number;
  missingBytes: number;
}

interface Manifest {
  files: string[];
  bytes: number;
}

function base(): string {
  const value = import.meta.env.BASE_URL;
  return typeof value === 'string' ? value : '/';
}

async function readManifest(): Promise<Manifest | null> {
  try {
    const response = await fetch(`${base()}offline-manifest.json`, { cache: 'no-cache' });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<Manifest>;
    return Array.isArray(data.files) ? { files: data.files, bytes: Number(data.bytes) || 0 } : null;
  } catch {
    return null;
  }
}

const urlOf = (file: string) => new URL(`${base()}${file}`, location.href).href;

async function missingFiles(manifest: Manifest): Promise<string[]> {
  const cache = await caches.open(CACHE);
  const stored = new Set((await cache.keys()).map((request) => request.url));
  const missing: string[] = [];
  for (const file of manifest.files) {
    if (stored.has(urlOf(file))) continue;
    // Lo ya guardado por el uso normal (al abrir un kanji) también cuenta.
    if (await caches.match(urlOf(file))) continue;
    missing.push(file);
  }
  return missing;
}

export async function offlineStatus(): Promise<OfflineStatus> {
  const none: OfflineStatus = { available: false, have: 0, total: 0, bytes: 0, missingBytes: 0 };
  if (typeof caches === 'undefined') return none;
  const manifest = await readManifest();
  if (!manifest) return none;
  const missing = await missingFiles(manifest);
  const total = manifest.files.length;
  const average = total > 0 ? manifest.bytes / total : 0;
  return {
    available: true,
    have: total - missing.length,
    total,
    bytes: manifest.bytes,
    missingBytes: Math.round(missing.length * average)
  };
}

/** Baja lo que falta. Devuelve cuántos archivos quedaron sin bajar (0 = todo listo). */
export async function downloadOffline(onProgress: (done: number, total: number) => void): Promise<number> {
  const manifest = await readManifest();
  if (!manifest || typeof caches === 'undefined') throw new Error('sin manifiesto');
  // Pide al navegador que no borre estos datos cuando falte espacio.
  void navigator.storage?.persist?.().catch(() => false);
  const cache = await caches.open(CACHE);
  const queue = await missingFiles(manifest);
  const total = queue.length;
  let done = 0;
  let failed = 0;
  onProgress(0, total);
  const worker = async () => {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      try {
        const response = await fetch(urlOf(file));
        if (response.ok) await cache.put(urlOf(file), response);
        else failed += 1;
      } catch {
        failed += 1;
      }
      done += 1;
      onProgress(done, total);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return failed;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
