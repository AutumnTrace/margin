// @ts-check
/// <reference lib="webworker" />
// Margin's service worker. The build (sw/plugin.ts) replaces BUILD below with this build's
// version, its app shell and the list of every file it emitted.
//
// - The shell (index.html, the entry chunk and its static imports, CSS, icons) is cached on install.
// - Anything else this build emitted (Mermaid's diagram chunks, KaTeX and Plex fonts, language
//   packs) is cached the first time it is used, never up front: Mermaid alone is several MB.
// - A new version waits until the page asks it to take over, so an open document is never reloaded
//   from under the user.

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self))

/** @type {{ version: string, shell: string[], files: string[] }} */
const BUILD = { version: 'dev', shell: [], files: [] }

const SHELL = `margin-shell-${BUILD.version}`
const RUNTIME = 'margin-runtime'
const scope = new URL(sw.registration.scope)
/** @param {string} path */
const at = (path) => new URL(path, scope).href
const index = at('./')
const known = new Set([...BUILD.shell, ...BUILD.files].map(at))

sw.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(BUILD.shell.map(at))))
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('margin-shell-') && key !== SHELL) await caches.delete(key)
      }
      // Keep only files this build still references, so old versions' chunks don't pile up.
      const runtime = await caches.open(RUNTIME)
      for (const request of await runtime.keys()) {
        if (!known.has(request.url)) await runtime.delete(request)
      }
      await sw.clients.claim()
    })(),
  )
})

sw.addEventListener('message', (event) => {
  const data = event.data
  if (data?.type === 'skip-waiting') {
    void sw.skipWaiting()
  } else if (data?.type === 'cache' && Array.isArray(data.urls)) {
    // Files the page loaded before this worker controlled it (the first visit).
    event.waitUntil(remember(data.urls).then(() => event.source?.postMessage({ type: 'cached', version: BUILD.version })))
  }
})

/** @param {unknown[]} urls */
async function remember(urls) {
  const runtime = await caches.open(RUNTIME)
  const wanted = urls.filter((u) => typeof u === 'string').map((u) => strip(u)).filter((u) => known.has(u))
  await Promise.allSettled(
    wanted.map(async (u) => {
      if (!(await caches.match(u))) await runtime.add(u)
    }),
  )
}

/** @param {string} url */
function strip(url) {
  const u = new URL(url)
  u.search = ''
  u.hash = ''
  return u.href
}

sw.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = strip(request.url)

  if (request.mode === 'navigate') {
    const path = new URL(url).pathname
    if (path !== scope.pathname && path !== `${scope.pathname}index.html`) return
    event.respondWith(caches.match(index, { cacheName: SHELL }).then((hit) => hit ?? fetch(request)))
    return
  }

  if (!known.has(url)) return
  event.respondWith(
    (async () => {
      const hit = await caches.match(url)
      if (hit) return hit
      const response = await fetch(request)
      // Emitted files are content-hashed, so a copy never goes stale.
      if (response.ok) {
        const copy = response.clone()
        event.waitUntil(caches.open(RUNTIME).then((cache) => cache.put(url, copy)))
      }
      return response
    })(),
  )
})
