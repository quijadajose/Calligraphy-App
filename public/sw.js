// Service worker de Calligraphy.
// - Precarga todo el build (lo inyecta vite.config.ts al compilar), así la app abre sin red.
// - La app y sus archivos: primero caché, y se actualiza en segundo plano.
// - Datos de trazo y fuentes de otros orígenes: primero caché; se guardan la primera vez.
// - «Descargar todo» (Ajustes) guarda el resto en OFFLINE, que sobrevive a las versiones.
const VERSION = 'calligraphy-v4';
const OFFLINE = 'calligraphy-offline';
const PRECACHE = /*__PRECACHE__*/[];
const STATIC = `${VERSION}-static`;
const RUNTIME = `${VERSION}-runtime`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.addAll(['./', ...PRECACHE]))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !key.startsWith(VERSION) && key !== OFFLINE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function isStrokeData(url) {
  return (
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.pathname.includes('/chardata/')
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const copy = response.clone();
    caches.open(RUNTIME).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(STATIC).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    // Sin red, una página que no está guardada abre la app; un archivo que falta, falla.
    .catch(() => cached ?? (request.mode === 'navigate' ? caches.match('./') : Response.error()));
  return cached ?? network;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isStrokeData(url)) {
    event.respondWith(cacheFirst(request).catch(() => caches.match(request)));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Recordatorio diario: la página pide mostrarlo cuando toca y la app no está abierta en primer plano.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'remind') {
    self.registration.showNotification('Calligraphy', {
      body: data.body || 'Hoy todavía no has practicado.',
      icon: 'icon.svg',
      tag: 'daily-reminder'
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const open = clients.find((client) => 'focus' in client);
      return open ? open.focus() : self.clients.openWindow('./');
    })
  );
});
