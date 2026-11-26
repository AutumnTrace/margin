import { toast } from '../store'

/**
 * Registers sw.js (built by sw/plugin.ts) so Margin opens without a connection after the first
 * visit. Updates are offered, not forced: a new version waits until the user picks Reload.
 * `<html data-offline="ready">` is set once this build's files are cached.
 */
export function registerServiceWorker(base: string = import.meta.env.BASE_URL) {
  if (!('serviceWorker' in navigator)) return
  const sw = navigator.serviceWorker
  let reloadRequested = false

  // Hand over what the page has already fetched, so the first visit's fonts and chunks
  // (loaded before the worker took control) are kept too.
  const handOff = () => {
    const urls = performance.getEntriesByType('resource').map((e) => e.name)
    sw.controller?.postMessage({ type: 'cache', urls })
  }

  sw.addEventListener('message', (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === 'cached') document.documentElement.dataset.offline = 'ready'
  })
  sw.addEventListener('controllerchange', () => {
    if (reloadRequested) location.reload()
    else handOff() // the first install just claimed this page
  })

  const offer = (worker: ServiceWorker) =>
    toast('A new version of Margin is ready.', {
      label: 'Reload',
      run: () => {
        reloadRequested = true
        worker.postMessage({ type: 'skip-waiting' })
      },
    })

  sw.register(`${base}sw.js`, { scope: base })
    .then((registration) => {
      if (sw.controller) handOff()
      if (registration.waiting && sw.controller) offer(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && sw.controller) offer(worker)
        })
      })
    })
    .catch((e: unknown) => console.warn('Margin: offline support unavailable', e))
}
