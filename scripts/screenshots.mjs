// Regenerates docs/screenshots from the built app: `npm run build && npm run preview` first,
// then `node scripts/screenshots.mjs [baseUrl]`.
import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const base = process.argv[2] ?? 'http://localhost:4173/'
const out = new URL('../docs/screenshots/', import.meta.url)
await mkdir(out, { recursive: true })
const file = (name) => new URL(name, out).pathname.replace(/^\/([A-Z]:)/, '$1')

const browser = await chromium.launch()

async function shoot(name, { theme = 'dark', colorScheme = 'dark', viewport = { width: 1440, height: 900 }, prepare, device } = {}) {
  const context = await browser.newContext(device ? { ...device, colorScheme } : { viewport, deviceScaleFactor: 2, colorScheme })
  const page = await context.newPage()
  await page.addInitScript((t) => localStorage.setItem('margin:prefs', JSON.stringify({ theme: t })), theme)
  await page.goto(base)
  await page.locator('.mermaid svg').first().waitFor({ timeout: 15_000 }).catch(() => {})
  if (prepare) await prepare(page)
  await page.waitForTimeout(400)
  await page.screenshot({ path: file(`${name}.png`) })
  await context.close()
}

const scrollPreviewTo = (selector) => async (page) => {
  await page.evaluate((sel) => {
    const target = document.querySelector(`article.md ${sel}`)
    const scroller = document.querySelector('article.md').parentElement
    scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24
  }, selector)
}

await shoot('split-dark')
await shoot('split-light', { theme: 'light', colorScheme: 'light' })
await shoot('diagrams-dark', { prepare: scrollPreviewTo('h2#math') })
await shoot('palette-dark', {
  prepare: async (page) => {
    await page.keyboard.press('Control+k')
    await page.keyboard.type('exp')
  },
})
await shoot('read-serif-light', {
  theme: 'light',
  colorScheme: 'light',
  prepare: async (page) => {
    await page.getByRole('radio', { name: 'Read' }).first().click()
    await page.getByRole('radio', { name: 'Serif' }).click()
  },
})
await shoot('mobile-dark', { device: devices['Pixel 7'] })

await browser.close()
console.log('Saved to', file(''))
