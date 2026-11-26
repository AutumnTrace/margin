// Renders the install icons in public/ from public/favicon.svg: `node scripts/icons.mjs`.
// The PNGs are committed; rerun this after changing the favicon.
import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

const pub = new URL('../public/', import.meta.url)
const svg = await readFile(new URL('favicon.svg', pub), 'utf8')
const browser = await chromium.launch()
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  await writeFile(new URL(`icon-${size}.png`, pub), await page.screenshot({ omitBackground: true }))
  await page.close()
}
await browser.close()
