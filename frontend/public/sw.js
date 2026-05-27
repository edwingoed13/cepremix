/* Service worker propio (sin plugin, robusto ante la versión de Vite).
   - App shell + assets + miniaturas: stale-while-revalidate.
   - Audio / API / WebSocket: NUNCA se cachean (streams y datos dinámicos).
   - Navegación: network-first con fallback a la shell cacheada (offline). */
const CACHE = 'sonata-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/')).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // No cachear streams de audio, API ni websockets
  if (
    url.pathname.startsWith('/audio') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/stream') ||
    url.pathname.startsWith('/ws')
  ) {
    return
  }

  // Navegación: red primero, con fallback a la shell cacheada (modo offline)
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')))
    return
  }

  // Assets propios + miniaturas de YouTube: stale-while-revalidate
  if (url.origin === self.location.origin || url.hostname === 'i.ytimg.com') {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && res.ok) cache.put(req, res.clone())
              return res
            })
            .catch(() => cached)
          return cached || network
        }),
      ),
    )
  }
})
