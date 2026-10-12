// Offline support for the installed app. Pages are network-first so a new deploy is
// picked up on the next launch; everything else (hashed bundles, fonts, icons) is
// cache-first because it never changes under the same URL.
// ponytail: old hashed bundles stay cached until CACHE is bumped; prune by manifest if it grows.
const CACHE = 'unbuilt-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  const put = (res) => {
    if (res.ok) {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy))
    }
    return res
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req).then((r) => r ?? caches.match('./'))))
    return
  }
  e.respondWith(caches.match(req).then((hit) => hit ?? fetch(req).then(put)))
})
