import { expect, test, type Page } from '@playwright/test'

const preview = 'article.md'

/** "name: content" for every document in Margin's IndexedDB store. */
const storedDocs = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open('margin')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const all = open.result.transaction('docs').objectStore('docs').getAll()
          all.onerror = () => reject(all.error)
          all.onsuccess = () => {
            resolve((all.result as { name: string; content: string }[]).map((d) => `${d.name}: ${d.content}`))
            open.result.close()
          }
        }
      }),
  )

test('works offline after the first visit, including math and diagrams', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('welcome.md')
  // The welcome guide has a diagram and math, so Mermaid and the KaTeX fonts load on this visit.
  await expect(page.locator(`${preview} .mermaid svg`)).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'New document' }).click()
  await page.keyboard.type('# Field notes\n\nWritten on the train.')
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('field-notes.md')
  // Saving is debounced, so wait for the write itself rather than the status label.
  await expect.poll(() => storedDocs(page)).toContain('field-notes.md: # Field notes\n\nWritten on the train.')
  await expect(page.locator('html')).toHaveAttribute('data-offline', 'ready', { timeout: 15_000 })

  await context.setOffline(true)
  // Prove the page really has no network: a request the worker doesn't serve must fail.
  expect(await page.evaluate(() => fetch('./no-such-file').then(() => 'online', () => 'offline'))).toBe('offline')

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('field-notes.md')
  await expect(page.locator(`${preview} h1`)).toHaveText('Field notes')

  // An existing document with math and a diagram opens from the cache.
  await page.getByRole('list', { name: 'Documents' }).getByRole('button', { name: /^welcome\.md/ }).click()
  await expect(page.locator(`${preview} h1`)).toHaveText('Welcome to Margin')
  await expect(page.locator(`${preview} .katex`).first()).toBeVisible()
  await expect(page.locator(`${preview} .mermaid svg`)).toBeVisible({ timeout: 15_000 })

  // Those came from the cache rather than the network: Mermaid's code and KaTeX's fonts were
  // stored on first use, while diagram types this document never drew were not.
  const cached = await page.evaluate(async () => (await (await caches.open('margin-runtime')).keys()).map((r) => r.url))
  expect(cached.some((u) => /\/assets\/mermaid\.core-[\w-]+\.js$/.test(u))).toBe(true)
  expect(cached.some((u) => /\/assets\/KaTeX_Main-Regular-[\w-]+\.woff2$/.test(u))).toBe(true)
  expect(cached.some((u) => /\/assets\/sequenceDiagram-/.test(u))).toBe(false)
})

test('a diagram that could not load offline is drawn once the connection is back', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-offline', 'ready', { timeout: 15_000 })
  // As if no diagram had been drawn while online: drop every cached script outside the shell.
  await page.evaluate(async () => {
    const runtime = await caches.open('margin-runtime')
    for (const request of await runtime.keys()) if (request.url.endsWith('.js')) await runtime.delete(request)
  })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator(`${preview} h1`)).toHaveText('Welcome to Margin')
  await expect(page.locator(`${preview} .mermaid`)).toContainText('flowchart LR')
  await expect(page.locator(`${preview} .mermaid svg`)).toHaveCount(0)

  await context.setOffline(false)
  await page.getByRole('button', { name: 'New document' }).click()
  await page.keyboard.type('# Plan\n\n```mermaid\ngraph TD; Pack-->Leave\n```\n')
  await expect(page.locator(`${preview} .mermaid svg`)).toBeVisible({ timeout: 15_000 })
  expect(errors).toEqual([])
})
