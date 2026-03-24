const CACHE_NAME = 'hama-shinbun-v1'
const STATIC_ASSETS = [
  '/',
  '/pdf',
  '/circulation',
  '/events',
  '/surveys',
  '/feedback',
  '/notifications',
  '/manifest.json',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: data.isEmergency ? [200, 100, 200, 100, 200] : [100, 50, 100],
    data: { url: data.url || '/' },
    requireInteraction: !!data.isEmergency,
    tag: data.isEmergency ? 'emergency' : 'notification',
  }
  event.waitUntil(
    self.registration.showNotification(data.title || '浜区公式アプリ', options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})
