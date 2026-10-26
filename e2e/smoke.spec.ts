import { expect, test } from '@playwright/test'

test('mobile: write and read tabs, library drawer', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Editor' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Preview' })).toBeHidden()

  await page.getByRole('radio', { name: 'Read' }).click()
  await expect(page.locator('article.md h1')).toHaveText('Welcome to Margin')

  await page.getByRole('button', { name: 'Toggle library' }).click()
  await expect(page.getByRole('list', { name: 'Documents' })).toBeVisible()
  await page.getByRole('button', { name: /^welcome\.md/ }).click()
  await expect(page.getByRole('list', { name: 'Documents' })).toBeHidden()
})
