import { expect, test, type Page } from '@playwright/test'

const editor = (page: Page) => page.locator('.cm-content')
const preview = (page: Page) => page.locator('article.md')

async function newDoc(page: Page) {
  await page.getByRole('button', { name: 'New document' }).click()
  await expect(editor(page)).toBeFocused()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('welcome.md')
})

test('renders the welcome guide: front matter, math, table, code and a diagram', async ({ page }) => {
  const doc = preview(page)
  await expect(doc.locator('.front-matter')).toContainText('Welcome to Margin')
  await expect(doc.locator('h1')).toHaveText('Welcome to Margin')
  await expect(doc.locator('.katex').first()).toBeVisible()
  await expect(doc.locator('table')).toContainText('Command palette')
  await expect(doc.locator('figure.code')).toContainText('wordCount')
  await expect(doc.locator('.mermaid svg')).toBeVisible({ timeout: 15_000 })
  await expect(doc.locator('.markdown-alert-tip')).toBeVisible()
})

test('typing updates the preview and survives a reload', async ({ page }) => {
  await newDoc(page)
  await page.keyboard.type('# Trip notes\n\nPack the **tent**.')
  await expect(preview(page).locator('h1')).toHaveText('Trip notes')
  await expect(preview(page).locator('strong')).toHaveText('tent')
  await expect(page.getByRole('status').filter({ hasText: /Saved/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('trip-notes.md')
  await expect(preview(page).locator('h1')).toHaveText('Trip notes')
  await expect(page.getByRole('list', { name: 'Documents' }).getByRole('listitem')).toHaveCount(2)
})

test('formatting shortcuts and toolbar wrap the selection', async ({ page }) => {
  await newDoc(page)
  await page.keyboard.type('important')
  await page.keyboard.press('Shift+Home')
  await page.keyboard.press('ControlOrMeta+b')
  await expect(editor(page)).toHaveText('**important**')
  await page.getByRole('button', { name: 'Task list' }).click()
  await expect(editor(page)).toHaveText('- [ ] **important**')
  await expect(preview(page).locator('.task-list-item-checkbox')).toBeVisible()
})

test('ticking a checkbox in the preview edits the source', async ({ page }) => {
  await newDoc(page)
  await page.keyboard.type('- [ ] write tests\n')
  await preview(page).locator('.task-list-item-checkbox').first().click()
  await expect(editor(page)).toContainText('- [x] write tests')
})

test('command palette runs actions and jumps between documents', async ({ page }) => {
  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await expect(palette).toBeVisible()
  await page.keyboard.type('new doc')
  await page.keyboard.press('Enter')
  await expect(palette).toBeHidden()
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('untitled.md')

  await page.keyboard.press('ControlOrMeta+k')
  await page.keyboard.type('welcome')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('welcome.md')
})

test('a share link carries the document and opens it', async ({ page, context, baseURL }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL })
  await newDoc(page)
  await page.keyboard.type('# Shared\n\nSent by link.')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByText('Share link copied')).toBeVisible()
  const url = await page.evaluate(() => navigator.clipboard.readText())
  expect(url).toContain('#share=')

  const other = await context.browser()!.newPage()
  await other.goto(url)
  await expect(other.locator('article.md h1')).toHaveText('Shared')
  await expect(other.getByText(/Opened shared document/)).toBeVisible()
  await expect(other).not.toHaveURL(/#share=/)
  await other.close()
})

test('renaming, downloading and deleting with undo', async ({ page }) => {
  const name = page.getByRole('textbox', { name: 'Document name' })
  await name.fill('guide')
  await name.press('Enter')
  await expect(name).toHaveValue('guide.md')

  await page.getByRole('button', { name: 'Open, save and export' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Download .md' }).click()
  expect((await download).suggestedFilename()).toBe('guide.md')

  await page.getByRole('button', { name: 'Delete guide.md' }).click({ force: true })
  await expect(page.getByText('Deleted guide.md')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(name).toHaveValue('guide.md')
})

test('raw HTML in a document cannot run scripts', async ({ page }) => {
  let dialog = false
  page.on('dialog', (d) => {
    dialog = true
    void d.dismiss()
  })
  await newDoc(page)
  await page.keyboard.type('<img src=x onerror="alert(1)"> <a href="javascript:alert(2)">x</a>')
  await expect(preview(page).locator('img')).toHaveCount(1)
  await preview(page).locator('a').click()
  expect(dialog).toBe(false)
  await expect(preview(page).locator('img')).not.toHaveAttribute('onerror')
})

test('view modes and focus mode', async ({ page }) => {
  await page.getByRole('radio', { name: 'Read' }).first().click()
  await expect(page.getByRole('region', { name: 'Editor' })).toBeHidden()
  await page.keyboard.press('Alt+1')
  await expect(page.getByRole('region', { name: 'Preview' })).toBeHidden()
  await page.keyboard.press('Alt+2')
  await expect(page.getByRole('region', { name: 'Preview' })).toBeVisible()

  await page.keyboard.press('ControlOrMeta+.')
  await expect(page.getByRole('banner')).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('banner')).toBeVisible()
})
